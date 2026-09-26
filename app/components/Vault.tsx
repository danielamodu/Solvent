"use client";

import { formatUnits } from "viem";
import { useAccount, useReadContract, useSwitchChain } from "wagmi";
import {
  CHAIN_ID,
  erc20Abi,
  mockStrategyAddress,
  OBLIGATION_REGISTRY_ABI,
  obligationRegistryAddress,
  treasuryVaultAbi,
  treasuryVaultAddress,
  usdcAddress,
} from "@/lib/contracts";
import { DepositCard } from "./DepositCard";
import { StrategyCard } from "./StrategyCard";
import { WithdrawCard } from "./WithdrawCard";

export function Vault() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();

  const configured = Boolean(treasuryVaultAddress && usdcAddress);

  const totalAssets = useReadContract({
    address: treasuryVaultAddress,
    abi: treasuryVaultAbi,
    functionName: "totalAssets",
    chainId: CHAIN_ID,
    query: { enabled: configured },
  });
  const available = useReadContract({
    address: treasuryVaultAddress,
    abi: treasuryVaultAbi,
    functionName: "availableBalance",
    chainId: CHAIN_ID,
    query: { enabled: configured },
  });
  const deployable = useReadContract({
    address: treasuryVaultAddress,
    abi: treasuryVaultAbi,
    functionName: "deployableCapital",
    chainId: CHAIN_ID,
    query: { enabled: configured },
  });
  const deployed = useReadContract({
    address: treasuryVaultAddress,
    abi: treasuryVaultAbi,
    functionName: "totalDeployed",
    chainId: CHAIN_ID,
    query: { enabled: configured },
  });
  const protectedLiquidity = useReadContract({
    address: obligationRegistryAddress,
    abi: OBLIGATION_REGISTRY_ABI,
    functionName: "protectedLiquidity",
    chainId: CHAIN_ID,
    query: { enabled: configured && Boolean(obligationRegistryAddress) },
  });
  const ownerRead = useReadContract({
    address: treasuryVaultAddress,
    abi: treasuryVaultAbi,
    functionName: "owner",
    chainId: CHAIN_ID,
    query: { enabled: configured },
  });
  const decimalsRead = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: "decimals",
    chainId: CHAIN_ID,
    query: { enabled: configured },
  });

  const decimals = decimalsRead.data ?? 6;
  const isOwner =
    Boolean(address) &&
    typeof ownerRead.data === "string" &&
    address!.toLowerCase() === ownerRead.data.toLowerCase();

  const refresh = () => {
    totalAssets.refetch();
    available.refetch();
    deployable.refetch();
    deployed.refetch();
    protectedLiquidity.refetch();
  };

  if (!configured) {
    return (
      <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 text-sm text-neutral-400">
        Set <code className="text-neutral-200">NEXT_PUBLIC_TREASURY_VAULT_ADDRESS</code> and{" "}
        <code className="text-neutral-200">NEXT_PUBLIC_USDC_ADDRESS</code> in your env, then
        rebuild to connect the vault.
      </section>
    );
  }

  if (!isConnected) {
    return (
      <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 text-sm text-neutral-400">
        Connect a wallet to deposit or withdraw.
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Stat label="Total assets" value={fmt(totalAssets.data, decimals)} />
        <Stat label="Available" value={fmt(available.data, decimals)} />
        <Stat label="Deployed" value={fmt(deployed.data, decimals)} />
        <Stat label="Protected liquidity" value={fmt(protectedLiquidity.data, decimals)} />
        <Stat label="Deployable capital" value={fmt(deployable.data, decimals)} />
      </div>

      {chainId !== CHAIN_ID ? (
        <button
          onClick={() => switchChain({ chainId: CHAIN_ID })}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-900"
        >
          Switch to Arbitrum Sepolia
        </button>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <DepositCard decimals={decimals} onChange={refresh} />
          <WithdrawCard decimals={decimals} isOwner={isOwner} onChange={refresh} />
          {mockStrategyAddress && (
            <StrategyCard decimals={decimals} isOwner={isOwner} onChange={refresh} />
          )}
        </div>
      )}
    </section>
  );
}

function fmt(value: bigint | undefined, decimals: number) {
  return value !== undefined ? `${formatUnits(value, decimals)} USDC` : "—";
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
