"use client";

import { useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { useReadContract } from "wagmi";
import {
  CHAIN_ID,
  MOCK_STRATEGY_ABI,
  mockStrategyAddress,
  treasuryVaultAbi,
  treasuryVaultAddress,
} from "@/lib/contracts";
import { useTx } from "@/lib/useTx";

export function StrategyCard({
  decimals,
  isOwner,
  onChange,
}: {
  decimals: number;
  isOwner: boolean;
  onChange: () => void;
}) {
  const [amount, setAmount] = useState("");

  const vault = treasuryVaultAddress!;
  const strategy = mockStrategyAddress!;
  const recall = useTx(() => {
    position.refetch();
    liquidity.refetch();
    onChange();
  });

  const position = useReadContract({
    address: vault,
    abi: treasuryVaultAbi,
    functionName: "strategyPositions",
    args: [strategy],
    chainId: CHAIN_ID,
  });
  const liquidity = useReadContract({
    address: strategy,
    abi: MOCK_STRATEGY_ABI,
    functionName: "availableLiquidity",
    chainId: CHAIN_ID,
  });

  let parsed: bigint | null = null;
  try {
    parsed = amount ? parseUnits(amount, decimals) : null;
  } catch {
    parsed = null;
  }

  const busy = recall.isPending || recall.isConfirming;

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <h2 className="text-sm font-medium text-neutral-200">Strategy position</h2>
      <p className="mt-1 text-xs text-neutral-500">
        {isOwner
          ? "Owner only — recall pulls deployed capital back into the vault."
          : "Only the vault owner can recall deployed capital."}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-neutral-800 px-3 py-2">
          <div className="text-[11px] text-neutral-500">Principal deployed</div>
          <div className="mt-0.5 text-sm font-semibold tabular-nums">
            {fmt(position.data, decimals)}
          </div>
        </div>
        <div className="rounded-lg bg-neutral-800 px-3 py-2">
          <div className="text-[11px] text-neutral-500">Available liquidity</div>
          <div className="mt-0.5 text-sm font-semibold tabular-nums">
            {fmt(liquidity.data, decimals)}
          </div>
        </div>
      </div>

      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0.0"
        inputMode="decimal"
        disabled={!isOwner}
        className="mt-3 w-full rounded-lg bg-neutral-800 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-neutral-600 disabled:opacity-50"
      />
      <button
        onClick={() =>
          parsed !== null &&
          recall.writeContract({
            address: vault,
            abi: treasuryVaultAbi,
            functionName: "recallFromStrategy",
            args: [strategy, parsed],
            chainId: CHAIN_ID,
          })
        }
        disabled={!isOwner || parsed === null || parsed === 0n || busy}
        className="mt-3 w-full rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-40"
      >
        {busy ? "Recalling…" : "Recall"}
      </button>
      {recall.errorMessage && (
        <p className="mt-2 break-words text-xs text-red-400">{recall.errorMessage}</p>
      )}
    </div>
  );
}

function fmt(value: bigint | undefined, decimals: number) {
  return value !== undefined ? `${formatUnits(value, decimals)} USDC` : "—";
}
