"use client";

import Link from "next/link";
import { useAccount, useReadContract } from "wagmi";
import { CHAIN_ID, OBLIGATION_REGISTRY_ABI, treasuryVaultAbi } from "@/lib/contracts";
import { useTreasury } from "@/lib/treasury-context";
import { formatUSD } from "@/lib/format";
import { StrategyCard } from "@/app/components/StrategyCard";
import { SolventFooter, SolventNav } from "@/app/components/SolventNav";

export default function DeployPage() {
  const { address, isConnected, chainId } = useAccount();
  const { treasury } = useTreasury();
  const configured = Boolean(treasury?.vault && treasury?.registry);
  const owner = useReadContract({ address: treasury?.vault, abi: treasuryVaultAbi, functionName: "owner", chainId: CHAIN_ID, query: { enabled: configured } });
  const deployable = useReadContract({ address: treasury?.vault, abi: treasuryVaultAbi, functionName: "deployableCapital", chainId: CHAIN_ID, query: { enabled: configured } });
  const available = useReadContract({ address: treasury?.vault, abi: treasuryVaultAbi, functionName: "availableBalance", chainId: CHAIN_ID, query: { enabled: configured } });
  const deployed = useReadContract({ address: treasury?.vault, abi: treasuryVaultAbi, functionName: "totalDeployed", chainId: CHAIN_ID, query: { enabled: configured } });
  const protectedLiquidity = useReadContract({ address: treasury?.registry, abi: OBLIGATION_REGISTRY_ABI, functionName: "protectedLiquidity", chainId: CHAIN_ID, query: { enabled: configured } });
  const outstanding = useReadContract({ address: treasury?.registry, abi: OBLIGATION_REGISTRY_ABI, functionName: "getOutstandingAmount", chainId: CHAIN_ID, query: { enabled: configured } });
  const decimalsRead = useReadContract({ address: treasury?.asset, abi: [{ type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] }], functionName: "decimals", chainId: CHAIN_ID, query: { enabled: Boolean(treasury?.asset) } });
  const decimals = Number(decimalsRead.data ?? 6);
  const isOwner = Boolean(address && owner.data && address.toLowerCase() === owner.data.toLowerCase());
  const canInteract = isConnected && chainId === CHAIN_ID;

  return <main className="min-h-screen bg-slate-50 text-slate-900">
    <SolventNav active="deploy" />
    <section className="solvent-dashboard mx-auto max-w-[1280px] px-5 py-10 lg:px-8">
      <div><p className="text-xs font-bold uppercase tracking-[.18em] text-blue-700">Treasury actions</p><h1 className="display-font mt-2 text-4xl font-extrabold sm:text-5xl">Deploy capital.</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Deploy idle vault assets only after reserve requirements and pending payment obligations are protected.</p></div>
      {!configured ? <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 text-center"><h2 className="font-bold">Connect a treasury before deploying</h2><Link href="/connect" className="mt-4 inline-flex rounded-full bg-blue-700 px-5 py-3 text-sm font-bold text-white">Connect treasury</Link></div> : <>
        <div className="mt-8 grid gap-4 sm:grid-cols-3"><Metric label="Safe deployment limit" value={formatUSD(deployable.data, decimals)} primary /><Metric label="Upcoming obligations" value={formatUSD(outstanding.data, decimals)} /><Metric label="Current strategy position" value={formatUSD(deployed.data, decimals)} /></div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          {treasury?.strategy ? <StrategyCard decimals={decimals} isOwner={isOwner} onChange={() => { void deployable.refetch(); void available.refetch(); void deployed.refetch(); }} deployableCapital={deployable.data} disabled={!canInteract} disabledReason={!isConnected ? "Connect your wallet" : "Switch to Arbitrum Sepolia"} /> : <div className="rounded-3xl border border-slate-200 bg-white p-7"><h2 className="text-lg font-bold">No strategy connected</h2><p className="mt-2 text-sm text-slate-600">Connect a strategy adapter that is wired to this vault and asset before deployment.</p></div>}
          <aside className="space-y-5">
            <section className="rounded-3xl border border-blue-100 bg-blue-50 p-6"><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-700">Guardrail active</p><h2 className="mt-2 text-xl font-bold text-slate-900">Promises remain protected.</h2><p className="mt-3 text-sm leading-6 text-slate-600">Deployable capital is computed onchain after subtracting protected liquidity and existing deployment positions.</p><div className="mt-5 space-y-3 border-t border-blue-100 pt-4"><Breakdown label="Idle vault balance" value={formatUSD(available.data, decimals)} /><Breakdown label="Protected liquidity" value={formatUSD(protectedLiquidity.data, decimals)} /><Breakdown label="Pending obligations" value={formatUSD(outstanding.data, decimals)} /></div></section>
            <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6"><h2 className="text-sm font-bold text-amber-900">Strategy information</h2><p className="mt-2 text-sm leading-6 text-amber-900/75">The configured MockStrategy is a test adapter that returns principal only. It does not generate yield. No APY or external protocol is represented here.</p><p className="mt-3 text-xs font-semibold text-amber-900">Available now: {formatUSD(deployable.data, decimals)}</p></section>
          </aside>
        </div>
      </>}
    </section>
    <SolventFooter />
  </main>;
}

function Metric({ label, value, primary = false }: { label: string; value: string; primary?: boolean }) {
  return <div className={`rounded-3xl border p-5 shadow-sm ${primary ? "border-blue-700 bg-blue-700 text-white" : "border-slate-200 bg-white"}`}><p className={`text-xs font-semibold ${primary ? "text-blue-100" : "text-slate-500"}`}>{label}</p><p className={`mt-2 text-2xl font-extrabold tabular-nums ${primary ? "text-white" : "text-blue-700"}`}>{value}</p></div>;
}

function Breakdown({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 text-sm"><span className="text-slate-600">{label}</span><span className="font-bold tabular-nums text-slate-900">{value}</span></div>;
}
