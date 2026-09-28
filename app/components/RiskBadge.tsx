"use client";

/**
 * At-a-glance treasury health, driven by the same coverage figure as the
 * LiquidityTimeline. Green = fully covered (>=120% or no obligations),
 * amber = monitor (80–120%), red = at risk (<80%).
 */
type Level = "green" | "amber" | "red";

export function riskLevel(coverage: number | null): Level {
  if (coverage === null || coverage >= 120) return "green";
  if (coverage >= 80) return "amber";
  return "red";
}

const STYLES: Record<Level, { dot: string; text: string; box: string; label: string }> = {
  green: {
    dot: "bg-emerald-400",
    text: "text-emerald-300",
    box: "border-emerald-500/30 bg-emerald-500/10",
    label: "Fully covered",
  },
  amber: {
    dot: "bg-amber-400",
    text: "text-amber-300",
    box: "border-amber-500/30 bg-amber-500/10",
    label: "Monitor",
  },
  red: {
    dot: "bg-red-400",
    text: "text-red-300",
    box: "border-red-500/30 bg-red-500/10",
    label: "At risk",
  },
};

export function RiskBadge({ coverage }: { coverage: number | null }) {
  const s = STYLES[riskLevel(coverage)];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-300 ${s.box} ${s.text}`}
    >
      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
