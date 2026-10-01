import { config as loadEnv } from "dotenv";
import { createPublicClient, getAddress, http, isAddress, zeroAddress } from "viem";
import { arbitrumSepolia } from "viem/chains";

loadEnv();
const treasuryFactoryAddress = process.env.NEXT_PUBLIC_TREASURY_FACTORY_ADDRESS && isAddress(process.env.NEXT_PUBLIC_TREASURY_FACTORY_ADDRESS)
  ? getAddress(process.env.NEXT_PUBLIC_TREASURY_FACTORY_ADDRESS) : undefined;
const treasuryVaultAbi = [
  { type: "function", name: "obligationRegistry", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "owner", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "asset", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
] as const;
const OBLIGATION_REGISTRY_ABI = [{ type: "function", name: "vault", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] }] as const;

const failures: string[] = [];
if (!treasuryFactoryAddress) failures.push("NEXT_PUBLIC_TREASURY_FACTORY_ADDRESS is missing or malformed");
/** Official Aave V3 Arbitrum Sepolia USDC reserve — the factory must expose
 *  this constant to route Aave-backed treasuries; a pre-Aave factory reverts. */
const EXPECTED_AAVE_SEPOLIA_USDC = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";
function requiredAddress(key: string): `0x${string}` | undefined {
  const value = process.env[key];
  if (!value || !isAddress(value)) { failures.push(`${key} is missing or malformed`); return undefined; }
  return getAddress(value);
}

async function main() {
  const rpc = process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC;
  if (!rpc) throw new Error("NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC is required");
  const client = createPublicClient({ chain: arbitrumSepolia, transport: http(rpc) });
  const chain = await client.getChainId();
  if (chain !== arbitrumSepolia.id) failures.push(`RPC chain id is ${chain}; expected ${arbitrumSepolia.id}`);
  const vault = requiredAddress("NEXT_PUBLIC_TREASURY_VAULT_ADDRESS");
  const registry = requiredAddress("NEXT_PUBLIC_OBLIGATION_REGISTRY_ADDRESS");
  const asset = requiredAddress("NEXT_PUBLIC_USDC_ADDRESS");
  const strategy = process.env.NEXT_PUBLIC_MOCK_STRATEGY_ADDRESS ? requiredAddress("NEXT_PUBLIC_MOCK_STRATEGY_ADDRESS") : undefined;
  const factory = treasuryFactoryAddress;
  for (const [label, address] of [["vault", vault], ["registry", registry], ["asset", asset], ["factory", factory]] as const) {
    if (address) {
      const code = await client.getCode({ address });
      if (!code || code === "0x") failures.push(`${label} has no deployed bytecode`);
    }
  }
  if (vault && registry) {
    try {
      const [configuredRegistry, linkedVault, owner] = await Promise.all([
        client.readContract({ address: vault, abi: treasuryVaultAbi, functionName: "obligationRegistry" }),
        client.readContract({ address: registry, abi: OBLIGATION_REGISTRY_ABI, functionName: "vault" }),
        client.readContract({ address: vault, abi: treasuryVaultAbi, functionName: "owner" }),
      ]);
      if (configuredRegistry.toLowerCase() !== registry.toLowerCase()) failures.push("vault.obligationRegistry does not match NEXT_PUBLIC_OBLIGATION_REGISTRY_ADDRESS");
      if (linkedVault.toLowerCase() !== vault.toLowerCase()) failures.push("registry.vault does not point back to the configured vault");
      if (owner === zeroAddress) failures.push("vault owner is the zero address");
    } catch (error) { failures.push(`vault/registry read failed: ${error instanceof Error ? error.message : String(error)}`); }
  }
  if (vault && asset) {
    try {
      const configuredAsset = await client.readContract({ address: vault, abi: treasuryVaultAbi, functionName: "asset" });
      if (configuredAsset.toLowerCase() !== asset.toLowerCase()) failures.push("vault.asset does not match NEXT_PUBLIC_USDC_ADDRESS");
    } catch (error) { failures.push(`asset read failed: ${error instanceof Error ? error.message : String(error)}`); }
  }
  if (strategy) {
    try {
      const code = await client.getCode({ address: strategy });
      if (!code || code === "0x") failures.push("strategy has no deployed bytecode");
      const [strategyVault, strategyAsset] = await Promise.all([
        client.readContract({ address: strategy, abi: [{ type: "function", name: "vault", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] }], functionName: "vault" }),
        client.readContract({ address: strategy, abi: [{ type: "function", name: "asset", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] }], functionName: "asset" }),
      ]);
      if (vault && strategyVault.toLowerCase() !== vault.toLowerCase()) failures.push("strategy.vault does not match configured vault");
      if (asset && strategyAsset.toLowerCase() !== asset.toLowerCase()) failures.push("strategy.asset does not match configured token");
    } catch (error) { failures.push(`strategy read failed: ${error instanceof Error ? error.message : String(error)}`); }
  }
  if (factory) {
    try {
      const aaveUsdc = await client.readContract({
        address: factory,
        abi: [{ type: "function", name: "AAVE_SEPOLIA_USDC", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] }],
        functionName: "AAVE_SEPOLIA_USDC",
      });
      if (aaveUsdc.toLowerCase() !== EXPECTED_AAVE_SEPOLIA_USDC.toLowerCase()) {
        failures.push("factory AAVE_SEPOLIA_USDC does not match the official Arbitrum Sepolia USDC reserve — redeploy the factory before creating Aave-backed treasuries");
      }
    } catch {
      failures.push("factory does not expose AAVE_SEPOLIA_USDC — it predates the Aave integration; redeploy the factory before creating Aave-backed treasuries");
    }
  }
  if (process.env.KEEPER_HEARTBEAT_URL && (!process.env.KEEPER_HEARTBEAT_TOKEN || process.env.KEEPER_HEARTBEAT_TOKEN.length < 24)) failures.push("keeper heartbeat endpoint requires a token of at least 24 characters");
  if (!process.env.SOLVENT_DATABASE_PATH) console.log("NOTE: database defaults to .data/solvent.sqlite; production needs a persistent writable volume.");
  if (failures.length) {
    console.error("Release checks failed:\n- " + failures.join("\n- "));
    process.exitCode = 1;
    return;
  }
  console.log(`Read-only release checks passed on chain ${chain}. No transactions were sent.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
