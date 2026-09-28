"use client";

import { useState } from "react";
import { isAddress, parseUnits } from "viem";
import {
  CHAIN_ID,
  OBLIGATION_REGISTRY_ABI,
  obligationRegistryAddress,
  PRIORITY,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from "@/lib/contracts";
import { formatDueDate, formatUSD, relativeDue, shortenAddress } from "@/lib/format";
import { useTx } from "@/lib/useTx";
import type { ObligationRecord } from "@/lib/useObligations";
import { BusyLabel, TxFeedback } from "./ui";

const PRIORITY_OPTIONS = [
  { label: "High", value: PRIORITY.HIGH },
  { label: "Medium", value: PRIORITY.MEDIUM },
  { label: "Low", value: PRIORITY.LOW },
] as const;

export function ObligationCard({
  decimals,
  isOwner,
  obligations,
  refetch,
  onChange,
  disabled = false,
  disabledReason,
}: {
  decimals: number;
  isOwner: boolean;
  obligations: ObligationRecord[];
  refetch: () => void;
  onChange: () => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [beneficiary, setBeneficiary] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<number>(PRIORITY.MEDIUM);
  const [activeId, setActiveId] = useState<`0x${string}` | null>(null);

  const registry = obligationRegistryAddress!;
  const done = () => {
    refetch();
    onChange();
  };
  const create = useTx(done);
  const rowTx = useTx(() => {
    setActiveId(null);
    done();
  });

  let parsedAmount: bigint | null = null;
  try {
    parsedAmount = amount ? parseUnits(amount, decimals) : null;
  } catch {
    parsedAmount = null;
  }
  const dueAt = dueDate ? Math.floor(new Date(dueDate).getTime() / 1000) : 0;
  const validBeneficiary = isAddress(beneficiary.trim());
  const canCreate =
    isOwner &&
    !disabled &&
    validBeneficiary &&
    parsedAmount !== null &&
    parsedAmount > 0n &&
    dueAt > 0;
  const creating = create.isPending || create.isConfirming;
  const rowBusy = rowTx.isPending || rowTx.isConfirming;
  const locked = !isOwner || disabled;
  const hint = disabled ? disabledReason : undefined;

  const submitCreate = () => {
    if (!canCreate || parsedAmount === null) return;
    create.writeContract({
      address: registry,
      abi: OBLIGATION_REGISTRY_ABI,
      functionName: "createObligation",
      args: [
        beneficiary.trim() as `0x${string}`,
        parsedAmount,
        BigInt(dueAt),
        priority,
      ],
      chainId: CHAIN_ID,
    });
  };

  const rowAction = (
    id: `0x${string}`,
    fn: "settleObligation" | "cancelObligation"
  ) => {
    setActiveId(id);
    rowTx.writeContract({
      address: registry,
      abi: OBLIGATION_REGISTRY_ABI,
      functionName: fn,
      args: [id],
      chainId: CHAIN_ID,
    });
  };

  const rows = [...obligations].reverse();

  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <h2 className="text-sm font-medium text-neutral-200">Obligations</h2>
      <p className="mt-1 text-xs text-neutral-500">
        {isOwner
          ? "Owner only — each obligation reserves protected liquidity."
          : "Only the vault owner can create or settle obligations."}
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <input
          value={beneficiary}
          onChange={(e) => setBeneficiary(e.target.value)}
          placeholder="Beneficiary address (0x…)"
          disabled={locked}
          title={hint}
          className="w-full rounded-lg bg-neutral-800 px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-neutral-600 disabled:opacity-50 sm:col-span-2"
        />
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount (USDC)"
          inputMode="decimal"
          disabled={locked}
          title={hint}
          className="w-full rounded-lg bg-neutral-800 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-neutral-600 disabled:opacity-50"
        />
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          disabled={locked}
          title={hint}
          className="w-full rounded-lg bg-neutral-800 px-3 py-2 text-sm text-neutral-300 outline-none focus:ring-1 focus:ring-neutral-600 disabled:opacity-50"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(Number(e.target.value))}
          disabled={locked}
          title={hint}
          className="w-full rounded-lg bg-neutral-800 px-3 py-2 text-sm text-neutral-300 outline-none focus:ring-1 focus:ring-neutral-600 disabled:opacity-50 sm:col-span-2"
        >
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label} priority
            </option>
          ))}
        </select>
      </div>
      <button
        onClick={submitCreate}
        disabled={!canCreate || creating}
        title={hint}
        className="mt-3 w-full rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-40"
      >
        <BusyLabel busy={creating}>
          {create.isPending
            ? "Confirm in wallet…"
            : create.isConfirming
              ? "Creating…"
              : "Create obligation"}
        </BusyLabel>
      </button>
      <TxFeedback tx={create} />

      <div className="mt-5 flex flex-col gap-2">
        {rows.length === 0 && (
          <p className="text-xs text-neutral-500">
            No obligations yet — surplus is free to deploy.
          </p>
        )}
        {rows.map((o) => (
          <ObligationRow
            key={o.id}
            o={o}
            decimals={decimals}
            isOwner={isOwner}
            busy={rowBusy && activeId === o.id}
            disabled={rowBusy || disabled}
            onSettle={() => rowAction(o.id, "settleObligation")}
            onCancel={() => rowAction(o.id, "cancelObligation")}
          />
        ))}
      </div>
      <TxFeedback tx={rowTx} />
    </section>
  );
}

const PRIORITY_STYLES = [
  "bg-red-500/15 text-red-300", // HIGH
  "bg-amber-500/15 text-amber-300", // MEDIUM
  "bg-neutral-700 text-neutral-300", // LOW
] as const;

function ObligationRow({
  o,
  decimals,
  isOwner,
  busy,
  disabled,
  onSettle,
  onCancel,
}: {
  o: ObligationRecord;
  decimals: number;
  isOwner: boolean;
  busy: boolean;
  disabled: boolean;
  onSettle: () => void;
  onCancel: () => void;
}) {
  const isPending = o.status === 0;
  const rel = relativeDue(o.dueAt);
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold tabular-nums">
          {formatUSD(o.amount, decimals)}
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
            PRIORITY_STYLES[o.priority] ?? PRIORITY_STYLES[2]
          }`}
        >
          {PRIORITY_LABELS[o.priority] ?? "—"}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-500">
        <span>To {shortenAddress(o.beneficiary)}</span>
        <span>
          Due {formatDueDate(o.dueAt)}
          {isPending && rel && (
            <span
              className={
                rel === "OVERDUE"
                  ? "font-medium text-red-400"
                  : "text-neutral-400"
              }
            >
              {" · "}
              {rel}
            </span>
          )}
        </span>
        <span className={isPending ? "text-neutral-400" : "text-neutral-600"}>
          {STATUS_LABELS[o.status] ?? "—"}
        </span>
      </div>
      {isOwner && isPending && (
        <div className="mt-2 flex gap-2">
          <button
            onClick={onSettle}
            disabled={disabled}
            className="rounded-md bg-white px-3 py-1 text-xs font-medium text-neutral-900 disabled:opacity-40"
          >
            <BusyLabel busy={busy}>{busy ? "Settling…" : "Settle"}</BusyLabel>
          </button>
          <button
            onClick={onCancel}
            disabled={disabled}
            className="rounded-md border border-neutral-700 px-3 py-1 text-xs font-medium text-neutral-300 disabled:opacity-40"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}



