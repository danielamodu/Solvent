import { config as loadEnv } from "dotenv";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { createPublicClient, http, getAddress, formatUnits, type Address } from "viem";
import { arbitrumSepolia } from "viem/chains";

const treasuryFactoryAbi = [{ type: "event", name: "TreasuryCreated", anonymous: false, inputs: [
  { name: "owner", type: "address", indexed: true }, { name: "vault", type: "address", indexed: true },
  { name: "registry", type: "address", indexed: true }, { name: "strategy", type: "address", indexed: false },
  { name: "asset", type: "address", indexed: false }, { name: "reserveRequirement", type: "uint256", indexed: false },
] }] as const;
const treasuryVaultAbi = [
  { type: "event", name: "Deposited", anonymous: false, inputs: [{ name: "depositor", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }] },
  { type: "event", name: "Withdrawn", anonymous: false, inputs: [{ name: "recipient", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }] },
  { type: "event", name: "StrategyDeployed", anonymous: false, inputs: [{ name: "strategy", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }] },
  { type: "event", name: "StrategyRecalled", anonymous: false, inputs: [{ name: "strategy", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }] },
] as const;
const OBLIGATION_REGISTRY_ABI = [
  { type: "event", name: "ObligationCreated", anonymous: false, inputs: [{ name: "id", type: "bytes32", indexed: true }, { name: "beneficiary", type: "address", indexed: false }, { name: "amount", type: "uint256", indexed: false }, { name: "dueAt", type: "uint256", indexed: false }] },
  { type: "event", name: "ObligationCancelled", anonymous: false, inputs: [{ name: "id", type: "bytes32", indexed: true }] },
  { type: "event", name: "ObligationSettled", anonymous: false, inputs: [{ name: "id", type: "bytes32", indexed: true }] },
  { type: "function", name: "obligations", stateMutability: "view", inputs: [{ name: "id", type: "bytes32" }], outputs: [{ name: "id", type: "bytes32" }, { name: "beneficiary", type: "address" }, { name: "amount", type: "uint256" }, { name: "dueAt", type: "uint256" }, { name: "priority", type: "uint8" }, { name: "status", type: "uint8" }] },
] as const;

loadEnv();
const rpc = process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC;
if (!rpc) throw new Error("Set NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC before running the indexer.");
const client = createPublicClient({ chain: arbitrumSepolia, transport: http(rpc) });
const dbPath = path.resolve(process.env.SOLVENT_DATABASE_PATH ?? ".data/solvent.sqlite");
mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);
db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS treasuries(vault TEXT PRIMARY KEY, registry TEXT NOT NULL, strategy TEXT NOT NULL, asset TEXT NOT NULL, owner TEXT NOT NULL, created_block INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS activity(id TEXT PRIMARY KEY, vault TEXT NOT NULL, block_number INTEGER NOT NULL, log_index INTEGER NOT NULL, timestamp INTEGER NOT NULL, event_type TEXT NOT NULL, amount TEXT, detail TEXT NOT NULL, transaction_hash TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS activity_vault_order ON activity(vault, block_number DESC, log_index DESC);
CREATE TABLE IF NOT EXISTS alerts(id TEXT PRIMARY KEY, vault TEXT NOT NULL, type TEXT NOT NULL, obligation_id TEXT, amount TEXT, due_at INTEGER, message TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, resolved INTEGER NOT NULL DEFAULT 0, notified_at INTEGER);
CREATE INDEX IF NOT EXISTS alerts_vault_open ON alerts(vault,resolved,updated_at DESC);
CREATE TABLE IF NOT EXISTS checkpoints(contract TEXT PRIMARY KEY,block_number INTEGER NOT NULL);`);

type Treasury = { vault: Address; registry: Address; strategy: Address; asset: Address; owner: Address; createdBlock: number | bigint };
const factory = process.env.NEXT_PUBLIC_TREASURY_FACTORY_ADDRESS;
const startBlock = BigInt(process.env.NEXT_PUBLIC_TREASURY_FACTORY_DEPLOY_BLOCK ?? "0");
const insertTreasury = db.prepare(`INSERT OR REPLACE INTO treasuries(vault,registry,strategy,asset,owner,created_block) VALUES(?,?,?,?,?,?)`);
const knownTreasuries = (): Treasury[] => db.prepare("SELECT vault,registry,strategy,asset,owner,created_block AS createdBlock FROM treasuries").all() as Treasury[];
const eventCheckpointStmt = db.prepare("SELECT block_number AS block FROM checkpoints WHERE contract=?");
const eventCheckpoint = (contract: string): { block: number } | undefined => eventCheckpointStmt.get(contract) as { block: number } | undefined;
const setCheckpoint = db.prepare("INSERT INTO checkpoints(contract,block_number) VALUES(?,?) ON CONFLICT(contract) DO UPDATE SET block_number=excluded.block_number");
const insertActivity = db.prepare(`INSERT OR IGNORE INTO activity(id,vault,block_number,log_index,timestamp,event_type,amount,detail,transaction_hash) VALUES(?,?,?,?,?,?,?,?,?)`);

async function loadFactoryTreasuries(latest: bigint) {
  const existing = new Set(knownTreasuries().map(t => t.vault.toLowerCase()));
  const cursor = eventCheckpoint(factory!.toLowerCase())?.block;
  const fromBlock = cursor === undefined ? startBlock : BigInt(cursor + 1);
  if (fromBlock > latest) return;
  const events = await client.getContractEvents({ address: getAddress(factory!), abi: treasuryFactoryAbi, eventName: "TreasuryCreated", fromBlock, toBlock: latest });
  for (const e of events) {
    const { vault, registry, strategy, asset, owner } = e.args;
    if (!vault || !registry || !strategy || !asset || !owner) continue;
    insertTreasury.run(vault.toLowerCase(), registry.toLowerCase(), strategy.toLowerCase(), asset.toLowerCase(), owner.toLowerCase(), Number(e.blockNumber));
    existing.add(vault.toLowerCase());
  }
  setCheckpoint.run(factory!.toLowerCase(), Number(latest));
}

async function addLog(t: Treasury, log: { blockNumber: bigint | null; logIndex: number | null; transactionHash: `0x${string}` | null; eventName: string; args: Record<string, unknown> }, type: string, timestamp: number, decimals: number) {
  const args = log.args;
  const amountRaw = typeof args.amount === "bigint" ? args.amount : undefined;
  let detail = type;
  if (type === "Deposit") detail = `Deposit · ${formatUnits(amountRaw ?? 0n, decimals)} USDC from ${String(args.depositor)}`;
  if (type === "Withdrawal") detail = `Withdrawal · ${formatUnits(amountRaw ?? 0n, decimals)} USDC to ${String(args.recipient)}`;
  if (type === "StrategyDeployed" || type === "StrategyRecalled") detail = `${type === "StrategyDeployed" ? "Strategy deployment" : "Strategy recall"} · ${formatUnits(amountRaw ?? 0n, decimals)} USDC`;
  if (type === "ObligationCreated") detail = `Obligation recorded · ${formatUnits(amountRaw ?? 0n, decimals)} USDC for ${String(args.beneficiary)}`;
  if (type === "ObligationCancelled") detail = `Obligation cancelled · ${String(args.id).slice(0, 10)}…`;
  if (type === "ObligationSettled") detail = `Obligation paid · ${String(args.id).slice(0, 10)}…`;
  const block = log.blockNumber ?? 0n;
  const logIndex = log.logIndex ?? 0;
  const tx = log.transactionHash ?? "0x";
  insertActivity.run(`${tx}-${logIndex}`, t.vault.toLowerCase(), Number(block), logIndex, timestamp, type, amountRaw?.toString() ?? null, detail.slice(0, 300), tx);
}

async function syncEvents(t: Treasury, latest: bigint) {
  const [decimals, assetCode] = await Promise.all([
    client.readContract({ address: t.asset, abi: [{ type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] }], functionName: "decimals" }),
    client.getCode({ address: t.vault }),
  ]);
  if (!assetCode) return;
  for (const [address, abi, names] of [
    [t.vault, treasuryVaultAbi, ["Deposited", "Withdrawn", "StrategyDeployed", "StrategyRecalled"]],
    [t.registry, OBLIGATION_REGISTRY_ABI, ["ObligationCreated", "ObligationCancelled", "ObligationSettled"]],
  ] as const) {
    const key = address.toLowerCase();
    const saved = eventCheckpoint(key)?.block;
    const start = saved === undefined ? BigInt(t.createdBlock) : BigInt(saved + 1);
    if (start > latest) continue;
    for (let offset = start; offset <= latest; offset += 2_000n) {
      const end = offset + 1_999n < latest ? offset + 1_999n : latest;
      for (const name of names) {
        const logs = await client.getContractEvents({ address, abi, eventName: name as never, fromBlock: offset, toBlock: end } as never) as Array<{ blockNumber: bigint | null; logIndex: number | null; transactionHash: `0x${string}` | null; eventName: string; args: Record<string, unknown> }>;
        for (const log of logs) {
          const b = log.blockNumber ?? 0n;
          const block = await client.getBlock({ blockNumber: b });
          await addLog(t, log, log.eventName, Number(block.timestamp), Number(decimals));
        }
      }
      setCheckpoint.run(key, Number(end));
    }
  }
}

async function syncAlerts(t: Treasury, latest: bigint) {
  const key = `${t.registry.toLowerCase()}:alerts`;
  const saved = eventCheckpoint(key)?.block;
  const start = saved === undefined ? BigInt(t.createdBlock) : BigInt(saved + 1);
  const logs = start <= latest ? await client.getContractEvents({ address: t.registry, abi: OBLIGATION_REGISTRY_ABI, eventName: "ObligationCreated", fromBlock: start, toBlock: latest }) : [];
  const now = Math.floor(Date.now() / 1000);
  const insertAlert = db.prepare(`INSERT INTO alerts(id,vault,type,obligation_id,amount,due_at,message,created_at,updated_at,resolved)
    VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET amount=excluded.amount,due_at=excluded.due_at,message=excluded.message,updated_at=excluded.updated_at,resolved=excluded.resolved`);
  for (const event of logs) {
    const id = event.args.id;
    if (!id) continue;
    const item = await client.readContract({ address: t.registry, abi: OBLIGATION_REGISTRY_ABI, functionName: "obligations", args: [id] });
    const [obligationId, beneficiary, amount, dueAt, _priority, status] = item;
    const due = Number(dueAt);
    const isOpen = Number(status) === 0;
    if (!isOpen) {
      db.prepare("UPDATE alerts SET resolved=1,updated_at=? WHERE id=?").run(now, `${t.vault.toLowerCase()}-${obligationId}`);
      continue;
    }
    const type = due < now ? "overdue" : due < now + 7 * 86400 ? "due_soon" : "scheduled";
    const message = `Obligation for ${String(beneficiary)} ${due < now ? "is overdue" : `is due ${new Date(due * 1000).toISOString()}`}`;
    insertAlert.run(`${t.vault.toLowerCase()}-${obligationId}`, t.vault.toLowerCase(), type, obligationId, amount.toString(), due, message, now, now, 0);
  }
  const open = db.prepare("SELECT id, obligation_id AS obligationId FROM alerts WHERE vault=? AND resolved=0 AND obligation_id IS NOT NULL").all(t.vault.toLowerCase()) as Array<{ id: string; obligationId: `0x${string}` }>;
  const resolveAlert = db.prepare("UPDATE alerts SET resolved=1,updated_at=? WHERE id=?");
  const refreshAlert = db.prepare("UPDATE alerts SET type=?,amount=?,due_at=?,message=?,updated_at=? WHERE id=?");
  for (const alert of open) {
    const item = await client.readContract({ address: t.registry, abi: OBLIGATION_REGISTRY_ABI, functionName: "obligations", args: [alert.obligationId] });
    if (Number(item[5]) !== 0) resolveAlert.run(now, alert.id);
    else {
      const due = Number(item[3]);
      const type = due < now ? "overdue" : due < now + 7 * 86400 ? "due_soon" : "scheduled";
      const message = `Obligation for ${String(item[1])} ${due < now ? "is overdue" : `is due ${new Date(due * 1000).toISOString()}`}`;
      refreshAlert.run(type, item[2].toString(), due, message, now, alert.id);
    }
  }
  setCheckpoint.run(key, Number(latest));
}

async function syncOnce() {
  const latest = await client.getBlockNumber();
  if (factory) await loadFactoryTreasuries(latest);
  const fallbackVault = process.env.NEXT_PUBLIC_TREASURY_VAULT_ADDRESS;
  const fallbackRegistry = process.env.NEXT_PUBLIC_OBLIGATION_REGISTRY_ADDRESS;
  const fallbackStrategy = process.env.NEXT_PUBLIC_MOCK_STRATEGY_ADDRESS ?? "0x0000000000000000000000000000000000000000";
  const fallbackAsset = process.env.NEXT_PUBLIC_USDC_ADDRESS;
  if (fallbackVault && fallbackRegistry && fallbackAsset && !knownTreasuries().some(t => t.vault.toLowerCase() === fallbackVault.toLowerCase())) {
    insertTreasury.run(fallbackVault.toLowerCase(), fallbackRegistry.toLowerCase(), fallbackStrategy.toLowerCase(), fallbackAsset.toLowerCase(), "0x0000000000000000000000000000000000000000", Number(BigInt(process.env.NEXT_PUBLIC_OBLIGATION_REGISTRY_DEPLOY_BLOCK ?? "0")));
  }
  for (const treasury of knownTreasuries()) {
    try { await syncEvents(treasury, latest); await syncAlerts(treasury, latest); console.log(`Indexed ${treasury.vault} through block ${latest}`); }
    catch (error) { console.error(`Indexing failed for ${treasury.vault}:`, error); }
  }
}

async function main() {
  const intervalMs = Math.max(5_000, Number(process.env.SOLVENT_INDEXER_INTERVAL_MS ?? 15_000));
  console.log(`Solvent indexer polling Arbitrum Sepolia every ${intervalMs}ms; database: ${dbPath}`);
  while (true) {
    try { await syncOnce(); }
    catch (error) { console.error("Indexer cycle failed:", error); }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
