"use client";

import {
  formatDueDate,
  formatUSD,
  relativeDue,
  shortenAddress,
} from "@/lib/format";
import { RiskBadge, riskLevel } from "./RiskBadge";
import type { ObligationRecord } from "@/lib/useObligations";

type Props = {
  totalAssets?: bigint;
  totalDeployed?: bigint;
  deployableCapital?: bigint;
  reserveRequirement?: bigint;
  outstandingAmount?: bigint;
  availableBalance?: bigint;
  strategyLiquidity?: bigint;
  strategyPosition?: bigint;
  coverage: number | null;
  decimals: number;
  obligations: ObligationRecord[];
};

const COVERAGE_TEXT: Record<"green" | "amber" | "red", string> = {
  green: "text-[#10b981]",
  amber: "text-[#b45309]",
  red: "text-[#ef4444]",
};

const PRIORITY_DOT = ["bg-[#ef4444]", "bg-[#f59e0b]", "bg-[#171e19]"] as const;

export function LiquidityTimeline({
  totalAssets,
  totalDeployed,
  deployableCapital,
  reserveRequirement,
  outstandingAmount,
  availableBalance,
  strategyLiquidity,
  strategyPosition,
  coverage,
  decimals,
  obligations,
}: Props) {
  const reserve = reserveRequirement ?? 0n;
  const outstanding = outstandingAmount ?? 0n;
  const deployed = totalDeployed ?? 0n;
  const deployable = deployableCapital ?? 0n;
  const hasAssets = (totalAssets ?? 0n) > 0n;

  // Segments partition committed capital. In a healthy treasury they sum to
  // totalAssets exactly; when protected + deployed exceed assets (deployable
  // floored at 0) the sum exceeds totalAssets, so we normalise by the sum to
  // keep the bar within 100% and let the vanishing green tell the story.
  const denom = reserve + outstanding + deployed + deployable;
  const pct = (v: bigint) => (denom > 0n ? (Number(v) / Number(denom)) * 100 : 0);
  const fmt = (v?: bigint) => formatUSD(v, decimals);

  const pending = obligations
    .filter((o) => o.status === 0)
    .sort((a, b) => (a.dueAt < b.dueAt ? -1 : a.dueAt > b.dueAt ? 1 : 0));
  let cumulative = 0n;
  const idle = availableBalance ?? 0n;
  const recoverable = strategyPosition !== undefined && strategyLiquidity !== undefined
    ? (strategyPosition < strategyLiquidity ? strategyPosition : strategyLiquidity)
    : 0n;

  const coverageText = COVERAGE_TEXT[riskLevel(coverage)];

  const segments = [
    { key: "Reserve", value: reserve, color: "bg-[#b7c6c2]" },
    { key: "Obligations", value: outstanding, color: "bg-[#ef4444]" },
    { key: "Deployed", value: deployed, color: "bg-[#171e19]" },
    { key: "Deployable", value: deployable, color: "bg-[#ffe17c]" },
  ];

  return (
    <section className="neo-card-lg p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="neo-label">Liquidity coverage</div>
          {coverage === null ? (
            <div className="mt-1 cabinet text-lg text-[#10b981]">
              No obligations — all capital deployable
            </div>
          ) : (
            <div
              className={`mt-1 cabinet text-5xl tabular-nums transition-colors duration-300 ${coverageText}`}
            >
              {coverage > 999 ? ">999%" : `${Math.round(coverage)}%`}
            </div>
          )}
        </div>
        <RiskBadge coverage={coverage} />
      </div>
      <div className="mt-5">
        {hasAssets ? (
          <div className="flex h-6 w-full overflow-hidden border-2 border-black bg-black/10">
            {segments.map((s) =>
              s.value > 0n ? (
                <div
                  key={s.key}
                  className={`${s.color} h-full transition-[width] duration-500 ease-out`}
                  style={{ width: `${pct(s.value)}%` }}
                  title={`${s.key}: ${fmt(s.value)}`}
                />
              ) : null
            )}
          </div>
        ) : (
          <div className="flex h-6 w-full items-center justify-center border-2 border-black bg-black/5 text-[10px] font-bold uppercase tracking-wide text-black/40">
            No assets deposited yet
          </div>
        )}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-black/50">
          <Legend color="bg-[#b7c6c2]" label="Reserve" value={fmt(reserve)} />
          <Legend color="bg-[#ef4444]" label="Obligations" value={fmt(outstanding)} />
          <Legend color="bg-[#171e19]" label="Deployed" value={fmt(deployed)} />
          <Legend color="bg-[#ffe17c]" label="Deployable" value={fmt(deployable)} />
        </div>
      </div>

      <div className="mt-4 border-2 border-black bg-[#ffe17c] px-4 py-3">
        <div className="neo-label">Safe to deploy</div>
        <div className="mt-0.5 cabinet text-2xl tabular-nums text-black transition-all duration-300">
          {fmt(deployableCapital)}
        </div>
      </div>
      <div className="mt-5">
        <div className="neo-label">
          Upcoming obligations
        </div>
        <div className="mt-2 flex flex-col gap-2">
          {pending.length === 0 ? (
            <p className="text-xs text-black/50">
              No upcoming obligations — the treasury owes nothing.
            </p>
          ) : (
            pending.map((o) => {
              cumulative += o.amount;
              const prior = cumulative - o.amount;
              const readyNow = o.amount <= idle - (prior < idle ? prior : idle);
              const coveredAfterRecall = cumulative <= idle + recoverable;
              const readiness = readyNow ? "Ready" : coveredAfterRecall ? "Needs recall" : "Shortfall";
              const readinessStyle = readyNow ? "bg-[#10b981] text-white" : coveredAfterRecall ? "bg-[#ffe17c] text-black" : "bg-[#ef4444] text-white";
              return (
              <div
                key={o.id}
                className="flex items-center gap-3 border-2 border-black bg-white px-3 py-2"
              >
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    PRIORITY_DOT[o.priority] ?? PRIORITY_DOT[2]
                  }`}
                  title={["HIGH", "MEDIUM", "LOW"][o.priority] ?? "LOW"}
                />
                <div className="w-14 shrink-0 text-xs font-bold text-black">
                  {formatDueDate(o.dueAt)}
                </div>
                <div className="w-20 shrink-0 text-[11px] text-black/50">
                  {relativeDue(o.dueAt)}
                </div>
                <div className="flex-1 truncate text-[11px] text-black/50">
                  {shortenAddress(o.beneficiary)}
                </div>
                <div className="shrink-0 cabinet text-sm tabular-nums">
                  {formatUSD(o.amount, decimals)}
                </div>
                <span className={`shrink-0 badge ${readinessStyle}`} title={`Capacity checked cumulatively for obligations due by this date; assumes strategy liquidity can be recalled.`}>
                  {readiness}
                </span>
              </div>
            )})
          )}
        </div>
      </div>
    </section>
  );
}

function Legend({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5" title={`${label}: ${value}`}>
      <span className={`h-2 w-2 rounded-sm ${color}`} />
      {label}
    </span>
  );
}
