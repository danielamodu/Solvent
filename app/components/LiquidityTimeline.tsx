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
  coverage: number | null;
  decimals: number;
  obligations: ObligationRecord[];
};

const COVERAGE_TEXT: Record<"green" | "amber" | "red", string> = {
  green: "text-emerald-400",
  amber: "text-amber-400",
  red: "text-red-400",
};

const PRIORITY_DOT = ["bg-red-500", "bg-amber-500", "bg-neutral-500"] as const;

export function LiquidityTimeline({
  totalAssets,
  totalDeployed,
  deployableCapital,
  reserveRequirement,
  outstandingAmount,
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

  const coverageText = COVERAGE_TEXT[riskLevel(coverage)];

  const segments = [
    { key: "Reserve", value: reserve, color: "bg-neutral-500" },
    { key: "Obligations", value: outstanding, color: "bg-red-500" },
    { key: "Deployed", value: deployed, color: "bg-blue-500" },
    { key: "Deployable", value: deployable, color: "bg-emerald-500" },
  ];

  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs text-neutral-500">Liquidity coverage</div>
          {coverage === null ? (
            <div className="mt-1 text-lg font-semibold text-emerald-400">
              No obligations — all capital deployable
            </div>
          ) : (
            <div
              className={`mt-1 text-4xl font-semibold tabular-nums transition-colors duration-300 ${coverageText}`}
            >
              {coverage > 999 ? ">999%" : `${Math.round(coverage)}%`}
            </div>
          )}
        </div>
        <RiskBadge coverage={coverage} />
      </div>
      <div className="mt-5">
        {hasAssets ? (
          <div className="flex h-4 w-full overflow-hidden rounded-full bg-neutral-800">
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
          <div className="flex h-4 w-full items-center justify-center rounded-full bg-neutral-800 text-[10px] text-neutral-600">
            No assets deposited yet
          </div>
        )}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-neutral-500">
          <Legend color="bg-neutral-500" label="Reserve" value={fmt(reserve)} />
          <Legend color="bg-red-500" label="Obligations" value={fmt(outstanding)} />
          <Legend color="bg-blue-500" label="Deployed" value={fmt(deployed)} />
          <Legend color="bg-emerald-500" label="Deployable" value={fmt(deployable)} />
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
        <div className="text-xs text-neutral-500">Safe to deploy</div>
        <div className="mt-0.5 text-2xl font-semibold tabular-nums text-emerald-300 transition-all duration-300">
          {fmt(deployableCapital)}
        </div>
      </div>
      <div className="mt-5">
        <div className="text-xs font-medium text-neutral-400">
          Upcoming obligations
        </div>
        <div className="mt-2 flex flex-col gap-2">
          {pending.length === 0 ? (
            <p className="text-xs text-neutral-500">
              No upcoming obligations — the treasury owes nothing.
            </p>
          ) : (
            pending.map((o) => (
              <div
                key={o.id}
                className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2"
              >
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    PRIORITY_DOT[o.priority] ?? PRIORITY_DOT[2]
                  }`}
                  title={["HIGH", "MEDIUM", "LOW"][o.priority] ?? "LOW"}
                />
                <div className="w-14 shrink-0 text-xs font-medium text-neutral-300">
                  {formatDueDate(o.dueAt)}
                </div>
                <div className="w-20 shrink-0 text-[11px] text-neutral-500">
                  {relativeDue(o.dueAt)}
                </div>
                <div className="flex-1 truncate text-[11px] text-neutral-500">
                  {shortenAddress(o.beneficiary)}
                </div>
                <div className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatUSD(o.amount, decimals)}
                </div>
                <span className="shrink-0 rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] font-medium text-neutral-400">
                  PENDING
                </span>
              </div>
            ))
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
