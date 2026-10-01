import "server-only";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";

/**
 * SQLite-backed store for indexed activity, persisted alerts, and keeper
 * heartbeats. `node:sqlite` is an experimental Node built-in (Node >=22.13 with
 * `--experimental-sqlite`, or Node >=24 unflagged). On hosts that don't expose
 * it — notably Vercel's serverless runtime — `getStore()` returns `null` and
 * every consumer degrades gracefully instead of crashing the build or request.
 */

let db: DatabaseSync | null | undefined;

/** Load the experimental `node:sqlite` constructor, or null if unavailable. */
function loadDatabaseSync(): (new (filename: string) => DatabaseSync) | null {
  try {
    // Runtime require (not a static import) so the bundler/build never eagerly
    // evaluates node:sqlite on runtimes that lack it.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("node:sqlite") as typeof import("node:sqlite");
    return mod.DatabaseSync;
  } catch {
    return null;
  }
}

/**
 * Returns the shared DB handle, or `null` when SQLite is unavailable (e.g. on a
 * serverless runtime without `node:sqlite`, or a read-only filesystem). Callers
 * must treat `null` as "storage offline" and return empty results.
 */
export function getStore(): DatabaseSync | null {
  if (db !== undefined) return db;

  const DatabaseSyncCtor = loadDatabaseSync();
  if (!DatabaseSyncCtor) {
    db = null;
    return db;
  }

  try {
    const configuredPath = process.env.SOLVENT_DATABASE_PATH;
    const filename = configuredPath
      ? path.resolve(configuredPath)
      : path.join(process.cwd(), ".data", "solvent.sqlite");
    mkdirSync(path.dirname(filename), { recursive: true });
    const handle = new DatabaseSyncCtor(filename);
    handle.exec(`
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
    db = handle;
  } catch {
    // Filesystem read-only, locked, or otherwise unusable — treat as offline.
    db = null;
  }
  return db;
}
