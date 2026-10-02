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
    <section className="border-2 border-l-4 border-black border-l-[#ef4444] bg-white p-4 text-black">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="cabinet text-sm uppercase tracking-tight text-[#ef4444]">
            Liquidity shortfall
          </div>
          <p className="mt-1 text-xs text-black/70">
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
            className="neo-btn neo-btn-primary shrink-0"
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
