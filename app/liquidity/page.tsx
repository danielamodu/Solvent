"use client";

import Link from "next/link";
import { formatUnits } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { CHAIN_ID, MOCK_STRATEGY_ABI, OBLIGATION_REGISTRY_ABI, treasuryVaultAbi } from "@/lib/contracts";
import { useTreasury } from "@/lib/treasury-context";
import { useObligations } from "@/lib/useObligations";
import { formatUSD } from "@/lib/format";
import { LiquidityTimeline } from "@/app/components/LiquidityTimeline";
import { ShortfallAlert } from "@/app/components/ShortfallAlert";
import { SolventFooter, SolventNav } from "@/app/components/SolventNav";

export default function LiquidityPage() {
  const { address, isConnected, chainId } = useAccount();
  const { treasury } = useTreasury();
  const { obligations } = useObligations();
  const configured = Boolean(treasury?.vault && treasury?.registry);
  const totalAssets = useReadContract({ address: treasury?.vault, abi: treasuryVaultAbi, functionName: "totalAssets", chainId: CHAIN_ID, query: { enabled: configured } });
  const available = useReadContract({ address: treasury?.vault, abi: treasuryVaultAbi, functionName: "availableBalance", chainId: CHAIN_ID, query: { enabled: configured } });
  const deployed = useReadContract({ address: treasury?.vault, abi: treasuryVaultAbi, functionName: "totalDeployed", chainId: CHAIN_ID, query: { enabled: configured } });
  const deployable = useReadContract({ address: treasury?.vault, abi: treasuryVaultAbi, functionName: "deployableCapital", chainId: CHAIN_ID, query: { enabled: configured } });
  const owner = useReadContract({ address: treasury?.vault, abi: treasuryVaultAbi, functionName: "owner", chainId: CHAIN_ID, query: { enabled: configured } });
  const protectedLiquidity = useReadContract({ address: treasury?.registry, abi: OBLIGATION_REGISTRY_ABI, functionName: "protectedLiquidity", chainId: CHAIN_ID, query: { enabled: configured } });
  const reserve = useReadContract({ address: treasury?.registry, abi: OBLIGATION_REGISTRY_ABI, functionName: "reserveRequirement", chainId: CHAIN_ID, query: { enabled: configured } });
  const outstanding = useReadContract({ address: treasury?.registry, abi: OBLIGATION_REGISTRY_ABI, functionName: "getOutstandingAmount", chainId: CHAIN_ID, query: { enabled: configured } });
  const strategyLiquidity = useReadContract({ address: treasury?.strategy, abi: MOCK_STRATEGY_ABI, functionName: "availableLiquidity", chainId: CHAIN_ID, query: { enabled: Boolean(treasury?.strategy) } });
  const decimalsRead = useReadContract({ address: treasury?.asset, abi: [{ type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] }], functionName: "decimals", chainId: CHAIN_ID, query: { enabled: Boolean(treasury?.asset) } });
  const decimals = Number(decimalsRead.data ?? 6);
  const isOwner = Boolean(address && owner.data && address.toLowerCase() === owner.data.toLowerCase());
  const canInteract = isConnected && chainId === CHAIN_ID;
  const coverage = outstanding.data && outstanding.data > 0n && available.data !== undefined && strategyLiquidity.data !== undefined
    ? Number(formatUnits(available.data + strategyLiquidity.data, decimals)) / Number(formatUnits(outstanding.data, decimals)) * 100
    : null;
  const refresh = () => { void totalAssets.refetch(); void available.refetch(); void deployed.refetch(); void protectedLiquidity.refetch(); void deployable.refetch(); void strategyLiquidity.refetch(); };
  const pending = obligations.filter(o => o.status === 0);
  const now = Date.now() / 1000;
  const buckets = [7, 14, 30].map(days => pending.filter(o => Number(o.dueAt) <= now + days * 86400 && Number(o.dueAt) > now + (days === 7 ? 0 : [7, 14, 30][[7, 14, 30].indexOf(days) - 1] * 86400)).reduce((sum, o) => sum + o.amount, 0n));
  const idle = available.data ?? 0n;

  return <main className="min-h-screen bg-slate-50 text-slate-900">
    <SolventNav active="liquidity" />
    <section className="solvent-dashboard mx-auto max-w-[1280px] px-5 py-10 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-blue-700">Treasury controls</p><h1 className="display-font mt-2 text-4xl font-extrabold sm:text-5xl">Liquidity reserve</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Funds protected for upcoming obligations and the treasury’s reserve requirement stay out of deployment capacity.</p></div><Link href="/obligations" className="rounded-full border border-blue-700 px-5 py-3 text-sm font-bold text-blue-700 hover:bg-blue-50">Manage obligations</Link></div>
      {!configured ? <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 text-center"><h2 className="font-bold">Connect a treasury to see its reserve</h2><Link href="/connect" className="mt-4 inline-flex rounded-full bg-blue-700 px-5 py-3 text-sm font-bold text-white">Connect treasury</Link></div> : <>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Total assets" value={formatUSD(totalAssets.data, decimals)} />
          <Metric label="Reserved" value={formatUSD(protectedLiquidity.data, decimals)} />
          <Metric label="Pending obligations" value={formatUSD(outstanding.data, decimals)} />
          <Metric label="Safe to deploy" value={formatUSD(deployable.data, decimals)} primary />
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
          <div className="space-y-6"><LiquidityTimeline totalAssets={totalAssets.data} totalDeployed={deployed.data} deployableCapital={deployable.data} reserveRequirement={reserve.data} outstandingAmount={outstanding.data} availableBalance={available.data} strategyLiquidity={strategyLiquidity.data} strategyPosition={deployed.data} coverage={coverage} decimals={decimals} obligations={obligations} />
            <ShortfallAlert protectedLiquidity={protectedLiquidity.data} availableBalance={available.data} totalDeployed={deployed.data} strategyLiquidity={strategyLiquidity.data} decimals={decimals} isOwner={isOwner && canInteract} onChange={refresh} />
          </div>
          <aside className="space-y-5">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-700">Coverage timeline</p><h2 className="mt-2 text-xl font-bold">Payments ahead</h2></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{coverage !== null && coverage >= 100 ? "Healthy" : "Review"}</span></div>
              <div className="mt-5 space-y-4">{["Next 7 days", "Days 8–14", "Days 15–30"].map((label, i) => { const amount = buckets[i] ?? 0n; const covered = amount === 0n || idle >= amount; return <div key={label} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0"><div><p className="text-sm font-semibold">{label}</p><p className="mt-1 text-xs text-slate-500">{covered ? "Covered by current idle balance" : "Needs liquidity review"}</p></div><div className="text-right"><p className="text-sm font-bold">{formatUSD(amount, decimals)}</p><p className={`mt-1 text-[10px] font-bold ${covered ? "text-emerald-700" : "text-amber-700"}`}>{covered ? "COVERED" : "REVIEW"}</p></div></div>; })}</div>
            </section>
            <section className="rounded-3xl border border-blue-100 bg-blue-50 p-6"><h2 className="text-sm font-bold text-blue-900">Reserve requirement</h2><p className="mt-2 text-sm leading-6 text-blue-900/75">{formatUSD(reserve.data, decimals)} is protected by the registry. This contract sets the reserve when the treasury is created; to change it, create a treasury with the desired reserve.</p><Link href="/connect" className="mt-4 inline-flex text-sm font-bold text-blue-800 underline underline-offset-4">Treasury setup →</Link></section>
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
