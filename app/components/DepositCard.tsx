"use client";

import { useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { useAccount, useReadContract } from "wagmi";
import {
  CHAIN_ID,
  erc20Abi,
  treasuryVaultAbi,
  treasuryVaultAddress,
  usdcAddress,
} from "@/lib/contracts";
import { useTx } from "@/lib/useTx";

export function DepositCard({
  decimals,
  onChange,
}: {
  decimals: number;
  onChange: () => void;
}) {
  const { address } = useAccount();
  const [amount, setAmount] = useState("");

  const vault = treasuryVaultAddress!;
  const usdc = usdcAddress!;

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

  const needsApproval =
    parsed !== null && (allowance.data === undefined || allowance.data < parsed);
  const busy =
    approve.isPending ||
    approve.isConfirming ||
    deposit.isPending ||
    deposit.isConfirming;

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <h2 className="text-sm font-medium text-neutral-200">Deposit USDC</h2>
      <p className="mt-1 text-xs text-neutral-500">
        Wallet:{" "}
        {balance.data !== undefined
          ? formatUnits(balance.data, decimals)
          : "—"}{" "}
        USDC
      </p>
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0.0"
        inputMode="decimal"
        className="mt-3 w-full rounded-lg bg-neutral-800 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-neutral-600"
      />
      {needsApproval ? (
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
          disabled={parsed === null || busy}
          className="mt-3 w-full rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-40"
        >
          {approve.isPending || approve.isConfirming ? "Approving…" : "Approve USDC"}
        </button>
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
          disabled={parsed === null || parsed === 0n || busy}
          className="mt-3 w-full rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-40"
        >
          {deposit.isPending || deposit.isConfirming ? "Depositing…" : "Deposit"}
        </button>
      )}
      {(approve.errorMessage || deposit.errorMessage) && (
        <p className="mt-2 break-words text-xs text-red-400">
          {approve.errorMessage || deposit.errorMessage}
        </p>
      )}
    </div>
  );
}
