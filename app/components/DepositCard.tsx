"use client";

import { useState } from "react";
import { parseUnits } from "viem";
import { useAccount, useReadContract } from "wagmi";
import {
  CHAIN_ID,
  erc20Abi,
  treasuryVaultAbi,
} from "@/lib/contracts";
import { useTreasury } from "@/lib/treasury-context";
import { formatUSD } from "@/lib/format";
import { useTx } from "@/lib/useTx";
import { BusyLabel, TxFeedback } from "./ui";

export function DepositCard({
  decimals,
  onChange,
  disabled = false,
  disabledReason,
}: {
  decimals: number;
  onChange: () => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const { address } = useAccount();
  const { treasury } = useTreasury();
  const [amount, setAmount] = useState("");

  const vault = treasury!.vault;
  const usdc = treasury!.asset;

  const balance = useReadContract({
    address: usdc,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address!],
    chainId: CHAIN_ID,
    query: { enabled: Boolean(address) },
  });
  const allowance = useReadContract({
    address: usdc,
    abi: erc20Abi,
    functionName: "allowance",
    args: [address!, vault],
    chainId: CHAIN_ID,
    query: { enabled: Boolean(address) },
  });

  const refresh = () => {
    balance.refetch();
    allowance.refetch();
    onChange();
  };

  const approve = useTx(refresh);
  const deposit = useTx(refresh);

  let parsed: bigint | null = null;
  try {
    parsed = amount ? parseUnits(amount, decimals) : null;
  } catch {
    parsed = null;
  }

  const insufficientBalance =
    parsed !== null && balance.data !== undefined && parsed > balance.data;
  const needsApproval =
    parsed !== null && (allowance.data === undefined || allowance.data < parsed);
  const busy =
    approve.isPending ||
    approve.isConfirming ||
    deposit.isPending ||
    deposit.isConfirming;
  const activeTx =
    deposit.hash || deposit.errorMessage || deposit.cancelled ? deposit : approve;

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <h2 className="text-sm font-medium text-neutral-200">Deposit USDC</h2>
      <p className="mt-1 text-xs text-neutral-500">
        Wallet: {formatUSD(balance.data, decimals)}
      </p>
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0.0"
        inputMode="decimal"
        disabled={disabled}
        title={disabled ? disabledReason : undefined}
        className="mt-3 w-full rounded-lg bg-neutral-800 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-neutral-600 disabled:opacity-50"
      />
      {needsApproval ? (
        <>
          <button
            onClick={() =>
              parsed !== null &&
              approve.writeContract({
                address: usdc,
                abi: erc20Abi,
                functionName: "approve",
                args: [vault, parsed],
                chainId: CHAIN_ID,
              })
            }
            disabled={parsed === null || parsed === 0n || insufficientBalance || busy || disabled}
            title={disabled ? disabledReason : undefined}
            className="mt-3 w-full rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-40"
          >
            <BusyLabel busy={approve.isPending || approve.isConfirming}>
              {approve.isPending
                ? "Confirm in wallet…"
                : approve.isConfirming
                  ? "Approving…"
                  : "Approve USDC"}
            </BusyLabel>
          </button>
          {!insufficientBalance && parsed !== null && (
            <p className="mt-2 text-[11px] text-neutral-500">
              One-time approval so the vault can pull your USDC, then deposit.
            </p>
          )}
        </>
      ) : (
        <button
          onClick={() =>
            parsed !== null &&
            deposit.writeContract({
              address: vault,
              abi: treasuryVaultAbi,
              functionName: "deposit",
              args: [parsed],
              chainId: CHAIN_ID,
            })
          }
          disabled={parsed === null || parsed === 0n || insufficientBalance || busy || disabled}
          title={disabled ? disabledReason : undefined}
          className="mt-3 w-full rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-40"
        >
          <BusyLabel busy={deposit.isPending || deposit.isConfirming}>
            {deposit.isPending
              ? "Confirm in wallet…"
              : deposit.isConfirming
                ? "Depositing…"
                : "Deposit"}
          </BusyLabel>
        </button>
      )}
      {insufficientBalance && (
        <p className="mt-2 text-xs text-red-400">Insufficient balance.</p>
      )}
      <TxFeedback tx={activeTx} />
    </div>
  );
}
