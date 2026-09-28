/**
 * Solvent keeper — a standalone off-chain worker (NOT part of the Next.js app).
 *
 * Each tick it reads live treasury state and takes only actions the contracts
 * already allow the owner to take:
 *   - settles PENDING obligations that are overdue (dueAt < now)
 *   - recalls capital from the strategy to cover PENDING obligations that come
 *     due within the next 48h when the idle balance can't cover them
 *
 * The contract is the authority: every action is simulated first, capped by the
 * vault's own accounting (strategyPositions), and recalls are skipped when the
 * treasury is already healthy. Failed reads/txs are logged and the loop keeps
 * going — a bad tick never crashes the keeper.
 *
 * Run:   cd keeper && npx ts-node index.ts
 * Env (read from ../.env): NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC,
 *   NEXT_PUBLIC_TREASURY_VAULT_ADDRESS, NEXT_PUBLIC_OBLIGATION_REGISTRY_ADDRESS,
 *   NEXT_PUBLIC_MOCK_STRATEGY_ADDRESS, PRIVATE_KEY (owner key).
 * Optional: KEEPER_INTERVAL_MS (default 60000), KEEPER_DRY_RUN=true (decide and
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
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";

// The keeper is launched from /keeper, but the project .env lives one level up.
loadEnv({ path: path.resolve(__dirname, "../.env") });

const DECIMALS = 6; // USDC / MockUSDC are 6-decimal.
const DUE_WINDOW_HOURS = 48;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(`Missing required env var ${name} (expected in ../.env)`);
  }
  return v.trim();
}

const RPC_URL = requireEnv("NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC");
const VAULT = getAddress(requireEnv("NEXT_PUBLIC_TREASURY_VAULT_ADDRESS"));
const REGISTRY = getAddress(requireEnv("NEXT_PUBLIC_OBLIGATION_REGISTRY_ADDRESS"));
const STRATEGY = getAddress(requireEnv("NEXT_PUBLIC_MOCK_STRATEGY_ADDRESS"));
const RAW_KEY = requireEnv("PRIVATE_KEY");
const PRIVATE_KEY = (RAW_KEY.startsWith("0x") ? RAW_KEY : `0x${RAW_KEY}`) as Hex;

const INTERVAL_MS = Number(process.env.KEEPER_INTERVAL_MS ?? 60_000);
const DRY_RUN = /^true$/i.test(process.env.KEEPER_DRY_RUN ?? "");
const RUN_ONCE = /^true$/i.test(process.env.KEEPER_ONCE ?? "");
const DEPLOY_BLOCK = (() => {
  const raw = process.env.NEXT_PUBLIC_OBLIGATION_REGISTRY_DEPLOY_BLOCK;
  try {
    return raw ? BigInt(raw) : 0n;
  } catch {
    return 0n;
  }
})();

const account = privateKeyToAccount(PRIVATE_KEY);
const publicClient = createPublicClient({ chain: arbitrumSepolia, transport: http(RPC_URL) });
const walletClient = createWalletClient({ account, chain: arbitrumSepolia, transport: http(RPC_URL) });

// --- ABIs: only the functions/events the keeper actually touches ---
const vaultAbi = [
  { type: "function", name: "totalAssets", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "availableBalance", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
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

type Obligation = {
  id: Hex;
  beneficiary: Address;
  amount: bigint;
  dueAt: bigint;
  priority: number;
  status: number;
};

async function readState() {
  const [totalAssets, availableBalance, protectedLiquidity, strategyPosition, strategyLiquidity] =
    await Promise.all([
      publicClient.readContract({ address: VAULT, abi: vaultAbi, functionName: "totalAssets" }),
      publicClient.readContract({ address: VAULT, abi: vaultAbi, functionName: "availableBalance" }),
      publicClient.readContract({ address: REGISTRY, abi: registryAbi, functionName: "protectedLiquidity" }),
      publicClient.readContract({ address: VAULT, abi: vaultAbi, functionName: "strategyPositions", args: [STRATEGY] }),
      publicClient.readContract({ address: STRATEGY, abi: strategyAbi, functionName: "availableLiquidity" }),
    ]);
  return { totalAssets, availableBalance, protectedLiquidity, strategyPosition, strategyLiquidity };
}

// Event-source obligation ids from ObligationCreated (same pattern as the web
// app's useObligations), read each current record, keep only PENDING ones.
async function getPendingObligations(): Promise<Obligation[]> {
  const logs = await publicClient.getContractEvents({
    address: REGISTRY,
    abi: registryAbi,
    eventName: "ObligationCreated",
    fromBlock: DEPLOY_BLOCK,
    toBlock: "latest",
  });
  const ids = Array.from(new Set(logs.map((l) => l.args.id as Hex)));
  const records = await Promise.all(
    ids.map(async (id) => {
      const r = (await publicClient.readContract({
        address: REGISTRY,
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
async function recall(amount: bigint): Promise<boolean> {
  if (DRY_RUN) {
    log("DRYRUN", `would recallFromStrategy(${short(STRATEGY)}, ${usd(amount)})`);
    return true;
  }
  try {
    const { request } = await publicClient.simulateContract({
      address: VAULT,
      abi: vaultAbi,
      functionName: "recallFromStrategy",
      args: [STRATEGY, amount],
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

async function settle(id: Hex): Promise<boolean> {
  if (DRY_RUN) {
    log("DRYRUN", `would settleObligation(${short(id)})`);
    return true;
  }
  try {
    const { request } = await publicClient.simulateContract({
      address: REGISTRY,
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

async function tick(): Promise<void> {
  let state: Awaited<ReturnType<typeof readState>>;
  let pending: Obligation[];
  try {
    [state, pending] = await Promise.all([readState(), getPendingObligations()]);
  } catch (e) {
    // Safety rule #5: RPC unreachable -> log and retry next tick, never crash.
    log("ERROR", `read failed (will retry next tick): ${errText(e)}`);
    return;
  }

  log(
    "TICK",
    `totalAssets: ${usd(state.totalAssets)}, available: ${usd(state.availableBalance)}, ` +
      `protected: ${usd(state.protectedLiquidity)}, obligations: ${pending.length}`
  );

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
        log("RECALL", `obligation ${short(o.id)} overdue by ${(-hoursUntilDue).toFixed(1)}h, funding settlement, recalling ${usd(recallAmount)}`);
        if (await recall(recallAmount)) {
          available += recallAmount;
          recallable -= recallAmount;
          acted = true;
        }
      }
      log("SETTLE", `obligation ${short(o.id)} overdue by ${(-hoursUntilDue).toFixed(1)}h, settling ${usd(o.amount)} to ${short(o.beneficiary)}`);
      if (await settle(o.id)) {
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
          log("RECALL", `obligation ${short(o.id)} due in ${hoursUntilDue.toFixed(1)}h, shortfall ${usd(shortfall)}, recalling ${usd(recallAmount)}`);
          if (await recall(recallAmount)) {
            available += recallAmount;
            recallable -= recallAmount;
            acted = true;
          }
        } else {
          log("WARN", `obligation ${short(o.id)} due in ${hoursUntilDue.toFixed(1)}h has a ${usd(shortfall)} shortfall but nothing is deployed to recall`);
        }
      }
    }
  }

  if (!acted) {
    log("IDLE", healthy ? "treasury healthy (available > protected), no action required" : "no action required");
  }
}

let inTick = false;
async function safeTick(): Promise<void> {
  if (inTick) return; // don't overlap if a tick runs longer than the interval
  inTick = true;
  try {
    await tick();
  } catch (e) {
    log("ERROR", `tick crashed (recovered): ${errText(e)}`);
  } finally {
    inTick = false;
  }
}

async function main(): Promise<void> {
  log("START", `keeper online as ${account.address}${DRY_RUN ? " [DRY RUN]" : ""}`);
  log("START", `vault ${short(VAULT)} · registry ${short(REGISTRY)} · strategy ${short(STRATEGY)}`);
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

