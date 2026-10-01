"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAddress, zeroAddress } from "viem";
import { useAccount, useReadContract, useSwitchChain } from "wagmi";
import { ConnectKitButton } from "connectkit";
import { CHAIN_ID, treasuryVaultAbi } from "@/lib/contracts";
import { useTreasury } from "@/lib/treasury-context";
import { shortenAddress } from "@/lib/format";
import { SolventFooter, SolventNav } from "@/app/components/SolventNav";
import { TreasurySetup } from "@/app/components/TreasurySetup";

export default function ConnectPage() {
  const router = useRouter();
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const { treasury, setTreasury, hydrated } = useTreasury();
  const [showSetup, setShowSetup] = useState(false);
  const owner = useReadContract({ address: treasury?.vault, abi: treasuryVaultAbi, functionName: "owner", chainId: CHAIN_ID, query: { enabled: Boolean(treasury?.vault) } });
  const correctNetwork = chainId === CHAIN_ID;
  const verified = Boolean(isConnected && correctNetwork && treasury && owner.data && getAddress(owner.data) !== zeroAddress);
  const isOwner = Boolean(address && owner.data && address.toLowerCase() === owner.data.toLowerCase());

  return <main className="min-h-screen bg-white text-slate-900">
    <SolventNav />
    <section className="solvent-dashboard mx-auto max-w-[1280px] px-5 py-14 lg:px-8 lg:py-20">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[.88fr_1.12fr]">
        <div className="flex flex-col justify-center">
          <p className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-700/15 px-3 py-2 text-xs font-bold text-slate-600"><span className="h-2 w-2 rounded-full bg-blue-700" /> VERIFY ONCHAIN CREDENTIALS</p>
          <h1 className="display-font mt-6 text-5xl font-extrabold leading-tight sm:text-6xl">Connect your <span className="text-blue-700">treasury.</span></h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-600">Connect the wallet or Safe that controls your treasury to review obligations, protected liquidity, and available actions.</p>
          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-sm font-bold">Select wallet</h2>
            <p className="mt-1 text-xs text-slate-500">Use an injected wallet or open Solvent inside the Safe app.</p>
            <div className="mt-4"><ConnectKitButton /></div>
            {!isConnected && <p className="mt-3 text-xs text-slate-500">WalletConnect and browser wallet options appear after you open the connect dialog.</p>}
          </div>
          {isConnected && !correctNetwork && <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm text-amber-900">Switch to Arbitrum Sepolia to verify this treasury.</p><button onClick={() => switchChain({ chainId: CHAIN_ID })} className="rounded-full bg-blue-700 px-4 py-2 text-xs font-bold text-white">Switch network</button></div>}
        </div>
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,.08)] sm:p-8">
          <div className="flex items-center justify-between border-b border-slate-100 pb-5"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-700">Treasury verification</p><h2 className="mt-2 text-xl font-bold">Connection status</h2></div><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${verified ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{verified ? "Verified" : "Not connected"}</span></div>
          <div className="divide-y divide-slate-100">
            <VerificationRow title="Wallet address" value={address ? shortenAddress(address) : "Connect a wallet to continue"} ok={isConnected} />
            <VerificationRow title="Network" value={correctNetwork ? "Arbitrum Sepolia" : isConnected ? "Switch to Arbitrum Sepolia" : "Waiting for wallet"} ok={correctNetwork} />
            <VerificationRow title="Vault contract" value={treasury ? `${shortenAddress(treasury.vault)} · contract selected` : "No treasury selected"} ok={Boolean(treasury)} />
            <VerificationRow title="Obligation registry" value={treasury ? shortenAddress(treasury.registry) : "Connect or create a treasury"} ok={Boolean(treasury?.registry)} />
            <VerificationRow title="Owner access" value={owner.data ? isOwner ? `Connected wallet controls this treasury (${shortenAddress(owner.data)})` : `${shortenAddress(owner.data)} controls this treasury · view access only` : "Owner-only actions are verified from the vault"} ok={isOwner} />
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button disabled={!verified} onClick={() => router.push("/dashboard")} className="flex-1 rounded-full bg-blue-700 px-5 py-3.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Continue to dashboard <span aria-hidden>→</span></button>
            <button onClick={() => setShowSetup(v => !v)} className="flex-1 rounded-full border border-blue-700 px-5 py-3.5 text-sm font-bold text-blue-700 hover:bg-blue-50">{showSetup ? "Hide treasury setup" : "Set up new treasury"}</button>
          </div>
          {showSetup && hydrated && <div className="mt-6"><TreasurySetup onSelect={value => { setTreasury(value); setShowSetup(false); router.push("/dashboard"); }} onCancel={() => setShowSetup(false)} /></div>}
          <p className="mt-5 text-center text-[11px] text-slate-500">Wallet connection never transfers funds. Each treasury action is submitted separately for owner review.</p>
        </div>
      </div>
    </section>
    <SolventFooter />
  </main>;
}

function VerificationRow({ title, value, ok }: { title: string; value: string; ok: boolean }) {
  return <div className="flex items-center justify-between gap-4 py-4"><div><p className="text-xs font-bold text-slate-700">{title}</p><p className="mt-1 text-xs text-slate-500">{value}</p></div><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${ok ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`} aria-label={ok ? "Verified" : "Pending"}>{ok ? "✓" : "·"}</span></div>;
}
