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
import { Rocket } from "lucide-react";

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
    <div className="neo-card p-5">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-black bg-[#b7c6c2]">
          <Rocket className="h-5 w-5 text-black" aria-hidden="true" />
        </span>
        <div>
          <h2 className="cabinet text-sm uppercase tracking-tight">Strategy position</h2>
          <p className="mt-0.5 text-xs font-semibold text-black/50">
            {isOwner
              ? "Owner only — deploy surplus to the strategy or recall it back."
              : "Only the vault owner can deploy or recall capital."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="border-2 border-black bg-black/5 p-3">
          <div className="neo-label">Principal deployed</div>
          <div className="cabinet text-base tabular-nums">
            {formatUSD(position.data, decimals)}
          </div>
        </div>
        <div className="border-2 border-black bg-black/5 p-3">
          <div className="neo-label">Current strategy value</div>
          <div className="cabinet text-base tabular-nums">
            {formatUSD(value.data, decimals)}
          </div>
        </div>
        <div className="border-2 border-black bg-black/5 p-3">
          <div className="neo-label">Available liquidity</div>
          <div className="cabinet text-base tabular-nums">
            {formatUSD(liquidity.data, decimals)}
          </div>
        </div>
        {(accruedYield.data ?? 0n) > 0n && <div className="border-2 border-black bg-black/5 p-3"><div className="neo-label">Unharvested Aave yield</div><div className="cabinet text-base tabular-nums text-[#10b981]">{formatUSD(accruedYield.data, decimals)}</div></div>}
      </div>
      {isOwner && (accruedYield.data ?? 0n) > 0n && <button type="button" onClick={() => harvest.writeContract({ address: vault, abi: treasuryVaultAbi, functionName: "harvestStrategyYield", args: [strategy], chainId: CHAIN_ID })} disabled={disabled || busy} className="neo-btn neo-btn-secondary mt-2 w-full"><BusyLabel busy={harvest.isPending || harvest.isConfirming}>{harvest.isPending ? "Confirm…" : harvest.isConfirming ? "Harvesting…" : "Harvest yield to vault"}</BusyLabel></button>}
      {nothingDeployed && (
        <p className="mt-2 text-[11px] text-black/50">
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
        className="neo-input cabinet mt-3 text-lg"
      />
      {deployableCapital !== undefined && deployableCapital > 0n && <button type="button" onClick={() => setAmount(formatUnits(deployableCapital, decimals))} disabled={!isOwner || disabled} className="mt-2 text-xs font-bold text-black underline decoration-2 underline-offset-2 hover:opacity-60 disabled:opacity-40">Use safe maximum · {formatUSD(deployableCapital, decimals)}</button>}
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
          className="neo-btn neo-btn-primary w-full"
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
          className="neo-btn neo-btn-secondary w-full"
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
        <p className="mt-2 text-xs font-bold text-[#ef4444]">
          Deploy exceeds deployable capital ({formatUSD(deployableCapital, decimals)}).
        </p>
      )}
      {exceedsPosition && (
        <p className="mt-2 text-xs font-bold text-[#ef4444]">
          Recall exceeds deployed position ({formatUSD(position.data, decimals)}).
        </p>
      )}
      {exceedsLiquidity && !exceedsPosition && (
        <p className="mt-2 text-xs font-bold text-[#ef4444]">
          Recall exceeds currently withdrawable strategy liquidity ({formatUSD(liquidity.data, decimals)}).
        </p>
      )}
      <TxFeedback tx={activeTx} />
    </div>
  );
}
