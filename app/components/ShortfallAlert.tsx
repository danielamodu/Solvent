"use client";

import {
  CHAIN_ID,
  mockStrategyAddress,
  treasuryVaultAbi,
  treasuryVaultAddress,
} from "@/lib/contracts";
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
  decimals,
  isOwner,
  onChange,
}: {
  protectedLiquidity: bigint | undefined;
  availableBalance: bigint | undefined;
  totalDeployed: bigint | undefined;
  decimals: number;
  isOwner: boolean;
  onChange: () => void;
}) {
  const recall = useTx(onChange);

  if (protectedLiquidity === undefined || availableBalance === undefined) {
    return null;
  }

  const shortfall =
    protectedLiquidity > availableBalance
      ? protectedLiquidity - availableBalance
      : 0n;

  const deployed = totalDeployed ?? 0n;
  const recallable = deployed < shortfall ? deployed : shortfall;

  // Only surface the alert when recalling deployed capital would actually help
  // cover the deficit — otherwise the stats already tell the story and there is
  // no action to offer (e.g. an empty vault whose reserve exceeds its balance).
  if (recallable === 0n) return null;

  const canRecall = isOwner && Boolean(mockStrategyAddress);
  const busy = recall.isPending || recall.isConfirming;

  return (
    <section className="rounded-xl border border-amber-600/40 bg-amber-950/30 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-amber-300">
            Liquidity shortfall
          </div>
          <p className="mt-1 text-xs text-amber-200/80">
            Protected liquidity exceeds the idle balance by{" "}
            {formatUSD(shortfall, decimals)}. Recall{" "}
            {formatUSD(recallable, decimals)} from the strategy to cover
            obligations.
          </p>
        </div>
        {canRecall && (
          <button
            onClick={() =>
              recall.writeContract({
                address: treasuryVaultAddress!,
                abi: treasuryVaultAbi,
                functionName: "recallFromStrategy",
                args: [mockStrategyAddress!, recallable],
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
