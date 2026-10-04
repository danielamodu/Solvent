"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Address } from "viem";
import { useTreasury, type TreasuryConfig } from "@/lib/treasury-context";
import { shortenAddress } from "@/lib/format";

/**
 * One-click judge entry: loads the pre-seeded stage treasury (public reads
 * need no wallet) and lands on the live dashboard. If the visitor already has
 * a treasury saved, ask before overwriting it — never silently replace
 * someone's own selection with the demo.
 */
const STAGE_TREASURY: TreasuryConfig = {
  vault: "0x371126527486AFE308EDd726246BeF66eD8501d3" as Address,
  registry: "0x64C868F527A73e7b0521e5425BcB5632c2a6f600" as Address,
  asset: "0x6102e581816b903d1a6FcE3C6adCF9861341785F" as Address,
  strategy: "0x1264a06adb9fb614246C53CCD6F4C3dFA086431D" as Address,
};

export default function DemoPage() {
  const { treasury, setTreasury, hydrated } = useTreasury();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated || treasury) return;
    setTreasury(STAGE_TREASURY);
    router.replace("/dashboard");
  }, [hydrated, treasury, setTreasury, router]);

  if (!hydrated || !treasury) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-5">
        <div className="w-full max-w-sm rounded-xl border border-neutral-800 bg-neutral-900 p-6 text-center">
          <p className="text-sm font-medium text-neutral-200">Loading the live demo treasury…</p>
          <p className="mt-2 text-xs text-neutral-500">Pulling onchain state from Arbitrum Sepolia.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-5">
      <div className="w-full max-w-sm rounded-xl border border-neutral-800 bg-neutral-900 p-6 text-center">
        <p className="text-sm font-medium text-neutral-200">View the stage demo treasury?</p>
        <p className="mt-2 text-xs text-neutral-500">
          You already have {shortenAddress(treasury.vault)} saved. Loading the demo replaces it (you can reconnect yours anytime).
        </p>
        <div className="mt-4 grid gap-2">
          <button
            type="button"
            onClick={() => {
              setTreasury(STAGE_TREASURY);
              router.replace("/dashboard");
            }}
            className="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-neutral-900"
          >
            View stage demo
          </button>
          <button
            type="button"
            onClick={() => router.replace("/dashboard")}
            className="w-full rounded-lg border border-neutral-700 px-4 py-2.5 text-sm text-neutral-200"
          >
            Go to my treasury instead
          </button>
        </div>
      </div>
    </main>
  );
}
