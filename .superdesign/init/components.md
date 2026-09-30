# Shared UI components

## `app/components/ui.tsx`

Custom primitives used across the treasury dashboard. There is no external component library.

```tsx
"use client";

import { arbiscanTx } from "@/lib/format";
import type { TxState } from "@/lib/useTx";

/** Inline loading spinner, sized to sit inside a button label. */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={`h-3.5 w-3.5 animate-spin ${className ?? ""}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

/** Animated grey placeholder shown while an on-chain read is pending. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-neutral-800 ${className ?? "h-6 w-24"}`} aria-hidden="true" />;
}

/** Button content with a leading spinner while busy. */
export function BusyLabel({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return <span className="inline-flex items-center justify-center gap-2">{busy && <Spinner />}{children}</span>;
}

/** Unified post-submit feedback for cancelled, failed, pending, and confirmed transactions. */
export function TxFeedback({ tx, className }: { tx: Pick<TxState, "hash" | "isConfirmed" | "isConfirming" | "errorMessage" | "cancelled">; className?: string }) {
  const { hash, isConfirmed, errorMessage, cancelled } = tx;
  if (!hash && !errorMessage && !cancelled) return null;
  return (
    <div className={`mt-2 space-y-1 text-xs ${className ?? ""}`}>
      {cancelled && <p className="text-neutral-400">Transaction cancelled.</p>}
      {errorMessage && <p className="break-words text-red-400">{errorMessage}</p>}
      {hash && <a href={arbiscanTx(hash)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-neutral-400 underline decoration-neutral-700 underline-offset-2 transition-colors hover:text-neutral-200">{isConfirmed ? "Confirmed" : "Pending"} · View on Arbiscan ↗</a>}
    </div>
  );
}
```
