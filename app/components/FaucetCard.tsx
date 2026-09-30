"use client";

import { useState } from "react";
import { parseUnits } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { CHAIN_ID, erc20Abi, susdFaucetAbi } from "@/lib/contracts";
import { useTreasury } from "@/lib/treasury-context";
import { formatUSD } from "@/lib/format";
import { useTx } from "@/lib/useTx";
import { BusyLabel, TxFeedback } from "./ui";

/**
 * Testnet faucet — mints SolventUSD (SUSD) straight to the connected wallet via
 * the token's unrestricted `mint`, so anyone can fund themselves before
 * depositing. Only rendered for treasuries whose asset supports open minting
 * (i.e. SUSD / MockUSDC, not canonical Aave USDC — see Vault).
 */
export function FaucetCard({
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
  const [amount, setAmount] = useState("10000");

  const token = treasury!.asset;

  const balance = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address!],
    chainId: CHAIN_ID,
    query: { enabled: Boolean(address) },
  });

  const mint = useTx(() => {
    balance.refetch();
    onChange();
  });

  let parsed: bigint | null = null;
  try {
    parsed = amount ? parseUnits(amount, decimals) : null;
  } catch {
    parsed = null;
  }

  const busy = mint.isPending || mint.isConfirming;

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <h2 className="text-sm font-medium text-neutral-200">Get test SUSD</h2>
      <p className="mt-1 text-xs text-neutral-500">
        Wallet: {formatUSD(balance.data, decimals)} · free testnet faucet
      </p>
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="10000"
        inputMode="decimal"
        disabled={disabled}
        title={disabled ? disabledReason : undefined}
        className="mt-3 w-full rounded-lg bg-neutral-800 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-neutral-600 disabled:opacity-50"
      />
      <button
        onClick={() =>
          parsed !== null &&
          address &&
          mint.writeContract({
            address: token,
            abi: susdFaucetAbi,
            functionName: "mint",
            args: [address, parsed],
            chainId: CHAIN_ID,
          })
        }
        disabled={parsed === null || parsed === 0n || busy || disabled || !address}
        title={disabled ? disabledReason : undefined}
        className="mt-3 w-full rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-40"
      >
        <BusyLabel busy={busy}>
          {mint.isPending
            ? "Confirm in wallet…"
            : mint.isConfirming
              ? "Minting…"
              : "Mint SUSD"}
        </BusyLabel>
      </button>
      <p className="mt-2 text-[11px] text-neutral-500">
        SUSD is a 6-decimal test token with an open mint — testnet only, no real
        value. Mint what you need, then deposit it into the vault.
      </p>
      <TxFeedback tx={mint} />
    </div>
  );
}
