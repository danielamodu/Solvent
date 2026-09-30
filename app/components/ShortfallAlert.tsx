"use client";

import {
  CHAIN_ID,
  treasuryVaultAbi,
} from "@/lib/contracts";
import { useTreasury } from "@/lib/treasury-context";
import { formatUSD } from "@/lib/format";
import { useTx } from "@/lib/useTx";
import { BusyLabel, TxFeedback } from "./ui";

/**
 * Surfaces a liquidity shortfall: when protected liquidity (reserve + promised
 * obligations) exceeds the idle balance, the treasury must recall deployed
 * capital before it can meet those promises. Offers a one-click recall of the
 * exact deficit (capped at what's actually deployed).
 */
export function ShortfallAlert({
  protectedLiquidity,
  availableBalance,
  totalDeployed,
  strategyLiquidity,
  decimals,
  isOwner,
  onChange,
}: {
  protectedLiquidity: bigint | undefined;
  availableBalance: bigint | undefined;
  totalDeployed: bigint | undefined;
  strategyLiquidity: bigint | undefined;
  decimals: number;
  isOwner: boolean;
  onChange: () => void;
}) {
  const { treasury } = useTreasury();
  const recall = useTx(onChange);

  if (protectedLiquidity === undefined || availableBalance === undefined) {
    return null;
  }

  const shortfall =
    protectedLiquidity > availableBalance
      ? protectedLiquidity - availableBalance
      : 0n;

  const deployed = totalDeployed ?? 0n;
  const liquidInStrategy = strategyLiquidity ?? 0n;
  const maxRecall = deployed < liquidInStrategy ? deployed : liquidInStrategy;
  const recallable = maxRecall < shortfall ? maxRecall : shortfall;
  const uncovered = shortfall - recallable;

  if (shortfall === 0n) return null;

  const canRecall = isOwner && Boolean(treasury?.strategy);
  const busy = recall.isPending || recall.isConfirming;

  return (
    <section className="rounded-xl border border-amber-600/40 bg-amber-950/30 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-amber-300">
            Liquidity shortfall
          </div>
          <p className="mt-1 text-xs text-amber-200/80">
            Protected liquidity exceeds idle cash by {formatUSD(shortfall, decimals)}.
            {recallable > 0n && <> Recall up to {formatUSD(recallable, decimals)} from the strategy.</>}
            {uncovered > 0n && <> {formatUSD(uncovered, decimals)} remains uncovered after all currently liquid strategy funds are recalled. Add funds or reduce/cancel obligations.</>}
          </p>
        </div>
        {canRecall && recallable > 0n && (
          <button
            onClick={() =>
              recall.writeContract({
                address: treasury!.vault,
                abi: treasuryVaultAbi,
                functionName: "recallFromStrategy",
                args: [treasury!.strategy!, recallable],
                chainId: CHAIN_ID,
              })
            }
            disabled={busy}
            className="shrink-0 rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-40"
          >
            <BusyLabel busy={busy}>
              {recall.isPending
                ? "Confirm in wallet…"
                : recall.isConfirming
                  ? "Recalling…"
                  : `Recall ${formatUSD(recallable, decimals)}`}
            </BusyLabel>
          </button>
        )}
      </div>
      <TxFeedback tx={recall} />
    </section>
  );
}
