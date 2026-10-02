"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAddress, zeroAddress } from "viem";
import { useAccount, useReadContract, useSwitchChain } from "wagmi";
import { ConnectKitButton } from "connectkit";
import { Check, Wallet } from "lucide-react";
import { CHAIN_ID, treasuryVaultAbi } from "@/lib/contracts";
import { useTreasury } from "@/lib/treasury-context";
import { shortenAddress } from "@/lib/format";
import { WorkspaceFooter, WorkspaceHeader } from "@/app/components/Workspace";
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

  return <div className="workspace-shell flex min-h-screen flex-col">
    <WorkspaceHeader active="connect" />
    <main className="dot-pattern-light mx-auto w-full max-w-[1440px] flex-1 px-5 py-12 md:px-10 lg:py-16">
      <div className="grid gap-8 lg:grid-cols-[.88fr_1.12fr]">
        <div className="flex flex-col justify-center">
          <div className="neo-label text-[#b7c6c2]">Verify onchain credentials</div>
          <h1 className="cabinet mt-3 text-5xl uppercase leading-[0.95] tracking-tight text-white sm:text-6xl">Connect your <span className="text-[#ffe17c]">treasury</span></h1>
          <p className="mt-5 max-w-lg text-base text-[#b7c6c2]">Connect the wallet or Safe that controls your treasury to review obligations, protected liquidity, and available actions.</p>
          <div className="neo-card mt-8 p-5">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-black bg-[#b7c6c2]"><Wallet className="h-5 w-5 text-black" aria-hidden="true" /></span>
              <div><h2 className="cabinet text-sm uppercase tracking-tight">Select wallet</h2><p className="mt-0.5 text-xs font-semibold text-black/50">Use an injected wallet or open Solvent inside the Safe app.</p></div>
            </div>
            <ConnectKitButton />
            {!isConnected && <p className="mt-3 text-xs text-black/50">WalletConnect and browser wallet options appear after you open the connect dialog.</p>}
          </div>
          {isConnected && !correctNetwork && <div className="mt-4 flex items-center justify-between gap-3 border-2 border-l-4 border-black border-l-[#ffe17c] bg-white p-4 text-black"><span className="text-sm font-semibold">Switch to Arbitrum Sepolia to verify this treasury.</span><button onClick={() => switchChain({ chainId: CHAIN_ID })} className="neo-btn neo-btn-primary shrink-0">Switch network</button></div>}
        </div>
        <div className="neo-card-lg p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3 border-b-2 border-black/10 pb-5"><div><div className="neo-label">Treasury verification</div><h2 className="cabinet mt-1 text-xl uppercase tracking-tight">Connection status</h2></div><span className={`badge ${verified ? "bg-[#10b981] text-white" : "bg-black/5 text-black/50"}`}>{verified ? "Verified" : "Not connected"}</span></div>
          <div className="divide-y-2 divide-black/10">
            <VerificationRow title="Wallet address" value={address ? shortenAddress(address) : "Connect a wallet to continue"} ok={isConnected} />
            <VerificationRow title="Network" value={correctNetwork ? "Arbitrum Sepolia" : isConnected ? "Switch to Arbitrum Sepolia" : "Waiting for wallet"} ok={correctNetwork} />
            <VerificationRow title="Vault contract" value={treasury ? `${shortenAddress(treasury.vault)} · contract selected` : "No treasury selected"} ok={Boolean(treasury)} />
            <VerificationRow title="Obligation registry" value={treasury ? shortenAddress(treasury.registry) : "Connect or create a treasury"} ok={Boolean(treasury?.registry)} />
            <VerificationRow title="Owner access" value={owner.data ? isOwner ? `Connected wallet controls this treasury (${shortenAddress(owner.data)})` : `${shortenAddress(owner.data)} controls this treasury · view access only` : "Owner-only actions are verified from the vault"} ok={isOwner} />
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button disabled={!verified} onClick={() => router.push("/dashboard")} className="neo-btn neo-btn-primary flex-1">Continue to dashboard →</button>
            <button onClick={() => setShowSetup(v => !v)} className="neo-btn neo-btn-secondary flex-1">{showSetup ? "Hide treasury setup" : "Set up new treasury"}</button>
          </div>
          {showSetup && hydrated && <div className="mt-6"><TreasurySetup onSelect={value => { setTreasury(value); setShowSetup(false); router.push("/dashboard"); }} onCancel={() => setShowSetup(false)} /></div>}
          <p className="mt-5 text-center text-[11px] text-black/50">Wallet connection never transfers funds. Each treasury action is submitted separately for owner review.</p>
        </div>
      </div>
    </main>
    <WorkspaceFooter />
  </div>;
}

function VerificationRow({ title, value, ok }: { title: string; value: string; ok: boolean }) {
  return <div className="flex items-center justify-between gap-4 py-4"><div><p className="text-xs font-bold uppercase tracking-wide text-black">{title}</p><p className="mt-1 text-xs text-black/50">{value}</p></div><span className={`flex h-7 w-7 shrink-0 items-center justify-center border-2 border-black text-xs font-bold ${ok ? "bg-[#10b981] text-white" : "bg-black/5 text-black/40"}`} aria-label={ok ? "Verified" : "Pending"}>{ok ? <Check className="h-4 w-4" aria-hidden="true" /> : "·"}</span></div>;
}
