/**
 * Solvent demo seeder — one command that puts the live treasury into a clean,
 * judge-ready state on Arbitrum Sepolia. NOT part of the Next.js app.
 *
 * Produces:
 *   - 500,000 SUSD deposited            (dashboard "Total assets" -> $500,000)
 *   - 3 pending obligations             (Supplier $40k/5d HIGH, Payroll
 *                                        $75k/8d HIGH, Investor $30k/15d MED)
 *   - all deployable surplus deployed   (dashboard "Deployable" -> $0)
 *
 * After seeding, the demo beat is: create one urgent ~$100k obligation live ->
 * protected liquidity overtakes the idle balance -> the Shortfall alert fires
 * -> Recall covers it -> settle.
 *
 * The signer must be the vault owner (createObligation / deployToStrategy are
 * owner-only). SUSD is minted to the owner first via SolventUSD.mint — TESTNET
 * ONLY; SolventUSD has an unrestricted mint by design.
 *
 * Run:   cd keeper && npx ts-node ../scripts/seed-demo.ts
 * Env (read from ../.env): NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC,
 *   NEXT_PUBLIC_TREASURY_VAULT_ADDRESS, NEXT_PUBLIC_OBLIGATION_REGISTRY_ADDRESS,
 *   NEXT_PUBLIC_MOCK_STRATEGY_ADDRESS, NEXT_PUBLIC_USDC_ADDRESS, PRIVATE_KEY.
 * Optional: SEED_DRY_RUN=true (read + plan, send nothing),
 *           SEED_FORCE=true (seed even if the treasury already holds state).
 */
import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  createPublicClient,
  createWalletClient,
  http,
  formatUnits,
  getAddress,
  parseUnits,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";

// Load the project .env. Resolved from the current working directory so it
// works whether this is run from the repo root or from /keeper (the documented
// `cd keeper && npx ts-node ../scripts/seed-demo.ts`) — and without __dirname,
// which isn't defined when Node runs this file as an ES module.
const ENV_PATH = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../.env"),
].find((p) => existsSync(p));
if (ENV_PATH) loadEnv({ path: ENV_PATH });

const DECIMALS = 6; // SUSD / USDC are 6-decimal.
const DAY = 86_400;

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
const USDC = getAddress(requireEnv("NEXT_PUBLIC_USDC_ADDRESS"));
const RAW_KEY = requireEnv("PRIVATE_KEY");
const PRIVATE_KEY = (RAW_KEY.startsWith("0x") ? RAW_KEY : `0x${RAW_KEY}`) as Hex;

const DRY_RUN = /^true$/i.test(process.env.SEED_DRY_RUN ?? "");
const FORCE = /^true$/i.test(process.env.SEED_FORCE ?? "");

const DEPOSIT = parseUnits("500000", DECIMALS); // $500,000

// Obligations to create. Beneficiaries are stand-in demo addresses — the
// protocol tracks addresses, not labels; the names are for the narrator.
// priority: 0 = HIGH, 1 = MEDIUM, 2 = LOW.
const OBLIGATIONS = [
  { label: "Supplier Payment", beneficiary: getAddress("0x1111111111111111111111111111111111111111"), amount: parseUnits("40000", DECIMALS), days: 5, priority: 0 },
  { label: "Payroll", beneficiary: getAddress("0x2222222222222222222222222222222222222222"), amount: parseUnits("75000", DECIMALS), days: 8, priority: 0 },
  { label: "Investor Return", beneficiary: getAddress("0x3333333333333333333333333333333333333333"), amount: parseUnits("30000", DECIMALS), days: 15, priority: 1 },
] as const;

const account = privateKeyToAccount(PRIVATE_KEY);
const publicClient = createPublicClient({ chain: arbitrumSepolia, transport: http(RPC_URL) });
const walletClient = createWalletClient({ account, chain: arbitrumSepolia, transport: http(RPC_URL) });

// --- ABIs: only what the seeder touches ---
const usdcAbi = [
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }] },
] as const;

const vaultAbi = [
  { type: "function", name: "owner", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "totalAssets", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "availableBalance", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "deployableCapital", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "totalDeployed", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "deposit", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "deployToStrategy", stateMutability: "nonpayable", inputs: [{ name: "strategy", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
] as const;

const registryAbi = [
  { type: "function", name: "createObligation", stateMutability: "nonpayable", inputs: [{ name: "beneficiary", type: "address" }, { name: "amount", type: "uint256" }, { name: "dueAt", type: "uint256" }, { name: "priority", type: "uint8" }], outputs: [{ type: "bytes32" }] },
  { type: "function", name: "getOutstandingAmount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "protectedLiquidity", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "reserveRequirement", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

// --- helpers ---
function usd(v: bigint): string {
  return `$${Number(formatUnits(v, DECIMALS)).toLocaleString("en-US")}`;
}
function log(step: string, msg: string): void {
  console.log(`  ${step.padEnd(9)} ${msg}`);
}
function errText(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  return m.split("\n")[0].slice(0, 240);
}

// Simulate first (surfaces a revert with a clean message before spending gas),
// then send and wait for the receipt. In dry-run mode, plan only.
async function send(
  label: string,
  params: {
    address: Address;
    abi: readonly unknown[];
    functionName: string;
    args: readonly unknown[];
  }
): Promise<void> {
  if (DRY_RUN) {
    log("DRYRUN", `would ${label}`);
    return;
  }
  const { request } = await publicClient.simulateContract({
    ...params,
    account,
  } as any);
  const hash = await walletClient.writeContract(request as any);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error(`${label} reverted (tx ${hash})`);
  }
  log("TX", `${label} — ${hash}`);
}

async function readDashboard() {
  const [totalAssets, available, deployable, deployed, outstanding, protectedLiq, reserve] =
    await Promise.all([
      publicClient.readContract({ address: VAULT, abi: vaultAbi, functionName: "totalAssets" }),
      publicClient.readContract({ address: VAULT, abi: vaultAbi, functionName: "availableBalance" }),
      publicClient.readContract({ address: VAULT, abi: vaultAbi, functionName: "deployableCapital" }),
      publicClient.readContract({ address: VAULT, abi: vaultAbi, functionName: "totalDeployed" }),
      publicClient.readContract({ address: REGISTRY, abi: registryAbi, functionName: "getOutstandingAmount" }),
      publicClient.readContract({ address: REGISTRY, abi: registryAbi, functionName: "protectedLiquidity" }),
      publicClient.readContract({ address: REGISTRY, abi: registryAbi, functionName: "reserveRequirement" }),
    ]);
  return { totalAssets, available, deployable, deployed, outstanding, protectedLiq, reserve };
}

function printDashboard(d: Awaited<ReturnType<typeof readDashboard>>): void {
  const cov =
    d.outstanding > 0n
      ? `${Math.round(
          ((Number(formatUnits(d.available, DECIMALS)) +
            Number(formatUnits(d.deployed, DECIMALS))) /
            Number(formatUnits(d.outstanding, DECIMALS))) *
            100
        )}%`
      : "— (no obligations)";
  console.log("\n  Dashboard state");
  console.log("  -----------------------------------------");
  log("Total", usd(d.totalAssets));
  log("Protected", usd(d.protectedLiq));
  log("Deployed", usd(d.deployed));
  log("Available", usd(d.available));
  log("Deployable", usd(d.deployable));
  log("Reserve", usd(d.reserve));
  log("Owed", usd(d.outstanding));
  log("Coverage", cov);
}

async function main(): Promise<void> {
  console.log(`\nSolvent demo seeder${DRY_RUN ? " [DRY RUN]" : ""}`);
  console.log(`  signer   ${account.address}`);
  console.log(`  vault    ${VAULT}`);

  // Guard: the writes below are owner-only (createObligation, deployToStrategy).
  const owner = (await publicClient.readContract({
    address: VAULT,
    abi: vaultAbi,
    functionName: "owner",
  })) as Address;
  if (getAddress(owner) !== account.address) {
    throw new Error(
      `Signer ${account.address} is not the vault owner (${owner}). ` +
        `Set PRIVATE_KEY to the owner key.`
    );
  }

  // Guard: don't stack a second deposit/obligation set onto a live treasury.
  const before = await readDashboard();
  if (!FORCE && (before.totalAssets > 0n || before.outstanding > 0n)) {
    printDashboard(before);
    console.log(
      "\n  Treasury already holds state — re-running would stack another " +
        "deposit and\n  obligations on top. Set SEED_FORCE=true to seed " +
        "anyway, or demo from the\n  state shown above.\n"
    );
    return;
  }

  // 1) Fund the owner with SUSD to deposit (SolventUSD mint — testnet only).
  const balance = (await publicClient.readContract({
    address: USDC,
    abi: usdcAbi,
    functionName: "balanceOf",
    args: [account.address],
  })) as bigint;
  if (balance < DEPOSIT) {
    await send(`mint ${usd(DEPOSIT - balance)}`, {
      address: USDC,
      abi: usdcAbi,
      functionName: "mint",
      args: [account.address, DEPOSIT - balance],
    });
  }

  // 2) Approve + deposit into the vault.
  const allowance = (await publicClient.readContract({
    address: USDC,
    abi: usdcAbi,
    functionName: "allowance",
    args: [account.address, VAULT],
  })) as bigint;
  if (allowance < DEPOSIT) {
    await send(`approve ${usd(DEPOSIT)}`, {
      address: USDC,
      abi: usdcAbi,
      functionName: "approve",
      args: [VAULT, DEPOSIT],
    });
  }
  await send(`deposit ${usd(DEPOSIT)}`, {
    address: VAULT,
    abi: vaultAbi,
    functionName: "deposit",
    args: [DEPOSIT],
  });

  // 3) Create the three demo obligations.
  const now = Math.floor(Date.now() / 1000);
  for (const o of OBLIGATIONS) {
    const dueAt = BigInt(now + o.days * DAY);
    await send(`obligation "${o.label}" ${usd(o.amount)} due in ${o.days}d`, {
      address: REGISTRY,
      abi: registryAbi,
      functionName: "createObligation",
      args: [o.beneficiary, o.amount, dueAt, o.priority],
    });
  }

  // 4) Deploy all remaining deployable surplus -> "Deployable" reads $0, and
  // the treasury sits exactly at its protected floor, so the live urgent
  // obligation in the demo tips it straight into a shortfall.
  const deployable = (await publicClient.readContract({
    address: VAULT,
    abi: vaultAbi,
    functionName: "deployableCapital",
  })) as bigint;
  if (deployable > 0n) {
    await send(`deploy ${usd(deployable)} to strategy`, {
      address: VAULT,
      abi: vaultAbi,
      functionName: "deployToStrategy",
      args: [STRATEGY, deployable],
    });
  } else {
    log("SKIP", "nothing deployable to deploy");
  }

  printDashboard(await readDashboard());
  console.log(
    DRY_RUN
      ? "\n  Dry run complete — no transactions sent.\n"
      : "\n  Seed complete. In the demo, create a ~$100k urgent obligation to " +
          "trip the shortfall alert.\n"
  );
}

main().catch((e) => {
  console.error(`\n  SEED FAILED — ${errText(e)}\n`);
  process.exit(1);
});




