"use client";

import { useState } from "react";
import { parseUnits } from "viem";
import { useReadContract } from "wagmi";
import {
  CHAIN_ID,
  MOCK_STRATEGY_ABI,
  mockStrategyAddress,
  treasuryVaultAbi,
  treasuryVaultAddress,
} from "@/lib/contracts";
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

  const vault = treasuryVaultAddress!;
  const strategy = mockStrategyAddress!;
  const afterTx = () => {
    position.refetch();
    liquidity.refetch();
    onChange();
  };
  const deploy = useTx(afterTx);
  const recall = useTx(afterTx);

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

  let parsed: bigint | null = null;
  try {
    parsed = amount ? parseUnits(amount, decimals) : null;
  } catch {
    parsed = null;
  }

  const busy = deploy.isPending || deploy.isConfirming || recall.isPending || recall.isConfirming;
  const hint = disabled ? disabledReason : undefined;
  const canAct = isOwner && !disabled && parsed !== null && parsed !== 0n && !busy;

  const exceedsDeployable =
    parsed !== null && deployableCapital !== undefined && parsed > deployableCapital;
  const exceedsPosition =
    parsed !== null && position.data !== undefined && parsed > position.data;
  const nothingDeployed = position.data === 0n;
  const activeTx =
    recall.hash || recall.errorMessage || recall.cancelled ? recall : deploy;

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
          <div className="text-[11px] text-neutral-500">Available liquidity</div>
          <div className="mt-0.5 text-sm font-semibold tabular-nums">
            {formatUSD(liquidity.data, decimals)}
          </div>
        </div>
      </div>
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
          disabled={!canAct || exceedsPosition}
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
      <TxFeedback tx={activeTx} />
    </div>
  );
}
