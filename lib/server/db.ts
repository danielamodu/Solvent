import "server-only";
import { getStore } from "./store";
import { pgAll, pgConfigured, pgGet, pgRun } from "./pgstore";

/**
 * Unified storage for the web tier.
 *
 * - When SOLVENT_DATABASE_URL is set, Postgres is authoritative (shared across
 *   replicas; the indexer must use the same URL so it writes where the app
 *   reads). A Postgres error degrades to the offline defaults.
 * - Otherwise the local SQLite store is used (single-host), and when that is
 *   unavailable (e.g. serverless read-only FS) callers get `null` and serve
 *   empty defaults instead of crashing.
 */

const num = (v: unknown): number => (typeof v === "number" ? v : Number(v));

export async function listActivity(vault: string): Promise<Array<Record<string, unknown>> | null> {
  const sql = `
    SELECT id, block_number AS blockNumber, timestamp, event_type AS eventType,
           amount, detail, transaction_hash AS transactionHash
    FROM activity WHERE vault = ? ORDER BY block_number DESC, log_index DESC LIMIT 50`;
  if (pgConfigured()) {
    try {
      const rows = await pgAll<Record<string, unknown>>(sql, [vault]);
      return rows.map((r) => ({ ...r, blockNumber: num(r.blockNumber), timestamp: num(r.timestamp) }));
    } catch (e) {
      console.error(`listActivity (postgres) failed: ${(e as Error).message}`);
      return null;
    }
  }
  const store = getStore();
  if (!store) return null;
  return store.prepare(sql).all(vault) as Array<Record<string, unknown>>;
}

export async function listAlerts(vault: string): Promise<Array<Record<string, unknown>> | null> {
  const sql = `
    SELECT id, type, obligation_id AS obligationId, amount, due_at AS dueAt,
           message, created_at AS createdAt, updated_at AS updatedAt
    FROM alerts WHERE vault = ? AND resolved = 0 ORDER BY updated_at DESC`;
  if (pgConfigured()) {
    try {
      const rows = await pgAll<Record<string, unknown>>(sql, [vault]);
      return rows.map((r) => ({ ...r, dueAt: r.dueAt == null ? null : num(r.dueAt), createdAt: num(r.createdAt), updatedAt: num(r.updatedAt) }));
    } catch (e) {
      console.error(`listAlerts (postgres) failed: ${(e as Error).message}`);
      return null;
    }
  }
  const store = getStore();
  if (!store) return null;
  return store.prepare(sql).all(vault) as Array<Record<string, unknown>>;
}

export type KeeperStatus = {
  lastHeartbeat: number;
  state: string;
  lastAction: string | null;
  lastTx: string | null;
  lastError: string | null;
};

export async function getKeeperStatus(vault: string): Promise<KeeperStatus | null> {
  const sql = `SELECT last_heartbeat AS lastHeartbeat, state, last_action AS lastAction,
    last_tx AS lastTx, last_error AS lastError FROM keeper_status WHERE vault = ?`;
  if (pgConfigured()) {
    try {
      const row = await pgGet<KeeperStatus>(sql, [vault]);
      if (!row) return null;
      return { ...row, lastHeartbeat: num(row.lastHeartbeat) };
    } catch (e) {
      console.error(`getKeeperStatus (postgres) failed: ${(e as Error).message}`);
      return null;
    }
  }
  const store = getStore();
  if (!store) return null;
  const row = store.prepare(sql).get(vault) as KeeperStatus | undefined;
  return row ?? null;
}

export async function saveHeartbeat(input: {
  vault: string;
  state: string;
  lastAction: string | null;
  lastTx: string | null;
  lastError: string | null;
}): Promise<boolean> {
  const sql = `
    INSERT INTO keeper_status(vault,last_heartbeat,state,last_action,last_tx,last_error)
    VALUES(?,?,?,?,?,?)
    ON CONFLICT(vault) DO UPDATE SET last_heartbeat=excluded.last_heartbeat,
      state=excluded.state,last_action=excluded.last_action,last_tx=excluded.last_tx,last_error=excluded.last_error`;
  const params = [input.vault, Date.now(), input.state, input.lastAction, input.lastTx, input.lastError];
  if (pgConfigured()) {
    try {
      await pgRun(sql, params);
      return true;
    } catch (e) {
      console.error(`saveHeartbeat (postgres) failed: ${(e as Error).message}`);
      return false;
    }
  }
  const store = getStore();
  if (!store) return false;
  store.prepare(sql).run(...params);
  return true;
}
