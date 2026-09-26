"use client";

import { ConnectKitButton } from "connectkit";
import { Vault } from "./components/Vault";

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-16">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Solvent</h1>
            <p className="mt-1 text-sm text-neutral-400">
              Obligation-aware treasury — Phase 1: Treasury Vault
            </p>
          </div>
          <ConnectKitButton />
        </header>
        <Vault />
      </div>
    </main>
  );
}
