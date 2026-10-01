import "server-only";
import { Pool } from "pg";

/**
 * Lazy Postgres pool for the hosted web tier. Used only when
 * SOLVENT_DATABASE_URL is set; otherwise callers fall back to SQLite.
 * A failed connection is cached briefly so a down database degrades to the
 * offline defaults instead of stalling every request.
 */

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

let pool: Pool | null = null;
let lastFailureAt = 0;
let schemaReady = false;

export function pgConfigured(): boolean {
  return Boolean(process.env.SOLVENT_DATABASE_URL?.trim());
}

async function getPool(): Promise<Pool> {
  if (pool) return pool;
  if (Date.now() - lastFailureAt < 30_000) throw new Error("postgres recently unreachable");
  const url = process.env.SOLVENT_DATABASE_URL?.trim();
  if (!url) throw new Error("SOLVENT_DATABASE_URL is not set");
  try {
    const candidate = new Pool({ connectionString: url, max: 5 });
    await candidate.query("SELECT 1");
    pool = candidate;
    return pool;
  } catch (e) {
    lastFailureAt = Date.now();
    throw e;
  }
}

async function ensureSchema(p: Pool): Promise<void> {
  if (schemaReady) return;
  await p.query(PG_SCHEMA);
  schemaReady = true;
}

export async function pgAll<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const p = await getPool();
  await ensureSchema(p);
  const res = await p.query(toPg(sql), params);
  return res.rows as T[];
}

export async function pgGet<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  const rows = await pgAll<T>(sql, params);
  return rows[0];
}

export async function pgRun(sql: string, params: unknown[] = []): Promise<void> {
  const p = await getPool();
  await ensureSchema(p);
  await p.query(toPg(sql), params);
}
