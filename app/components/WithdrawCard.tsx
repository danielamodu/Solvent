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
import { ArrowUpFromLine } from "lucide-react";

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
    <div className="neo-card p-5">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-black bg-[#b7c6c2]">
          <ArrowUpFromLine className="h-5 w-5 text-black" aria-hidden="true" />
        </span>
        <div>
          <h2 className="cabinet text-sm uppercase tracking-tight">Withdraw {symbol}</h2>
          <p className="mt-0.5 text-xs font-semibold text-black/50">
            {isOwner ? "Owner only — funds leave the vault." : "Only the vault owner can withdraw."}
          </p>
        </div>
      </div>
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0.0"
        inputMode="decimal"
        disabled={locked}
        title={hint}
        className="neo-input cabinet text-lg"
      />
      <input
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
        placeholder="Recipient (defaults to you)"
        disabled={locked}
        title={hint}
        className="neo-input mt-2 text-xs"
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
        className="neo-btn neo-btn-primary mt-3 w-full"
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
