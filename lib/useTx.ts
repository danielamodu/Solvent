"use client";

import { useEffect } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";

/**
 * Thin wrapper around a contract write and its receipt. Invokes `onConfirmed`
 * once the transaction is mined so callers can refresh on-chain reads.
 */
export function useTx(onConfirmed?: () => void) {
  const {
    writeContract,
    data: hash,
    isPending,
    error,
    reset,
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isConfirmed) onConfirmed?.();
  }, [isConfirmed]); // eslint-disable-line react-hooks/exhaustive-deps

  const errorMessage = error
    ? ((error as { shortMessage?: string }).shortMessage ?? error.message)
    : undefined;

  return {
    writeContract,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    errorMessage,
    reset,
  };
}
