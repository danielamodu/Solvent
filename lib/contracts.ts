import { erc20Abi } from "viem";
import { arbitrumSepolia } from "wagmi/chains";

export { erc20Abi };

/** Target network for all vault reads/writes (Arbitrum Sepolia). */
export const CHAIN_ID = arbitrumSepolia.id;

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
] as const;

/** ABI for the ObligationRegistry — the read side of the liquidity engine. */
export const OBLIGATION_REGISTRY_ABI = [
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
] as const;

/** ABI for the MockStrategy adapter — the read side of a deployed position. */
export const MOCK_STRATEGY_ABI = [
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
] as const;

function parseAddress(value: string | undefined): `0x${string}` | undefined {
  return value && /^0x[0-9a-fA-F]{40}$/.test(value)
    ? (value as `0x${string}`)
    : undefined;
}

export const treasuryVaultAddress = parseAddress(
  process.env.NEXT_PUBLIC_TREASURY_VAULT_ADDRESS
);
export const usdcAddress = parseAddress(process.env.NEXT_PUBLIC_USDC_ADDRESS);
export const obligationRegistryAddress = parseAddress(
  process.env.NEXT_PUBLIC_OBLIGATION_REGISTRY_ADDRESS
);
export const mockStrategyAddress = parseAddress(
  process.env.NEXT_PUBLIC_MOCK_STRATEGY_ADDRESS
);
