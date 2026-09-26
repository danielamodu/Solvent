"use client";

import { useState } from "react";
import { isAddress, parseUnits } from "viem";
import { useAccount } from "wagmi";
import {
  CHAIN_ID,
  treasuryVaultAbi,
  treasuryVaultAddress,
} from "@/lib/contracts";
import { useTx } from "@/lib/useTx";

export function WithdrawCard({
  decimals,
  isOwner,
  onChange,
}: {
  decimals: number;
  isOwner: boolean;
  onChange: () => void;
}) {
  const { address } = useAccount();
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");

  const vault = treasuryVaultAddress!;
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

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <h2 className="text-sm font-medium text-neutral-200">Withdraw USDC</h2>
      <p className="mt-1 text-xs text-neutral-500">
        {isOwner ? "Owner only — funds leave the vault." : "Only the vault owner can withdraw."}
      </p>
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0.0"
        inputMode="decimal"
        disabled={!isOwner}
        className="mt-3 w-full rounded-lg bg-neutral-800 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-neutral-600 disabled:opacity-50"
      />
      <input
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
        placeholder="Recipient (defaults to you)"
        disabled={!isOwner}
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
        disabled={!isOwner || parsed === null || parsed === 0n || !validRecipient || busy}
        className="mt-3 w-full rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-40"
      >
        {busy ? "Withdrawing…" : "Withdraw"}
      </button>
      {withdraw.errorMessage && (
        <p className="mt-2 break-words text-xs text-red-400">{withdraw.errorMessage}</p>
      )}
    </div>
  );
}
