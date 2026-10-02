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

const STYLES: Record<Level, { dot: string; box: string; label: string }> = {
  green: {
    dot: "bg-black/40",
    box: "bg-[#10b981] text-white",
    label: "Fully covered",
  },
  amber: {
    dot: "bg-black/40",
    box: "bg-[#ffe17c] text-black",
    label: "Monitor",
  },
  red: {
    dot: "bg-white/70",
    box: "bg-[#ef4444] text-white",
    label: "At risk",
  },
};

export function RiskBadge({ coverage }: { coverage: number | null }) {
  const s = STYLES[riskLevel(coverage)];
  return (
    <span
      className={`badge gap-1.5 transition-colors duration-300 ${s.box}`}
    >
      <span className={`h-2 w-2 rounded-full ${s.dot}`} aria-hidden="true" />
      {s.label}
    </span>
  );
}
