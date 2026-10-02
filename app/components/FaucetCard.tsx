"use client";

import { parseUnits } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { CHAIN_ID, erc20Abi, susdFaucetAbi } from "@/lib/contracts";
import { useTreasury } from "@/lib/treasury-context";
import { formatUSD } from "@/lib/format";
import { useTx } from "@/lib/useTx";
import {
  FAUCET_AMOUNT,
  formatCooldown,
  useFaucetCooldown,
} from "@/lib/useFaucet";
import { BusyLabel, TxFeedback } from "./ui";
import { Coins } from "lucide-react";

/**
 * Testnet faucet — mints a fixed {@link FAUCET_AMOUNT} of SolventUSD (SUSD)
 * straight to the connected wallet via the token's unrestricted `mint`, paced by
 * a 6-hour cooldown shared with the onboarding claim (see useFaucetCooldown).
 * Only rendered for treasuries whose asset supports open minting (i.e. SUSD /
 * mock assets, not canonical Aave USDC — see Vault).
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
  const token = treasury!.asset;

  const balance = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address!],
    chainId: CHAIN_ID,
    query: { enabled: Boolean(address) },
  });

  const { canClaim, hasClaimed, remainingMs, recordClaim } =
    useFaucetCooldown(address);

  const mint = useTx(() => {
    recordClaim();
    balance.refetch();
    onChange();
  });

  const amountUnits = parseUnits(String(FAUCET_AMOUNT), decimals);
  const busy = mint.isPending || mint.isConfirming;
  const onCooldown = hasClaimed && !canClaim;
  const blocked = disabled || !address || busy || !canClaim;

  return (
    <div className="neo-card p-5">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-black bg-[#b7c6c2]">
          <Coins className="h-5 w-5 text-black" aria-hidden="true" />
        </span>
        <div>
          <h2 className="cabinet text-sm uppercase tracking-tight">Get test SUSD</h2>
          <p className="mt-0.5 text-xs font-semibold text-black/50">
            Wallet: {formatUSD(balance.data, decimals)} · {FAUCET_AMOUNT.toLocaleString()} SUSD per claim
          </p>
        </div>
      </div>
      <button
        onClick={() =>
          address &&
          canClaim &&
          mint.writeContract({
            address: token,
            abi: susdFaucetAbi,
            functionName: "mint",
            args: [address, amountUnits],
            chainId: CHAIN_ID,
          })
        }
        disabled={blocked}
        title={disabled ? disabledReason : undefined}
        className="neo-btn neo-btn-primary w-full"
      >
        <BusyLabel busy={busy}>
          {mint.isPending
            ? "Confirm in wallet…"
            : mint.isConfirming
              ? "Minting…"
              : !address
                ? "Connect a wallet"
                : onCooldown
                  ? `Next claim in ${formatCooldown(remainingMs)}`
                  : `Claim ${FAUCET_AMOUNT.toLocaleString()} SUSD`}
        </BusyLabel>
      </button>
      <p className="mt-2 text-[11px] text-black/50">
        {onCooldown
          ? "The faucet dispenses once every 6 hours. Mint SUSD is a 6-decimal test token — testnet only, no real value."
          : "SUSD is a 6-decimal test token with an open mint — testnet only, no real value. The in-app faucet drips once every 6 hours."}
      </p>
      <TxFeedback tx={mint} />
    </div>
  );
}
