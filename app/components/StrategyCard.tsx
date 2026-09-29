"use client";

import { useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { useReadContract } from "wagmi";
import {
  CHAIN_ID,
  MOCK_STRATEGY_ABI,
  treasuryVaultAbi,
} from "@/lib/contracts";
import { useTreasury } from "@/lib/treasury-context";
import { formatUSD } from "@/lib/format";
import { useTx } from "@/lib/useTx";
import { BusyLabel, TxFeedback } from "./ui";

export function StrategyCard({
  decimals,
  isOwner,
  onChange,
  deployableCapital,
  disabled = false,
  disabledReason,
}: {
  decimals: number;
  isOwner: boolean;
  onChange: () => void;
  deployableCapital?: bigint;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [amount, setAmount] = useState("");
  const { treasury } = useTreasury();

  const vault = treasury!.vault;
  const strategy = treasury!.strategy!;
  const afterTx = () => {
    position.refetch();
    liquidity.refetch();
    onChange();
  };
  const deploy = useTx(afterTx);
  const recall = useTx(afterTx);
  const harvest = useTx(afterTx);

  const position = useReadContract({
    address: vault,
    abi: treasuryVaultAbi,
    functionName: "strategyPositions",
    args: [strategy],
    chainId: CHAIN_ID,
  });
  const liquidity = useReadContract({
    address: strategy,
    abi: MOCK_STRATEGY_ABI,
    functionName: "availableLiquidity",
    chainId: CHAIN_ID,
  });
  const value = useReadContract({
    address: strategy,
    abi: MOCK_STRATEGY_ABI,
    functionName: "totalValue",
    chainId: CHAIN_ID,
  });
  const accruedYield = useReadContract({
    address: strategy,
    abi: MOCK_STRATEGY_ABI,
    functionName: "claimableYield",
    chainId: CHAIN_ID,
  });

  let parsed: bigint | null = null;
  try {
    parsed = amount ? parseUnits(amount, decimals) : null;
  } catch {
    parsed = null;
  }

  const busy = deploy.isPending || deploy.isConfirming || recall.isPending || recall.isConfirming || harvest.isPending || harvest.isConfirming;
  const hint = disabled ? disabledReason : undefined;
  const canAct = isOwner && !disabled && parsed !== null && parsed !== 0n && !busy;

  const exceedsDeployable =
    parsed !== null && deployableCapital !== undefined && parsed > deployableCapital;
  const exceedsPosition =
    parsed !== null && position.data !== undefined && parsed > position.data;
  const exceedsLiquidity =
    parsed !== null && liquidity.data !== undefined && parsed > liquidity.data;
  const nothingDeployed = position.data === 0n;
  const activeTx =
    harvest.hash || harvest.errorMessage || harvest.cancelled
      ? harvest
      : recall.hash || recall.errorMessage || recall.cancelled
        ? recall
        : deploy;

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <h2 className="text-sm font-medium text-neutral-200">Strategy position</h2>
      <p className="mt-1 text-xs text-neutral-500">
        {isOwner
          ? "Owner only — deploy surplus to the strategy or recall it back."
          : "Only the vault owner can deploy or recall capital."}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-neutral-800 px-3 py-2">
          <div className="text-[11px] text-neutral-500">Principal deployed</div>
          <div className="mt-0.5 text-sm font-semibold tabular-nums">
            {formatUSD(position.data, decimals)}
          </div>
        </div>
        <div className="rounded-lg bg-neutral-800 px-3 py-2">
          <div className="text-[11px] text-neutral-500">Current strategy value</div>
          <div className="mt-0.5 text-sm font-semibold tabular-nums">
            {formatUSD(value.data, decimals)}
          </div>
        </div>
        <div className="rounded-lg bg-neutral-800 px-3 py-2">
          <div className="text-[11px] text-neutral-500">Available liquidity</div>
          <div className="mt-0.5 text-sm font-semibold tabular-nums">
            {formatUSD(liquidity.data, decimals)}
          </div>
        </div>
      </div>
      {(accruedYield.data ?? 0n) > 0n && <div className="mt-2 flex items-center justify-between rounded-lg border border-emerald-900 bg-emerald-950/30 px-3 py-2 text-xs"><span className="text-emerald-300">Unharvested Aave yield</span><span className="font-semibold tabular-nums text-emerald-200">{formatUSD(accruedYield.data, decimals)}</span></div>}
      {isOwner && (accruedYield.data ?? 0n) > 0n && <button type="button" onClick={() => harvest.writeContract({ address: vault, abi: treasuryVaultAbi, functionName: "harvestStrategyYield", args: [strategy], chainId: CHAIN_ID })} disabled={disabled || busy} className="mt-2 w-full rounded-lg border border-emerald-800 px-4 py-2 text-sm font-medium text-emerald-200 disabled:opacity-40"><BusyLabel busy={harvest.isPending || harvest.isConfirming}>{harvest.isPending ? "Confirm…" : harvest.isConfirming ? "Harvesting…" : "Harvest yield to vault"}</BusyLabel></button>}
      {nothingDeployed && (
        <p className="mt-2 text-[11px] text-neutral-500">
          No capital deployed — surplus sits idle in the vault.
        </p>
      )}

      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0.0"
        inputMode="decimal"
        disabled={!isOwner || disabled}
        title={hint}
        className="mt-3 w-full rounded-lg bg-neutral-800 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-neutral-600 disabled:opacity-50"
      />
      {deployableCapital !== undefined && deployableCapital > 0n && <button type="button" onClick={() => setAmount(formatUnits(deployableCapital, decimals))} disabled={!isOwner || disabled} className="mt-2 text-xs font-semibold text-blue-700 underline underline-offset-2 disabled:opacity-40">Use safe maximum · {formatUSD(deployableCapital, decimals)}</button>}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() =>
            parsed !== null &&
            deploy.writeContract({
              address: vault,
              abi: treasuryVaultAbi,
              functionName: "deployToStrategy",
              args: [strategy, parsed],
              chainId: CHAIN_ID,
            })
          }
          disabled={!canAct || exceedsDeployable}
          title={hint}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-40"
        >
          <BusyLabel busy={deploy.isPending || deploy.isConfirming}>
            {deploy.isPending
              ? "Confirm…"
              : deploy.isConfirming
                ? "Deploying…"
                : "Deploy"}
          </BusyLabel>
        </button>
        <button
          onClick={() =>
            parsed !== null &&
            recall.writeContract({
              address: vault,
              abi: treasuryVaultAbi,
              functionName: "recallFromStrategy",
              args: [strategy, parsed],
              chainId: CHAIN_ID,
            })
          }
          disabled={!canAct || exceedsPosition || exceedsLiquidity}
          title={hint}
          className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-200 disabled:opacity-40"
        >
          <BusyLabel busy={recall.isPending || recall.isConfirming}>
            {recall.isPending
              ? "Confirm…"
              : recall.isConfirming
                ? "Recalling…"
                : "Recall"}
          </BusyLabel>
        </button>
      </div>
      {exceedsDeployable && (
        <p className="mt-2 text-xs text-red-400">
          Deploy exceeds deployable capital ({formatUSD(deployableCapital, decimals)}).
        </p>
      )}
      {exceedsPosition && (
        <p className="mt-2 text-xs text-red-400">
          Recall exceeds deployed position ({formatUSD(position.data, decimals)}).
        </p>
      )}
      {exceedsLiquidity && !exceedsPosition && (
        <p className="mt-2 text-xs text-red-400">
          Recall exceeds currently withdrawable strategy liquidity ({formatUSD(liquidity.data, decimals)}).
        </p>
      )}
      <TxFeedback tx={activeTx} />
    </div>
  );
}
