"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Address } from "viem";
import { useTreasury, type TreasuryConfig } from "@/lib/treasury-context";

/**
 * One-click judge entry: selects the pre-seeded stage treasury (public reads
 * need no wallet) and lands on the live dashboard. No wallet connection is
 * required to *view* — only to act.
 */
const STAGE_TREASURY: TreasuryConfig = {
  vault: "0x371126527486AFE308EDd726246BeF66eD8501d3" as Address,
  registry: "0x64C868F527A73e7b0521e5425BcB5632c2a6f600" as Address,
  asset: "0x6102e581816b903d1a6FcE3C6adCF9861341785F" as Address,
  strategy: "0x1264a06adb9fb614246C53CCD6F4C3dFA086431D" as Address,
};

export default function DemoPage() {
  const { setTreasury } = useTreasury();
  const router = useRouter();

  useEffect(() => {
    setTreasury(STAGE_TREASURY);
    router.replace("/dashboard");
  }, [setTreasury, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-5">
      <div className="w-full max-w-sm rounded-xl border border-neutral-800 bg-neutral-900 p-6 text-center">
        <p className="text-sm font-medium text-neutral-200">Loading the live demo treasury…</p>
        <p className="mt-2 text-xs text-neutral-500">Pulling onchain state from Arbitrum Sepolia.</p>
      </div>
    </main>
  );
}
