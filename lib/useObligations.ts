"use client";

import { useCallback, useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import {
  CHAIN_ID,
  OBLIGATION_REGISTRY_ABI,
  obligationRegistryDeployBlock,
} from "@/lib/contracts";
import { useTreasury } from "./treasury-context";

export type ObligationRecord = {
  id: `0x${string}`;
  beneficiary: `0x${string}`;
  amount: bigint;
  dueAt: bigint;
  priority: number;
  status: number;
};

/**
 * Event-sourced view of the registry: discovers obligation ids from
 * ObligationCreated logs, then reads each one's current on-chain record (so
 * status/priority reflect later settle/cancel). Call `refetch` after any tx.
 */
export function useObligations() {
  const publicClient = usePublicClient({ chainId: CHAIN_ID });
  const { treasury } = useTreasury();
  const [obligations, setObligations] = useState<ObligationRecord[]>([]);
  const [isLoading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!publicClient || !treasury?.registry) return;
    setLoading(true);
    try {
      const logs = await publicClient.getContractEvents({
        address: treasury.registry,
        abi: OBLIGATION_REGISTRY_ABI,
        eventName: "ObligationCreated",
        fromBlock: obligationRegistryDeployBlock,
        toBlock: "latest",
      });

      const ids = Array.from(
        new Set(logs.map((l) => l.args.id as `0x${string}`))
      );

      const records = await Promise.all(
        ids.map(async (id) => {
          const r = (await publicClient.readContract({
            address: treasury.registry,
            abi: OBLIGATION_REGISTRY_ABI,
            functionName: "obligations",
            args: [id],
          })) as readonly [
            `0x${string}`,
            `0x${string}`,
            bigint,
            bigint,
            number,
            number
          ];
          return {
            id: r[0],
            beneficiary: r[1],
            amount: r[2],
            dueAt: r[3],
            priority: Number(r[4]),
            status: Number(r[5]),
          };
        })
      );

      setObligations(records);
    } catch {
      // Leave the previous list in place if the RPC scan fails.
    } finally {
      setLoading(false);
    }
  }, [publicClient, treasury?.registry]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const activeCount = obligations.filter((o) => o.status === 0).length;

  return { obligations, activeCount, isLoading, refetch };
}
