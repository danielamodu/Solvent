import { formatUnits } from "viem";

/**
 * Presentation helpers shared across the dashboard. Centralised so every
 * component renders amounts, addresses, dates and explorer links identically
 * — judges should never see a raw bigint, a full 42-char address, or an
 * ISO timestamp.
 */

const usdWhole = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const usdCents = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format a base-unit token amount as USD, e.g. 40000000000n (6 decimals) →
 * "$40,000". Whole amounts show no decimals; fractional amounts keep cents.
 * Returns "—" for undefined so loading/empty reads never render a bigint.
 */
export function formatUSD(value: bigint | undefined, decimals = 6): string {
  if (value === undefined) return "—";
  const n = Number(formatUnits(value, decimals));
  return Number.isInteger(n) ? usdWhole.format(n) : usdCents.format(n);
}

/** Truncate an address to "0x1234…abcd". */
export function shortenAddress(addr: string | undefined): string {
  if (!addr || addr.length < 10) return addr || "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** Absolute due date, e.g. "Sep 30". */
export function formatDueDate(dueAt: bigint): string {
  if (dueAt === 0n) return "—";
  return new Date(Number(dueAt) * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** Relative due label: "OVERDUE" | "today" | "tomorrow" | "in N days". */
export function relativeDue(dueAt: bigint): string {
  if (dueAt === 0n) return "";
  const diffMs = Number(dueAt) * 1000 - Date.now();
  if (diffMs < 0) return "OVERDUE";
  const days = Math.round(diffMs / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

/** Arbiscan (Arbitrum Sepolia) transaction link. */
export function arbiscanTx(hash: string): string {
  return `https://sepolia.arbiscan.io/tx/${hash}`;
}
