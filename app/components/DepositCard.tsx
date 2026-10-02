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
import { ArrowDownToLine } from "lucide-react";

export function DepositCard({
  decimals,
  symbol = "SUSD",
  onChange,
  disabled = false,
  disabledReason,
}: {
  decimals: number;
  symbol?: string;
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
    <div className="neo-card p-5">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-black bg-[#b7c6c2]">
          <ArrowDownToLine className="h-5 w-5 text-black" aria-hidden="true" />
        </span>
        <div>
          <h2 className="cabinet text-sm uppercase tracking-tight">Deposit {symbol}</h2>
          <p className="mt-0.5 text-xs font-semibold text-black/50">
            Wallet: {formatUSD(balance.data, decimals)}
          </p>
        </div>
      </div>
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0.0"
        inputMode="decimal"
        disabled={disabled}
        title={disabled ? disabledReason : undefined}
        className="neo-input cabinet text-lg"
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
            className="neo-btn neo-btn-primary mt-3 w-full"
          >
            <BusyLabel busy={approve.isPending || approve.isConfirming}>
              {approve.isPending
                ? "Confirm in wallet…"
                : approve.isConfirming
                  ? "Approving…"
                  : `Approve ${symbol}`}
            </BusyLabel>
          </button>
          {!insufficientBalance && parsed !== null && (
            <p className="mt-2 text-[11px] text-black/50">
              One-time approval so the vault can pull your {symbol}, then deposit.
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
          className="neo-btn neo-btn-primary mt-3 w-full"
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
        <p className="mt-2 text-xs font-bold text-[#ef4444]">Insufficient balance.</p>
      )}
      <TxFeedback tx={activeTx} />
    </div>
  );
}
