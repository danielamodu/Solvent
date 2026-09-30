"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Address } from "viem";
import {
  mockStrategyAddress,
  obligationRegistryAddress,
  treasuryVaultAddress,
  usdcAddress,
} from "./contracts";

export type TreasuryConfig = {
  vault: Address;
  registry: Address;
  asset: Address;
  strategy?: Address;
};

const STORAGE_KEY = "solvent.active-treasury.v1";
const envDefault: TreasuryConfig | null = treasuryVaultAddress && obligationRegistryAddress && usdcAddress
  ? {
      vault: treasuryVaultAddress,
      registry: obligationRegistryAddress,
      asset: usdcAddress,
      ...(mockStrategyAddress ? { strategy: mockStrategyAddress } : {}),
    }
  : null;

const TreasuryContext = createContext<{
  treasury: TreasuryConfig | null;
  setTreasury: (value: TreasuryConfig | null) => void;
  hydrated: boolean;
}>({ treasury: envDefault, setTreasury: () => undefined, hydrated: false });

function parseStored(value: string): TreasuryConfig | null {
  try {
    const parsed = JSON.parse(value) as Partial<TreasuryConfig>;
    const valid = (candidate: unknown): candidate is Address =>
      typeof candidate === "string" && /^0x[0-9a-fA-F]{40}$/.test(candidate);
    if (!valid(parsed.vault) || !valid(parsed.registry) || !valid(parsed.asset)) return null;
    return {
      vault: parsed.vault,
      registry: parsed.registry,
      asset: parsed.asset,
      ...(valid(parsed.strategy) ? { strategy: parsed.strategy } : {}),
    };
  } catch {
    return null;
  }
}

export function TreasuryProvider({ children }: { children: ReactNode }) {
  const [treasury, setTreasury] = useState<TreasuryConfig | null>(envDefault);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) setTreasury(parseStored(stored));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (treasury) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(treasury));
    else window.localStorage.removeItem(STORAGE_KEY);
  }, [treasury, hydrated]);

  return (
    <TreasuryContext.Provider value={{ treasury, setTreasury, hydrated }}>
      {children}
    </TreasuryContext.Provider>
  );
}

export function useTreasury() {
  return useContext(TreasuryContext);
}
