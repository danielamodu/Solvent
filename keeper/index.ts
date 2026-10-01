/**
 * Solvent keeper — a standalone off-chain worker (NOT part of the Next.js app).
 *
 * Each tick it discovers every treasury the owner controls and takes only
 * actions the contracts already allow the owner to take:
 *   - settles PENDING obligations that are overdue (dueAt < now)
 *   - recalls capital from the strategy to cover PENDING obligations that come
 *     due within the next 48h when the idle balance can't cover them
 *
 * Discovery (preferred): set NEXT_PUBLIC_TREASURY_FACTORY_ADDRESS and the
 * keeper lists `getTreasuries(owner)` on the factory, resolving each vault's
 * registry/strategy on-chain. Legacy single-treasury env
 * (NEXT_PUBLIC_TREASURY_VAULT_ADDRESS / NEXT_PUBLIC_OBLIGATION_REGISTRY_ADDRESS /
 * NEXT_PUBLIC_MOCK_STRATEGY_ADDRESS) is still honored and merged in, so one
 * pre-factory treasury keeps working.
 *
 * The contract is the authority: every action is simulated first, capped by the
 * vault's own accounting (strategyPositions), and recalls are skipped when the
 * treasury is already healthy. Failed reads/txs are logged and the loop keeps
 * going — a bad tick never crashes the keeper. A Safe-owned vault is reported
 * but skipped for writes: the EOA signer cannot satisfy Safe ownership, so the
 * keeper logs a warning and moves on instead of spamming reverts.
 *
 * Run:   cd keeper && npx ts-node index.ts
 * Env (read from ../.env): NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC,
 *   NEXT_PUBLIC_TREASURY_FACTORY_ADDRESS (preferred) and/or the three legacy
 *   treasury addresses, PRIVATE_KEY (owner key).
 * Optional: KEEPER_OWNER_ADDRESS (treasury owner to watch; defaults to the
 *   signer), KEEPER_INTERVAL_MS (default 60000), KEEPER_DRY_RUN=true (decide and
 *   log but send no transactions), KEEPER_ONCE=true (run one tick then exit).
 */
import { config as loadEnv } from "dotenv";
import path from "node:path";
import {
  createPublicClient,
  createWalletClient,
  http,
  formatUnits,
  getAddress,
  zeroAddress,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";

// The keeper is launched from /keeper, but the project .env lives one level up.
loadEnv({ path: path.resolve(__dirname, "../.env") });

const DECIMALS = 6; // USDC / SUSD are 6-decimal.
const DUE_WINDOW_HOURS = 48;

function optionalAddress(name: string): Address | undefined {
  const v = process.env[name]?.trim();
  if (!v) return undefined;
  try {
    return getAddress(v);
  } catch {
    throw new Error(`Malformed address in ${name} (expected 0x + 40 hex chars)`);
  }
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(`Missing required env var ${name} (expected in ../.env)`);
  }
  return v.trim();
}

const RPC_URL = requireEnv("NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC");
const FACTORY = optionalAddress("NEXT_PUBLIC_TREASURY_FACTORY_ADDRESS");
const OWNER_OVERRIDE = optionalAddress("KEEPER_OWNER_ADDRESS");
const LEGACY_VAULT = optionalAddress("NEXT_PUBLIC_TREASURY_VAULT_ADDRESS");
const LEGACY_REGISTRY = optionalAddress("NEXT_PUBLIC_OBLIGATION_REGISTRY_ADDRESS");
const LEGACY_STRATEGY = optionalAddress("NEXT_PUBLIC_MOCK_STRATEGY_ADDRESS");
const RAW_KEY = requireEnv("PRIVATE_KEY");
const PRIVATE_KEY = (RAW_KEY.startsWith("0x") ? RAW_KEY : `0x${RAW_KEY}`) as Hex;

const INTERVAL_MS = Math.max(5_000, Number(process.env.KEEPER_INTERVAL_MS ?? 60_000) || 60_000);
const DRY_RUN = /^true$/i.test(process.env.KEEPER_DRY_RUN ?? "");
const RUN_ONCE = /^true$/i.test(process.env.KEEPER_ONCE ?? "");
const HEARTBEAT_URL = process.env.KEEPER_HEARTBEAT_URL;
const HEARTBEAT_TOKEN = process.env.KEEPER_HEARTBEAT_TOKEN;
// Scan floor for ObligationCreated on every watched registry. Must be the
// MINIMUM of the configured blocks: the legacy registry predates the new
// factory, and using only the factory block would blind the keeper to the
// legacy treasury's older obligations.
const FROM_BLOCK = (() => {
  const candidates = [
    process.env.NEXT_PUBLIC_TREASURY_FACTORY_DEPLOY_BLOCK,
    process.env.NEXT_PUBLIC_OBLIGATION_REGISTRY_DEPLOY_BLOCK,
  ];
  let best: bigint | null = null;
  for (const raw of candidates) {
    if (!raw) continue;
    try {
      const n = BigInt(raw);
      if (best === null || n < best) best = n;
    } catch { /* ignore malformed block */ }
  }
  return best ?? 0n;
})();

const account = privateKeyToAccount(PRIVATE_KEY);
const publicClient = createPublicClient({ chain: arbitrumSepolia, transport: http(RPC_URL) });
const walletClient = createWalletClient({ account, chain: arbitrumSepolia, transport: http(RPC_URL) });

// --- ABIs: only the functions/events the keeper actually touches ---
const factoryAbi = [
  { type: "function", name: "getTreasuries", stateMutability: "view", inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "address[]" }] },
  { type: "function", name: "registryForVault", stateMutability: "view", inputs: [{ name: "vault", type: "address" }], outputs: [{ type: "address" }] },
  { type: "function", name: "strategyForVault", stateMutability: "view", inputs: [{ name: "vault", type: "address" }], outputs: [{ type: "address" }] },
] as const;

const vaultAbi = [
  { type: "function", name: "totalAssets", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "availableBalance", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "owner", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "strategyPositions", stateMutability: "view", inputs: [{ name: "strategy", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "recallFromStrategy", stateMutability: "nonpayable", inputs: [{ name: "strategy", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
] as const;

const registryAbi = [
  { type: "function", name: "getOutstandingAmount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "protectedLiquidity", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "function", name: "obligations", stateMutability: "view", inputs: [{ type: "bytes32" }],
    outputs: [
      { name: "id", type: "bytes32" }, { name: "beneficiary", type: "address" }, { name: "amount", type: "uint256" },
      { name: "dueAt", type: "uint256" }, { name: "priority", type: "uint8" }, { name: "status", type: "uint8" },
    ],
  },
  { type: "function", name: "settleObligation", stateMutability: "nonpayable", inputs: [{ type: "bytes32" }], outputs: [] },
  {
    type: "event", name: "ObligationCreated",
    inputs: [
      { name: "id", type: "bytes32", indexed: true }, { name: "beneficiary", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false }, { name: "dueAt", type: "uint256", indexed: false },
    ],
  },
] as const;

const strategyAbi = [
  { type: "function", name: "availableLiquidity", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

// --- helpers ---
function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function log(kind: string, msg: string): void {
  console.log(`[${stamp()}] ${kind} — ${msg}`);
}
function usd(v: bigint): string {
  return `${formatUnits(v, DECIMALS)} USDC`;
}
function short(hex: string): string {
  return `${hex.slice(0, 6)}...${hex.slice(-4)}`;
}
function errText(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  return m.split("\n")[0].slice(0, 200);
}
function min(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

type Treasury = {
  vault: Address;
  registry: Address;
  strategy: Address;
};

type Obligation = {
  id: Hex;
  beneficiary: Address;
  amount: bigint;
  dueAt: bigint;
  priority: number;
  status: number;
};

async function discoverTreasuries(): Promise<Treasury[]> {
  const found = new Map<string, Treasury>();
  if (FACTORY) {
    const owner = OWNER_OVERRIDE ?? account.address;
    const vaults = await publicClient.readContract({
      address: FACTORY,
      abi: factoryAbi,
      functionName: "getTreasuries",
      args: [owner],
    });
    await Promise.all(
      vaults.map(async (vault) => {
        try {
          const [registry, strategy] = await Promise.all([
            publicClient.readContract({ address: FACTORY, abi: factoryAbi, functionName: "registryForVault", args: [vault] }),
            publicClient.readContract({ address: FACTORY, abi: factoryAbi, functionName: "strategyForVault", args: [vault] }),
          ]);
          if (registry === zeroAddress || strategy === zeroAddress) {
            log("WARN", `vault ${short(vault)} missing registry/strategy wiring, skipping`);
            return;
          }
          found.set(vault.toLowerCase(), { vault, registry, strategy });
        } catch (e) {
          log("WARN", `vault ${short(vault)} wiring read failed, skipping: ${errText(e)}`);
        }
      })
    );
  }
  if (LEGACY_VAULT && LEGACY_REGISTRY && LEGACY_STRATEGY) {
    const key = LEGACY_VAULT.toLowerCase();
    if (!found.has(key)) {
      found.set(key, { vault: LEGACY_VAULT, registry: LEGACY_REGISTRY, strategy: LEGACY_STRATEGY });
    }
  }
  return [...found.values()];
}

async function readState(t: Treasury) {
  const [totalAssets, availableBalance, protectedLiquidity, strategyPosition, strategyLiquidity, owner] =
    await Promise.all([
      publicClient.readContract({ address: t.vault, abi: vaultAbi, functionName: "totalAssets" }),
      publicClient.readContract({ address: t.vault, abi: vaultAbi, functionName: "availableBalance" }),
      publicClient.readContract({ address: t.registry, abi: registryAbi, functionName: "protectedLiquidity" }),
      publicClient.readContract({ address: t.vault, abi: vaultAbi, functionName: "strategyPositions", args: [t.strategy] }),
      publicClient.readContract({ address: t.strategy, abi: strategyAbi, functionName: "availableLiquidity" }),
      publicClient.readContract({ address: t.vault, abi: vaultAbi, functionName: "owner" }),
    ]);
  return { totalAssets, availableBalance, protectedLiquidity, strategyPosition, strategyLiquidity, owner };
}

// Event-source obligation ids from ObligationCreated (same pattern as the web
// app's useObligations), read each current record, keep only PENDING ones.
async function getPendingObligations(registry: Address): Promise<Obligation[]> {
  const logs = await publicClient.getContractEvents({
    address: registry,
    abi: registryAbi,
    eventName: "ObligationCreated",
    fromBlock: FROM_BLOCK,
    toBlock: "latest",
  });
  const ids = Array.from(new Set(logs.map((l) => l.args.id as Hex)));
  const records = await Promise.all(
    ids.map(async (id) => {
      const r = (await publicClient.readContract({
        address: registry,
        abi: registryAbi,
        functionName: "obligations",
        args: [id],
      })) as readonly [Hex, Address, bigint, bigint, number, number];
      return { id: r[0], beneficiary: r[1], amount: r[2], dueAt: r[3], priority: Number(r[4]), status: Number(r[5]) };
    })
  );
  // Safety rule #2: only ever act on PENDING (status 0) obligations.
  return records.filter((o) => o.status === 0);
}

// Simulate first (catches reverts before spending gas), then send. Any failure
// is logged and swallowed so one bad tx never takes the keeper down (rule #4).
async function recall(t: Treasury, amount: bigint): Promise<boolean> {
  if (DRY_RUN) {
    log("DRYRUN", `would recallFromStrategy(${short(t.strategy)}, ${usd(amount)}) on ${short(t.vault)}`);
    return true;
  }
  try {
    const { request } = await publicClient.simulateContract({
      address: t.vault,
      abi: vaultAbi,
      functionName: "recallFromStrategy",
      args: [t.strategy, amount],
      account,
    });
    const hash = await walletClient.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const ok = receipt.status === "success";
    log("TX", `${short(hash)} (${ok ? "confirmed" : "reverted"})`);
    return ok;
  } catch (e) {
    log("ERROR", `recall failed: ${errText(e)}`);
    return false;
  }
}

async function settle(t: Treasury, id: Hex): Promise<boolean> {
  if (DRY_RUN) {
    log("DRYRUN", `would settleObligation(${short(id)}) on ${short(t.vault)}`);
    return true;
  }
  try {
    const { request } = await publicClient.simulateContract({
      address: t.registry,
      abi: registryAbi,
      functionName: "settleObligation",
      args: [id],
      account,
    });
    const hash = await walletClient.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const ok = receipt.status === "success";
    log("TX", `${short(hash)} (${ok ? "confirmed" : "reverted"})`);
    return ok;
  } catch (e) {
    log("ERROR", `settle failed: ${errText(e)}`);
    return false;
  }
}

async function tickTreasury(t: Treasury): Promise<{ action: string | null; error: string | null }> {
  let action: string | null = null;
  let error: string | null = null;
  const tag = short(t.vault);
  const note = (kind: string, msg: string) => {
    log(kind, `[${tag}] ${msg}`);
    if (["RECALL", "SETTLE", "TX", "IDLE"].includes(kind)) action = `${kind}: ${msg}`.slice(0, 160);
    if (kind === "ERROR" || kind === "WARN") error = msg.slice(0, 300);
  };

  let state: Awaited<ReturnType<typeof readState>>;
  let pending: Obligation[];
  try {
    [state, pending] = await Promise.all([readState(t), getPendingObligations(t.registry)]);
  } catch (e) {
    // Safety rule #5: RPC unreachable -> log and retry next tick, never crash.
    note("ERROR", `read failed (will retry next tick): ${errText(e)}`);
    return { action, error };
  }

  note(
    "TICK",
    `totalAssets: ${usd(state.totalAssets)}, available: ${usd(state.availableBalance)}, ` +
      `protected: ${usd(state.protectedLiquidity)}, obligations: ${pending.length}`
  );

  // The EOA signer cannot satisfy Safe ownership checks — report and skip
  // writes instead of spamming reverts every tick.
  if (state.owner.toLowerCase() !== account.address.toLowerCase()) {
    note("WARN", `vault owner ${short(state.owner)} is not the keeper signer; writes skipped (Safe-owned?)`);
    return { action, error };
  }

  const now = Math.floor(Date.now() / 1000);
  // Mutable trackers so several actions in one tick stay consistent. Cap recalls
  // by BOTH the vault's recorded position (safety rule #1) and the strategy's
  // actual liquidity, decrementing as we go so one tick never over-recalls.
  let available = state.availableBalance;
  let recallable = min(state.strategyPosition, state.strategyLiquidity);
  // Rule #3: when idle balance already clears everything promised, no recall is
  // ever needed. (Overdue obligations are still settled — that is the point.)
  const healthy = state.availableBalance > state.protectedLiquidity;

  let acted = false;
  const queue = [...pending].sort((a, b) => (a.dueAt < b.dueAt ? -1 : a.dueAt > b.dueAt ? 1 : 0));

  for (const o of queue) {
    const hoursUntilDue = (Number(o.dueAt) - now) / 3600;

    if (hoursUntilDue < 0) {
      // Overdue -> settle. Top up first if the idle balance can't cover it.
      const needed = o.amount > available ? o.amount - available : 0n;
      const recallAmount = min(needed, recallable);
      if (recallAmount > 0n) {
        note("RECALL", `obligation ${short(o.id)} overdue by ${(-hoursUntilDue).toFixed(1)}h, funding settlement, recalling ${usd(recallAmount)}`);
        if (await recall(t, recallAmount)) {
          available += recallAmount;
          recallable -= recallAmount;
          acted = true;
        }
      }
      note("SETTLE", `obligation ${short(o.id)} overdue by ${(-hoursUntilDue).toFixed(1)}h, settling ${usd(o.amount)} to ${short(o.beneficiary)}`);
      if (await settle(t, o.id)) {
        available = available > o.amount ? available - o.amount : 0n;
        acted = true;
      }
      continue;
    }

    if (hoursUntilDue < DUE_WINDOW_HOURS && !healthy) {
      // Due soon and idle balance may fall short -> pre-position liquidity now.
      const shortfall = o.amount > available ? o.amount - available : 0n;
      if (shortfall > 0n) {
        const recallAmount = min(shortfall, recallable);
        if (recallAmount > 0n) {
          note("RECALL", `obligation ${short(o.id)} due in ${hoursUntilDue.toFixed(1)}h, shortfall ${usd(shortfall)}, recalling ${usd(recallAmount)}`);
          if (await recall(t, recallAmount)) {
            available += recallAmount;
            recallable -= recallAmount;
            acted = true;
          }
        } else {
          note("WARN", `obligation ${short(o.id)} due in ${hoursUntilDue.toFixed(1)}h has a ${usd(shortfall)} shortfall but nothing is deployed to recall`);
        }
      }
    }
  }

  if (!acted) {
    note("IDLE", healthy ? "treasury healthy (available > protected), no action required" : "no action required");
  }
  return { action, error };
}

async function sendHeartbeat(vault: Address, state: string, lastAction: string | null, lastError: string | null): Promise<void> {
  if (!HEARTBEAT_URL || !HEARTBEAT_TOKEN) return;
  try {
    const response = await fetch(HEARTBEAT_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${HEARTBEAT_TOKEN}` },
      body: JSON.stringify({ vault, state, lastAction, lastError }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) log("WARN", `heartbeat endpoint returned HTTP ${response.status}`);
  } catch (e) { log("WARN", `heartbeat failed: ${errText(e)}`); }
}

let inTick = false;
async function safeTick(): Promise<void> {
  if (inTick) return; // don't overlap if a tick runs longer than the interval
  inTick = true;
  try {
    let treasuries: Treasury[];
    try {
      treasuries = await discoverTreasuries();
    } catch (e) {
      log("ERROR", `discovery failed (will retry next tick): ${errText(e)}`);
      return;
    }
    if (treasuries.length === 0) {
      log("WARN", "no treasuries found — set NEXT_PUBLIC_TREASURY_FACTORY_ADDRESS (+ optional KEEPER_OWNER_ADDRESS) or the legacy treasury addresses");
      return;
    }
    log("DISCOVERY", `watching ${treasuries.length} treasur${treasuries.length === 1 ? "y" : "ies"}`);
    for (const t of treasuries) {
      let action: string | null = null;
      let error: string | null = null;
      try {
        ({ action, error } = await tickTreasury(t));
      } catch (e) {
        error = errText(e).slice(0, 300);
        log("ERROR", `tick crashed (recovered) on ${short(t.vault)}: ${errText(e)}`);
      }
      await sendHeartbeat(t.vault, error ? "degraded" : "healthy", action, error);
    }
  } finally {
    inTick = false;
  }
}

async function main(): Promise<void> {
  if (!FACTORY && !(LEGACY_VAULT && LEGACY_REGISTRY && LEGACY_STRATEGY)) {
    throw new Error("No treasuries configured: set NEXT_PUBLIC_TREASURY_FACTORY_ADDRESS or all three legacy treasury addresses in ../.env");
  }
  log("START", `keeper online as ${account.address}${DRY_RUN ? " [DRY RUN]" : ""}`);
  if (FACTORY) log("START", `discovery via factory ${short(FACTORY)} (owner ${OWNER_OVERRIDE ?? account.address})`);
  if (LEGACY_VAULT && LEGACY_REGISTRY && LEGACY_STRATEGY) {
    log("START", `legacy treasury ${short(LEGACY_VAULT)} · registry ${short(LEGACY_REGISTRY)} · strategy ${short(LEGACY_STRATEGY)}`);
  }
  log("START", `interval ${INTERVAL_MS}ms · dueWindow ${DUE_WINDOW_HOURS}h · once ${RUN_ONCE}`);
  await safeTick();
  if (RUN_ONCE) {
    log("DONE", "single tick complete (KEEPER_ONCE), exiting");
    return;
  }
  setInterval(safeTick, INTERVAL_MS);
}

main().catch((e) => {
  log("FATAL", errText(e));
  process.exit(1);
});
