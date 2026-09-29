import "server-only";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

let db: DatabaseSync | undefined;

export function getStore(): DatabaseSync {
  if (db) return db;
  const configuredPath = process.env.SOLVENT_DATABASE_PATH;
  const filename = configuredPath
    ? path.resolve(configuredPath)
    : path.join(process.cwd(), ".data", "solvent.sqlite");
  mkdirSync(path.dirname(filename), { recursive: true });
  db = new DatabaseSync(filename);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS treasuries (
      vault TEXT PRIMARY KEY,
      registry TEXT NOT NULL,
      strategy TEXT NOT NULL,
      asset TEXT NOT NULL,
      owner TEXT NOT NULL,
      created_block INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS activity (
      id TEXT PRIMARY KEY,
      vault TEXT NOT NULL,
      block_number INTEGER NOT NULL,
      log_index INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      amount TEXT,
      detail TEXT NOT NULL,
      transaction_hash TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS activity_vault_order ON activity(vault, block_number DESC, log_index DESC);
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      vault TEXT NOT NULL,
      type TEXT NOT NULL,
      obligation_id TEXT,
      amount TEXT,
      due_at INTEGER,
      message TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      resolved INTEGER NOT NULL DEFAULT 0,
      notified_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS alerts_vault_open ON alerts(vault, resolved, updated_at DESC);
    CREATE TABLE IF NOT EXISTS keeper_status (
      vault TEXT PRIMARY KEY,
      last_heartbeat INTEGER NOT NULL,
      state TEXT NOT NULL,
      last_action TEXT,
      last_tx TEXT,
      last_error TEXT
    );
    CREATE TABLE IF NOT EXISTS checkpoints (
      contract TEXT PRIMARY KEY,
      block_number INTEGER NOT NULL
    );
  `);
  return db;
}
