import { config as loadEnv } from "dotenv";
import { createPublicClient, http, getAddress, formatUnits, type Address } from "viem";
import { arbitrumSepolia } from "viem/chains";
import { openDb, type IndexerDb } from "./db.ts";

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

let db!: IndexerDb;

type Treasury = { vault: Address; registry: Address; strategy: Address; asset: Address; owner: Address; createdBlock: number | bigint | string };
const factory = process.env.NEXT_PUBLIC_TREASURY_FACTORY_ADDRESS;
const startBlock = BigInt(process.env.NEXT_PUBLIC_TREASURY_FACTORY_DEPLOY_BLOCK ?? "0");

async function knownTreasuries(): Promise<Treasury[]> {
  return (await db.all("SELECT vault,registry,strategy,asset,owner,created_block AS createdBlock FROM treasuries")) as unknown as Treasury[];
}
async function eventCheckpoint(contract: string): Promise<{ block: number | string } | undefined> {
  return (await db.get("SELECT block_number AS block FROM checkpoints WHERE contract=?", [contract])) as { block: number | string } | undefined;
}
async function setCheckpoint(contract: string, block: number): Promise<void> {
  // Portable on both backends (SQLite and Postgres both spell the upsert this way).
  await db.run("INSERT INTO checkpoints(contract,block_number) VALUES(?,?) ON CONFLICT(contract) DO UPDATE SET block_number=excluded.block_number", [contract, block]);
}

async function loadFactoryTreasuries(latest: bigint) {
  const existing = new Set((await knownTreasuries()).map(t => String(t.vault).toLowerCase()));
  const cursor = await eventCheckpoint(factory!.toLowerCase());
  const fromBlock = cursor === undefined ? startBlock : BigInt(cursor.block) + 1n;
  if (fromBlock > latest) return;
  const events = await client.getContractEvents({ address: getAddress(factory!), abi: treasuryFactoryAbi, eventName: "TreasuryCreated", fromBlock, toBlock: latest });
  for (const e of events) {
    const { vault, registry, strategy, asset, owner } = e.args;
    if (!vault || !registry || !strategy || !asset || !owner) continue;
    await db.upsertTreasury(vault.toLowerCase(), registry.toLowerCase(), strategy.toLowerCase(), asset.toLowerCase(), owner.toLowerCase(), Number(e.blockNumber));
    existing.add(vault.toLowerCase());
  }
  await setCheckpoint(factory!.toLowerCase(), Number(latest));
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
  await db.insertActivity(`${tx}-${logIndex}`, String(t.vault).toLowerCase(), Number(block), logIndex, timestamp, type, amountRaw?.toString() ?? null, detail.slice(0, 300), tx);
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
    const key = String(address).toLowerCase();
    const saved = await eventCheckpoint(key);
    const start = saved === undefined ? BigInt(t.createdBlock) : BigInt(saved.block) + 1n;
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
      await setCheckpoint(key, Number(end));
    }
  }
}

async function syncAlerts(t: Treasury, latest: bigint) {
  const key = `${String(t.registry).toLowerCase()}:alerts`;
  const saved = await eventCheckpoint(key);
  const start = saved === undefined ? BigInt(t.createdBlock) : BigInt(saved.block) + 1n;
  const logs = start <= latest ? await client.getContractEvents({ address: t.registry, abi: OBLIGATION_REGISTRY_ABI, eventName: "ObligationCreated", fromBlock: start, toBlock: latest }) : [];
  const now = Math.floor(Date.now() / 1000);
  for (const event of logs) {
    const id = event.args.id;
    if (!id) continue;
    const item = await client.readContract({ address: t.registry, abi: OBLIGATION_REGISTRY_ABI, functionName: "obligations", args: [id] });
    const [obligationId, beneficiary, amount, dueAt, _priority, status] = item;
    const due = Number(dueAt);
    const isOpen = Number(status) === 0;
    if (!isOpen) {
      await db.run("UPDATE alerts SET resolved=1,updated_at=? WHERE id=?", [now, `${String(t.vault).toLowerCase()}-${obligationId}`]);
      continue;
    }
    const type = due < now ? "overdue" : due < now + 7 * 86400 ? "due_soon" : "scheduled";
    const message = `Obligation for ${String(beneficiary)} ${due < now ? "is overdue" : `is due ${new Date(due * 1000).toISOString()}`}`;
    // Portable upsert (both backends spell ON CONFLICT the same way).
    await db.run(`INSERT INTO alerts(id,vault,type,obligation_id,amount,due_at,message,created_at,updated_at,resolved)
      VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET amount=excluded.amount,due_at=excluded.due_at,message=excluded.message,updated_at=excluded.updated_at,resolved=excluded.resolved`,
      [`${String(t.vault).toLowerCase()}-${obligationId}`, String(t.vault).toLowerCase(), type, obligationId, amount.toString(), due, message, now, now, 0]);
  }
  const open = (await db.all("SELECT id, obligation_id AS obligationId FROM alerts WHERE vault=? AND resolved=0 AND obligation_id IS NOT NULL", [String(t.vault).toLowerCase()])) as unknown as Array<{ id: string; obligationId: `0x${string}` }>;
  for (const alert of open) {
    const item = await client.readContract({ address: t.registry, abi: OBLIGATION_REGISTRY_ABI, functionName: "obligations", args: [alert.obligationId] });
    if (Number(item[5]) !== 0) await db.run("UPDATE alerts SET resolved=1,updated_at=? WHERE id=?", [now, alert.id]);
    else {
      const due = Number(item[3]);
      const type = due < now ? "overdue" : due < now + 7 * 86400 ? "due_soon" : "scheduled";
      const message = `Obligation for ${String(item[1])} ${due < now ? "is overdue" : `is due ${new Date(due * 1000).toISOString()}`}`;
      await db.run("UPDATE alerts SET type=?,amount=?,due_at=?,message=?,updated_at=? WHERE id=?", [type, item[2].toString(), due, message, now, alert.id]);
    }
  }
  await setCheckpoint(key, Number(latest));
}

async function syncOnce() {
  const latest = await client.getBlockNumber();
  if (factory) await loadFactoryTreasuries(latest);
  const fallbackVault = process.env.NEXT_PUBLIC_TREASURY_VAULT_ADDRESS;
  const fallbackRegistry = process.env.NEXT_PUBLIC_OBLIGATION_REGISTRY_ADDRESS;
  const fallbackStrategy = process.env.NEXT_PUBLIC_MOCK_STRATEGY_ADDRESS ?? "0x0000000000000000000000000000000000000000";
  const fallbackAsset = process.env.NEXT_PUBLIC_USDC_ADDRESS;
  if (fallbackVault && fallbackRegistry && fallbackAsset && !(await knownTreasuries()).some(t => String(t.vault).toLowerCase() === fallbackVault.toLowerCase())) {
    await db.upsertTreasury(fallbackVault.toLowerCase(), fallbackRegistry.toLowerCase(), fallbackStrategy.toLowerCase(), fallbackAsset.toLowerCase(), "0x0000000000000000000000000000000000000000", Number(BigInt(process.env.NEXT_PUBLIC_OBLIGATION_REGISTRY_DEPLOY_BLOCK ?? "0")));
  }
  for (const treasury of await knownTreasuries()) {
    try { await syncEvents(treasury, latest); await syncAlerts(treasury, latest); console.log(`Indexed ${treasury.vault} through block ${latest}`); }
    catch (error) { console.error(`Indexing failed for ${treasury.vault}:`, error); }
  }
}

async function main() {
  const { db: handle, describe } = await openDb();
  db = handle;
  const intervalMs = Math.max(5_000, Number(process.env.SOLVENT_INDEXER_INTERVAL_MS ?? 15_000));
  console.log(`Solvent indexer polling Arbitrum Sepolia every ${intervalMs}ms; database: ${describe}`);
  while (true) {
    try { await syncOnce(); }
    catch (error) { console.error("Indexer cycle failed:", error); }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
