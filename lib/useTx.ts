"use client";

import { useEffect } from "react";
import {
  BaseError,
  ContractFunctionRevertedError,
  UserRejectedRequestError,
} from "viem";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";

/** Map on-chain revert reasons to language a demo audience understands. */
const REVERT_MESSAGES: Record<string, string> = {
  "Insufficient deployable capital": "Exceeds deployable capital.",
  "TreasuryVault: recall exceeds position": "Exceeds the deployed position.",
  "TreasuryVault: insufficient balance":
    "Not enough idle balance — recall from the strategy first.",
  "TreasuryVault: not authorized": "Only the vault owner can do that.",
  "ObligationRegistry: not pending": "This obligation is no longer pending.",
  "ObligationRegistry: beneficiary is zero address":
    "Enter a valid beneficiary address.",
  "ObligationRegistry: amount is zero": "Enter an amount greater than zero.",
  // OpenZeppelin v5 Ownable custom error.
  OwnableUnauthorizedAccount: "Only the vault owner can do that.",
};

function friendlyRevert(reason: string): string {
  return REVERT_MESSAGES[reason] ?? reason;
}

/**
 * Turn a wagmi/viem write error into either a user-cancellation (not an error
 * state) or a concise, friendly message. Wallet rejections surface as
 * `UserRejectedRequestError`; contract reverts as `ContractFunctionRevertedError`
 * (with a `.reason` string for require()s or `.data.errorName` for custom errors).
 */
function describeError(error: unknown): {
  message?: string;
  cancelled: boolean;
} {
  if (!error) return { cancelled: false };

  if (error instanceof BaseError) {
    const rejected = error.walk(
      (e) => e instanceof UserRejectedRequestError
    );
    if (rejected) return { cancelled: true };

    const reverted = error.walk(
      (e) => e instanceof ContractFunctionRevertedError
    );
    if (reverted instanceof ContractFunctionRevertedError) {
      const reason = reverted.reason ?? reverted.data?.errorName;
      if (reason) return { message: friendlyRevert(reason), cancelled: false };
    }

    return { message: error.shortMessage, cancelled: false };
  }

  // Fallback for non-viem errors (e.g. EIP-1193 code 4001 = user rejected).
  const anyErr = error as { code?: number; shortMessage?: string; message?: string };
  if (anyErr.code === 4001) return { cancelled: true };
  return {
    message: anyErr.shortMessage ?? anyErr.message ?? "Transaction failed.",
    cancelled: false,
  };
}

/**
 * Thin wrapper around a contract write and its receipt. Invokes `onConfirmed`
 * only once the transaction is *successfully* mined (not merely included), so a
 * reverted tx never triggers an optimistic refresh. Exposes the tx hash for an
 * explorer link and a classified error (cancelled vs. failed).
 */
export function useTx(onConfirmed?: () => void) {
  const {
    writeContract,
    data: hash,
    isPending,
    error,
    reset,
  } = useWriteContract();
  const { data: receipt, isLoading: isConfirming } =
    useWaitForTransactionReceipt({ hash });

  const isConfirmed = receipt?.status === "success";
  const isReverted = receipt?.status === "reverted";

  useEffect(() => {
    if (isConfirmed) onConfirmed?.();
  }, [isConfirmed]); // eslint-disable-line react-hooks/exhaustive-deps

  const { message, cancelled } = describeError(error);
  const errorMessage = message ?? (isReverted ? "Transaction reverted." : undefined);

  return {
    writeContract,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    isReverted,
    errorMessage,
    cancelled,
    reset,
  };
}

export type TxState = ReturnType<typeof useTx>;
