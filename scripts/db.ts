/**
 * Shared database adapter for the indexer (and any Node script).
 *
 * - Default: local SQLite via `node:sqlite` at SOLVENT_DATABASE_PATH
 *   (single-host, single-writer — the indexer owns its checkpoint cursor).
 * - When SOLVENT_DATABASE_URL is set: Postgres via `pg` Pool, so the hosted
 *   web tier and the indexer can share one database across replicas.
 *
 * Callers always use `?` placeholders; the Postgres backend rewrites them to
 * $1..$n. The two statements with no portable spelling (SQLite's
 * INSERT OR REPLACE / OR IGNORE) live behind dedicated methods.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import type { Pool } from "pg";

export type IndexerDb = {
  /** True when backed by Postgres. */
  readonly pg: boolean;
  all(sql: string, params?: unknown[]): Promise<Array<Record<string, unknown>>>;
  get(sql: string, params?: unknown[]): Promise<Record<string, unknown> | undefined>;
  run(sql: string, params?: unknown[]): Promise<void>;
  upsertTreasury(vault: string, registry: string, strategy: string, asset: string, owner: string, createdBlock: number): Promise<void>;
  insertActivity(id: string, vault: string, block: number, logIndex: number, timestamp: number, type: string, amount: string | null, detail: string, tx: string): Promise<void>;
  close(): Promise<void>;
};

const SQLITE_SCHEMA = `
  PRAGMA journal_mode = WAL;
  PRAGMA busy_timeout = 5000;
  CREATE TABLE IF NOT EXISTS treasuries(vault TEXT PRIMARY KEY, registry TEXT NOT NULL, strategy TEXT NOT NULL, asset TEXT NOT NULL, owner TEXT NOT NULL, created_block INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS activity(id TEXT PRIMARY KEY, vault TEXT NOT NULL, block_number INTEGER NOT NULL, log_index INTEGER NOT NULL, timestamp INTEGER NOT NULL, event_type TEXT NOT NULL, amount TEXT, detail TEXT NOT NULL, transaction_hash TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS activity_vault_order ON activity(vault, block_number DESC, log_index DESC);
  CREATE TABLE IF NOT EXISTS alerts(id TEXT PRIMARY KEY, vault TEXT NOT NULL, type TEXT NOT NULL, obligation_id TEXT, amount TEXT, due_at INTEGER, message TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, resolved INTEGER NOT NULL DEFAULT 0, notified_at INTEGER);
  CREATE INDEX IF NOT EXISTS alerts_vault_open ON alerts(vault,resolved,updated_at DESC);
  CREATE TABLE IF NOT EXISTS keeper_status(vault TEXT PRIMARY KEY, last_heartbeat INTEGER NOT NULL, state TEXT NOT NULL, last_action TEXT, last_tx TEXT, last_error TEXT);
  CREATE TABLE IF NOT EXISTS checkpoints(contract TEXT PRIMARY KEY, block_number INTEGER NOT NULL);
`;

const PG_SCHEMA = `
  CREATE TABLE IF NOT EXISTS treasuries(vault TEXT PRIMARY KEY, registry TEXT NOT NULL, strategy TEXT NOT NULL, asset TEXT NOT NULL, owner TEXT NOT NULL, created_block BIGINT NOT NULL);
  CREATE TABLE IF NOT EXISTS activity(id TEXT PRIMARY KEY, vault TEXT NOT NULL, block_number BIGINT NOT NULL, log_index INTEGER NOT NULL, timestamp BIGINT NOT NULL, event_type TEXT NOT NULL, amount TEXT, detail TEXT NOT NULL, transaction_hash TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS activity_vault_order ON activity(vault, block_number DESC, log_index DESC);
  CREATE TABLE IF NOT EXISTS alerts(id TEXT PRIMARY KEY, vault TEXT NOT NULL, type TEXT NOT NULL, obligation_id TEXT, amount TEXT, due_at BIGINT, message TEXT NOT NULL, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, resolved INTEGER NOT NULL DEFAULT 0, notified_at BIGINT);
  CREATE INDEX IF NOT EXISTS alerts_vault_open ON alerts(vault,resolved,updated_at DESC);
  CREATE TABLE IF NOT EXISTS keeper_status(vault TEXT PRIMARY KEY, last_heartbeat BIGINT NOT NULL, state TEXT NOT NULL, last_action TEXT, last_tx TEXT, last_error TEXT);
  CREATE TABLE IF NOT EXISTS checkpoints(contract TEXT PRIMARY KEY, block_number BIGINT NOT NULL);
`;

function toPg(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

class SqliteDb implements IndexerDb {
  readonly pg = false;
  private handle: DatabaseSync;
  constructor(handle: DatabaseSync) {
    this.handle = handle;
  }
  async all(sql: string, params: unknown[] = []) {
    return this.handle.prepare(sql).all(...params) as Array<Record<string, unknown>>;
  }
  async get(sql: string, params: unknown[] = []) {
    return this.handle.prepare(sql).get(...params) as Record<string, unknown> | undefined;
  }
  async run(sql: string, params: unknown[] = []) {
    this.handle.prepare(sql).run(...params);
  }
  async upsertTreasury(vault: string, registry: string, strategy: string, asset: string, owner: string, createdBlock: number) {
    this.handle.prepare(`INSERT OR REPLACE INTO treasuries(vault,registry,strategy,asset,owner,created_block) VALUES(?,?,?,?,?,?)`)
      .run(vault, registry, strategy, asset, owner, createdBlock);
  }
  async insertActivity(id: string, vault: string, block: number, logIndex: number, timestamp: number, type: string, amount: string | null, detail: string, tx: string) {
    this.handle.prepare(`INSERT OR IGNORE INTO activity(id,vault,block_number,log_index,timestamp,event_type,amount,detail,transaction_hash) VALUES(?,?,?,?,?,?,?,?,?)`)
      .run(id, vault, block, logIndex, timestamp, type, amount, detail, tx);
  }
  async close() {
    this.handle.close();
  }
}

class PgDb implements IndexerDb {
  readonly pg = true;
  private pool: Pool;
  constructor(pool: Pool) {
    this.pool = pool;
  }
  async all(sql: string, params: unknown[] = []) {
    const res = await this.pool.query(toPg(sql), params);
    return res.rows as Array<Record<string, unknown>>;
  }
  async get(sql: string, params: unknown[] = []) {
    const res = await this.pool.query(toPg(sql), params);
    return (res.rows[0] ?? undefined) as Record<string, unknown> | undefined;
  }
  async run(sql: string, params: unknown[] = []) {
    await this.pool.query(toPg(sql), params);
  }
  async upsertTreasury(vault: string, registry: string, strategy: string, asset: string, owner: string, createdBlock: number) {
    await this.pool.query(
      `INSERT INTO treasuries(vault,registry,strategy,asset,owner,created_block) VALUES($1,$2,$3,$4,$5,$6)
       ON CONFLICT(vault) DO UPDATE SET registry=excluded.registry,strategy=excluded.strategy,asset=excluded.asset,owner=excluded.owner,created_block=excluded.created_block`,
      [vault, registry, strategy, asset, owner, createdBlock]
    );
  }
  async insertActivity(id: string, vault: string, block: number, logIndex: number, timestamp: number, type: string, amount: string | null, detail: string, tx: string) {
    await this.pool.query(
      `INSERT INTO activity(id,vault,block_number,log_index,timestamp,event_type,amount,detail,transaction_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(id) DO NOTHING`,
      [id, vault, block, logIndex, timestamp, type, amount, detail, tx]
    );
  }
  async close() {
    await this.pool.end();
  }
}

export async function openDb(): Promise<{ db: IndexerDb; describe: string }> {
  const url = process.env.SOLVENT_DATABASE_URL?.trim();
  if (url) {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: url, max: 5 });
    await pool.query(PG_SCHEMA);
    return { db: new PgDb(pool), describe: "postgres" };
  }
  const { DatabaseSync } = await import("node:sqlite");
  const dbPath = path.resolve(process.env.SOLVENT_DATABASE_PATH ?? ".data/solvent.sqlite");
  mkdirSync(path.dirname(dbPath), { recursive: true });
  const handle = new DatabaseSync(dbPath);
  handle.exec(SQLITE_SCHEMA);
  return { db: new SqliteDb(handle), describe: `sqlite:${dbPath}` };
}
