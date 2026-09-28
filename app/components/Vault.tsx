"use client";

import { formatUnits } from "viem";
import { useAccount, useReadContract, useSwitchChain } from "wagmi";
import {
  CHAIN_ID,
  erc20Abi,
  MOCK_STRATEGY_ABI,
  mockStrategyAddress,
  OBLIGATION_REGISTRY_ABI,
  obligationRegistryAddress,
  treasuryVaultAbi,
  treasuryVaultAddress,
  usdcAddress,
} from "@/lib/contracts";
import { formatUSD } from "@/lib/format";
import { useObligations } from "@/lib/useObligations";
import { DepositCard } from "./DepositCard";
import { LiquidityTimeline } from "./LiquidityTimeline";
import { ObligationCard } from "./ObligationCard";
import { ShortfallAlert } from "./ShortfallAlert";
import { StrategyCard } from "./StrategyCard";
import { Skeleton } from "./ui";
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
  const outstanding = useReadContract({
    address: obligationRegistryAddress,
    abi: OBLIGATION_REGISTRY_ABI,
    functionName: "getOutstandingAmount",
    chainId: CHAIN_ID,
    query: { enabled: configured && Boolean(obligationRegistryAddress) },
  });
  const reserve = useReadContract({
    address: obligationRegistryAddress,
    abi: OBLIGATION_REGISTRY_ABI,
    functionName: "reserveRequirement",
    chainId: CHAIN_ID,
    query: { enabled: configured && Boolean(obligationRegistryAddress) },
  });
  const strategyValue = useReadContract({
    address: mockStrategyAddress,
    abi: MOCK_STRATEGY_ABI,
    functionName: "totalValue",
    chainId: CHAIN_ID,
    query: { enabled: configured && Boolean(mockStrategyAddress) },
  });

  const decimals = decimalsRead.data ?? 6;
  const isOwner =
    Boolean(address) &&
    typeof ownerRead.data === "string" &&
    address!.toLowerCase() === ownerRead.data.toLowerCase();

  const { obligations, refetch: refetchObligations } = useObligations();

  // Coverage = (idle balance + value held in strategy) / promised obligations.
  // Null when nothing is owed yet (all capital is deployable) or before the
  // idle balance has loaded, so the meter shows the "no obligations" state
  // instead of flashing 0%.
  const toNum = (v: bigint | undefined) =>
    v === undefined ? 0 : Number(formatUnits(v, decimals));
  const outstandingData = outstanding.data;
  const coverage =
    outstandingData !== undefined &&
    outstandingData > 0n &&
    available.data !== undefined
      ? ((toNum(available.data) + toNum(strategyValue.data)) /
          toNum(outstandingData)) *
        100
      : null;

  const refresh = () => {
    totalAssets.refetch();
    available.refetch();
    deployable.refetch();
    deployed.refetch();
    protectedLiquidity.refetch();
    outstanding.refetch();
    strategyValue.refetch();
  };

  // Wallet / network gating. The dashboard always renders (public reads work
  // without a wallet); only the action cards are locked until a wallet is
  // connected on the right chain.
  const wrongNetwork = isConnected && chainId !== CHAIN_ID;
  const canInteract = isConnected && !wrongNetwork;
  const interactionHint = !isConnected
    ? "Connect your wallet"
    : wrongNetwork
      ? "Switch to Arbitrum Sepolia"
      : undefined;

  // Surface read failures (RPC down/timeout) instead of a blank or stale board.
  const readError =
    totalAssets.isError ||
    available.isError ||
    deployable.isError ||
    deployed.isError ||
    protectedLiquidity.isError;

  if (!configured) {
    return (
      <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 text-sm text-neutral-400">
        Set <code className="text-neutral-200">NEXT_PUBLIC_TREASURY_VAULT_ADDRESS</code> and{" "}
        <code className="text-neutral-200">NEXT_PUBLIC_USDC_ADDRESS</code> in your env, then
        rebuild to connect the vault.
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      {readError && (
        <div className="rounded-xl border border-red-600/40 bg-red-950/30 p-4">
          <div className="text-sm font-semibold text-red-300">
            Unable to fetch data
          </div>
          <p className="mt-1 text-xs text-red-200/80">
            Retrying… confirm your connection to Arbitrum Sepolia.
          </p>
        </div>
      )}

      {!isConnected && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-400">
          Connect a wallet to deposit, withdraw, or manage obligations — live
          treasury data is shown below.
        </div>
      )}

      {wrongNetwork && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-600/40 bg-amber-950/30 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-amber-300">
              Wrong network
            </div>
            <p className="mt-1 text-xs text-amber-200/80">
              This app runs on Arbitrum Sepolia. Switch networks to interact
              with the vault.
            </p>
          </div>
          <button
            onClick={() => switchChain({ chainId: CHAIN_ID })}
            className="shrink-0 rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-neutral-900"
          >
            Switch to Arbitrum Sepolia
          </button>
        </div>
      )}

      <LiquidityTimeline
        totalAssets={totalAssets.data}
        totalDeployed={deployed.data}
        deployableCapital={deployable.data}
        reserveRequirement={reserve.data}
        outstandingAmount={outstanding.data}
        coverage={coverage}
        decimals={decimals}
        obligations={obligations}
      />

      <div className="grid grid-cols-2 gap-4">
        <Stat
          label="Total assets"
          value={totalAssets.data}
          decimals={decimals}
          loading={totalAssets.isLoading}
        />
        <Stat
          label="Protected liquidity"
          value={protectedLiquidity.data}
          decimals={decimals}
          loading={protectedLiquidity.isLoading}
        />
        <Stat
          label="Deployed"
          value={deployed.data}
          decimals={decimals}
          loading={deployed.isLoading}
        />
        <Stat
          label="Available balance"
          value={available.data}
          decimals={decimals}
          loading={available.isLoading}
        />
      </div>

      {obligationRegistryAddress && (
        <ObligationCard
          decimals={decimals}
          isOwner={isOwner}
          obligations={obligations}
          refetch={refetchObligations}
          onChange={refresh}
          disabled={!canInteract}
          disabledReason={interactionHint}
        />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <DepositCard
          decimals={decimals}
          onChange={refresh}
          disabled={!canInteract}
          disabledReason={interactionHint}
        />
        <WithdrawCard
          decimals={decimals}
          isOwner={isOwner}
          onChange={refresh}
          disabled={!canInteract}
          disabledReason={interactionHint}
        />
        {mockStrategyAddress && (
          <StrategyCard
            decimals={decimals}
            isOwner={isOwner}
            onChange={refresh}
            deployableCapital={deployable.data}
            disabled={!canInteract}
            disabledReason={interactionHint}
          />
        )}
      </div>
      <KeeperStatus />
      <ShortfallAlert
        protectedLiquidity={protectedLiquidity.data}
        availableBalance={available.data}
        totalDeployed={deployed.data}
        decimals={decimals}
        isOwner={isOwner && canInteract}
        onChange={refresh}
      />
    </section>
  );
}

function Stat({
  label,
  value,
  decimals,
  loading,
}: {
  label: string;
  value: bigint | undefined;
  decimals: number;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">
        {loading ? (
          <Skeleton className="h-6 w-24" />
        ) : (
          formatUSD(value, decimals)
        )}
      </div>
    </div>
  );
}

// Static placeholder — the keeper is a standalone off-chain process (see
// /keeper), not wired to the app yet. Shows judges the automation exists.
function KeeperStatus() {
  return (
    <div className="flex items-center gap-2 px-1 text-xs text-neutral-500">
      <span className="h-2 w-2 rounded-full bg-neutral-600" aria-hidden />
      <span className="font-medium text-neutral-400">Keeper</span>
      <span>Not running · runs as a separate off-chain process</span>
    </div>
  );
}
