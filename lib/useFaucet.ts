"use client";

import { useCallback, useEffect, useState } from "react";
import type { Address } from "viem";

/**
 * Fixed amount dispensed per faucet claim (human units — SUSD has 6 decimals).
 * New users mint this on their first onboarding claim and on every subsequent
 * in-app claim once the cooldown elapses.
 */
export const FAUCET_AMOUNT = 2000;

/** Cooldown between faucet claims. */
export const FAUCET_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours

const storageKey = (address: string) =>
  `solvent.faucet.lastClaim.v1:${address.toLowerCase()}`;

/**
 * Client-side faucet pacing, keyed per wallet address in localStorage.
 *
 * This is deliberately a UX gate, NOT a security control: SolventUSD exposes an
 * unrestricted `mint`, so anyone can fund themselves directly on-chain. The
 * cooldown simply paces the in-app faucet (and shares its window with the
 * onboarding claim) so the button communicates "come back in N hours" rather
 * than enforcing scarcity that the open mint can't guarantee anyway. Clearing
 * localStorage resets it — acceptable for a testnet faucet with no real value.
 */
export function useFaucetCooldown(address?: Address) {
  const [lastClaim, setLastClaim] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Load the stored timestamp whenever the connected address changes. Reading
  // in an effect (not during render) keeps SSR/first paint deterministic.
  useEffect(() => {
    if (!address) {
      setLastClaim(null);
      return;
    }
    const raw = window.localStorage.getItem(storageKey(address));
    const parsed = raw ? Number(raw) : NaN;
    setLastClaim(Number.isFinite(parsed) ? parsed : null);
    setNow(Date.now());
  }, [address]);

  // Tick once a second only while a cooldown is actually counting down.
  useEffect(() => {
    if (lastClaim === null) return;
    if (lastClaim + FAUCET_COOLDOWN_MS - Date.now() <= 0) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [lastClaim]);

  const nextAvailable = lastClaim === null ? 0 : lastClaim + FAUCET_COOLDOWN_MS;
  const remainingMs = Math.max(0, nextAvailable - now);
  const hasClaimed = lastClaim !== null;
  const canClaim = Boolean(address) && remainingMs === 0;

  const recordClaim = useCallback(() => {
    if (!address) return;
    const ts = Date.now();
    window.localStorage.setItem(storageKey(address), String(ts));
    setLastClaim(ts);
    setNow(Date.now());
  }, [address]);

  return { canClaim, hasClaimed, remainingMs, nextAvailable, recordClaim };
}

/** Compact "5h 12m" / "4m 03s" countdown label for a remaining duration. */
export function formatCooldown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  if (minutes > 0) return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
  return `${seconds}s`;
}
