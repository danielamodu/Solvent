import { erc20Abi } from "viem";
import { arbitrumSepolia } from "wagmi/chains";

export { erc20Abi };

/** Target network for all vault reads/writes (Arbitrum Sepolia). */
export const CHAIN_ID = arbitrumSepolia.id;

/** Factory deployed once per network; each team discovers treasuries by owner. */
export const treasuryFactoryAbi = [
  {
    type: "event",
    name: "TreasuryCreated",
    anonymous: false,
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "vault", type: "address", indexed: true },
      { name: "registry", type: "address", indexed: true },
      { name: "strategy", type: "address", indexed: false },
      { name: "asset", type: "address", indexed: false },
      { name: "reserveRequirement", type: "uint256", indexed: false },
    ],
  },
  {
    type: "function",
    name: "createTreasury",
    stateMutability: "nonpayable",
    inputs: [
      { name: "asset", type: "address" },
      { name: "reserveRequirement", type: "uint256" },
    ],
    outputs: [
      { name: "vaultAddress", type: "address" },
      { name: "registryAddress", type: "address" },
      { name: "strategyAddress", type: "address" },
    ],
  },
  {
    type: "function",
    name: "getTreasuries",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    type: "function",
    name: "registryForVault",
    stateMutability: "view",
    inputs: [{ name: "vault", type: "address" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "strategyForVault",
    stateMutability: "view",
    inputs: [{ name: "vault", type: "address" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

/** ABI for the deployed TreasuryVault (matches ITreasuryVault + Ownable getters). */
export const treasuryVaultAbi = [
  {
    type: "event",
    name: "Deposited",
    anonymous: false,
    inputs: [
      { name: "depositor", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Withdrawn",
    anonymous: false,
    inputs: [
      { name: "recipient", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "StrategyDeployed",
    anonymous: false,
    inputs: [
      { name: "strategy", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "StrategyRecalled",
    anonymous: false,
    inputs: [
      { name: "strategy", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "function",
    name: "deposit",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "recipient", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "totalAssets",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "availableBalance",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "deployableCapital",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "asset",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "obligationRegistry",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "totalDeployed",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "strategyPositions",
    stateMutability: "view",
    inputs: [{ name: "strategy", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "recallFromStrategy",
    stateMutability: "nonpayable",
    inputs: [
      { name: "strategy", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "harvestStrategyYield",
    stateMutability: "nonpayable",
    inputs: [
      { name: "strategy", type: "address" },
    ],
    outputs: [{ name: "amount", type: "uint256" }],
  },
  {
    type: "function",
    name: "deployToStrategy",
    stateMutability: "nonpayable",
    inputs: [
      { name: "strategy", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

/** ABI for the ObligationRegistry — the read side of the liquidity engine. */
export const OBLIGATION_REGISTRY_ABI = [
  {
    type: "event",
    name: "ObligationCreated",
    anonymous: false,
    inputs: [
      { name: "id", type: "bytes32", indexed: true },
      { name: "beneficiary", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
      { name: "dueAt", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ObligationCancelled",
    anonymous: false,
    inputs: [{ name: "id", type: "bytes32", indexed: true }],
  },
  {
    type: "event",
    name: "ObligationSettled",
    anonymous: false,
    inputs: [{ name: "id", type: "bytes32", indexed: true }],
  },
  {
    type: "function",
    name: "createObligation",
    stateMutability: "nonpayable",
    inputs: [
      { name: "beneficiary", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "dueAt", type: "uint256" },
      { name: "priority", type: "uint8" },
    ],
    outputs: [{ name: "id", type: "bytes32" }],
  },
  {
    type: "function",
    name: "cancelObligation",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "settleObligation",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "obligations",
    stateMutability: "view",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [
      { name: "id", type: "bytes32" },
      { name: "beneficiary", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "dueAt", type: "uint256" },
      { name: "priority", type: "uint8" },
      { name: "status", type: "uint8" },
    ],
  },
  {
    type: "function",
    name: "protectedLiquidity",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getOutstandingAmount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "reserveRequirement",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "vault",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

/** Priority enum (matches IObligationRegistry.Priority ordering). */
export const PRIORITY = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
export const PRIORITY_LABELS = ["HIGH", "MEDIUM", "LOW"] as const;

/** Status enum (matches IObligationRegistry.Status ordering). */
export const STATUS_LABELS = [
  "PENDING",
  "FUNDED",
  "SETTLED",
  "CANCELLED",
  "DEFAULTED",
] as const;

/** ABI for the MockStrategy adapter — the read side of a deployed position. */
export const MOCK_STRATEGY_ABI = [
  {
    type: "function",
    name: "vault",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "asset",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "totalValue",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "availableLiquidity",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "claimableYield",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

function parseAddress(value: string | undefined): `0x${string}` | undefined {
  return value && /^0x[0-9a-fA-F]{40}$/.test(value)
    ? (value as `0x${string}`)
    : undefined;
}

export const treasuryVaultAddress = parseAddress(
  process.env.NEXT_PUBLIC_TREASURY_VAULT_ADDRESS
);
export const treasuryFactoryAddress = parseAddress(
  process.env.NEXT_PUBLIC_TREASURY_FACTORY_ADDRESS
);
export const usdcAddress = parseAddress(process.env.NEXT_PUBLIC_USDC_ADDRESS);
export const obligationRegistryAddress = parseAddress(
  process.env.NEXT_PUBLIC_OBLIGATION_REGISTRY_ADDRESS
);
export const mockStrategyAddress = parseAddress(
  process.env.NEXT_PUBLIC_MOCK_STRATEGY_ADDRESS
);

/** Block the registry was deployed at — the `fromBlock` for scanning
 *  ObligationCreated logs, so the public RPC isn't asked to scan from genesis. */
export const obligationRegistryDeployBlock: bigint = (() => {
  const raw = process.env.NEXT_PUBLIC_OBLIGATION_REGISTRY_DEPLOY_BLOCK;
  try {
    return raw ? BigInt(raw) : 0n;
  } catch {
    return 0n;
  }
})();
