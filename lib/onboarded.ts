"use client";

import { useEffect, useState } from "react";

/**
 * First-run flag: the landing "Connect wallet" button sends first-timers
 * through onboarding exactly once, then straight to the dashboard.
 */
const ONBOARDED_KEY = "solvent.onboarded.v1";

export function markOnboarded(): void {
  try {
    window.localStorage.setItem(ONBOARDED_KEY, "1");
  } catch {
    /* private mode — onboarding simply shows again next visit */
  }
}

/** Null until hydrated (avoids a first-paint flash of the wrong route). */
export function useIsFirstTimer(): boolean | null {
  const [first, setFirst] = useState<boolean | null>(null);
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(ONBOARDED_KEY);
    } catch {
      /* ignore */
    }
    setFirst(saved !== "1");
  }, []);
  return first;
}
