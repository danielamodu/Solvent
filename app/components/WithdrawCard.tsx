"use client";

import { useState } from "react";
import { isAddress, parseUnits } from "viem";
import { useAccount } from "wagmi";
import {
  CHAIN_ID,
  treasuryVaultAbi,
} from "@/lib/contracts";
import { useTreasury } from "@/lib/treasury-context";
import { useTx } from "@/lib/useTx";
import { BusyLabel, TxFeedback } from "./ui";

export function WithdrawCard({
  decimals,
  symbol = "SUSD",
  isOwner,
  onChange,
  disabled = false,
  disabledReason,
}: {
  decimals: number;
  symbol?: string;
  isOwner: boolean;
  onChange: () => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const { address } = useAccount();
  const { treasury } = useTreasury();
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");

  const vault = treasury!.vault;
  const withdraw = useTx(onChange);

  let parsed: bigint | null = null;
  try {
    parsed = amount ? parseUnits(amount, decimals) : null;
  } catch {
    parsed = null;
  }

  const to = recipient.trim() === "" ? address : (recipient.trim() as `0x${string}`);
  const validRecipient = Boolean(to && isAddress(to));
  const busy = withdraw.isPending || withdraw.isConfirming;
  const locked = !isOwner || disabled;
  const hint = disabled ? disabledReason : undefined;

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <h2 className="text-sm font-medium text-neutral-200">Withdraw {symbol}</h2>
      <p className="mt-1 text-xs text-neutral-500">
        {isOwner ? "Owner only — funds leave the vault." : "Only the vault owner can withdraw."}
      </p>
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0.0"
        inputMode="decimal"
        disabled={locked}
        title={hint}
        className="mt-3 w-full rounded-lg bg-neutral-800 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-neutral-600 disabled:opacity-50"
      />
      <input
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
        placeholder="Recipient (defaults to you)"
        disabled={locked}
        title={hint}
        className="mt-2 w-full rounded-lg bg-neutral-800 px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-neutral-600 disabled:opacity-50"
      />
      <button
        onClick={() =>
          parsed !== null &&
          to &&
          isAddress(to) &&
          withdraw.writeContract({
            address: vault,
            abi: treasuryVaultAbi,
            functionName: "withdraw",
            args: [parsed, to],
            chainId: CHAIN_ID,
          })
        }
        disabled={locked || parsed === null || parsed === 0n || !validRecipient || busy}
        title={hint}
        className="mt-3 w-full rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-40"
      >
        <BusyLabel busy={busy}>
          {withdraw.isPending
            ? "Confirm in wallet…"
            : withdraw.isConfirming
              ? "Withdrawing…"
              : "Withdraw"}
        </BusyLabel>
      </button>
      <TxFeedback tx={withdraw} />
    </div>
  );
}
