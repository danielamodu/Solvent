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
import { WorkspaceFooter, WorkspaceHeader } from "@/app/components/Workspace";

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

  return <div className="workspace-shell flex min-h-screen flex-col">
    <WorkspaceHeader active="liquidity" />
    <main className="dot-pattern-light mx-auto w-full max-w-[1440px] flex-1 px-5 py-10 md:px-10">
      <div className="flex flex-wrap items-end justify-between gap-5"><div><div className="neo-label text-[#b7c6c2]">Treasury controls</div><h1 className="cabinet mt-2 text-4xl uppercase tracking-tight text-white sm:text-5xl">Liquidity reserve</h1><p className="mt-3 max-w-2xl text-sm text-[#b7c6c2]">Funds protected for upcoming obligations and the treasury&rsquo;s reserve requirement stay out of deployment capacity.</p></div><Link href="/obligations" className="neo-btn neo-btn-secondary shrink-0">Manage obligations</Link></div>
      {!configured ? <div className="neo-card-lg mt-8 p-8 text-center"><h2 className="cabinet text-lg uppercase tracking-tight">Connect a treasury to see its reserve</h2><Link href="/connect" className="neo-btn neo-btn-primary mt-5 inline-flex">Connect treasury</Link></div> : <>
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
            <section className="neo-card p-6"><div className="flex items-start justify-between gap-3"><div><div className="neo-label">Coverage timeline</div><h2 className="cabinet mt-1 text-xl uppercase tracking-tight">Payments ahead</h2></div><span className={`badge ${coverage !== null && coverage >= 100 ? "bg-[#10b981] text-white" : "bg-[#ffe17c] text-black"}`}>{coverage !== null && coverage >= 100 ? "Healthy" : "Review"}</span></div>
              <div className="mt-5 space-y-4">{["Next 7 days", "Days 8–14", "Days 15–30"].map((label, i) => { const amount = buckets[i] ?? 0n; const covered = amount === 0n || idle >= amount; return <div key={label} className="flex items-center justify-between gap-3 border-b-2 border-black/10 pb-3 last:border-0"><div><p className="text-sm font-bold text-black">{label}</p><p className="mt-1 text-xs text-black/50">{covered ? "Covered by current idle balance" : "Needs liquidity review"}</p></div><div className="text-right"><p className="cabinet text-sm tabular-nums text-black">{formatUSD(amount, decimals)}</p><p className={`mt-1 text-[10px] font-bold ${covered ? "text-[#10b981]" : "text-[#b45309]"}`}>{covered ? "COVERED" : "REVIEW"}</p></div></div>; })}</div>
            </section>
            <section className="accent-bar neo-card p-6"><h2 className="cabinet text-sm uppercase tracking-tight">Reserve requirement</h2><p className="mt-2 text-sm leading-6 text-black/70">{formatUSD(reserve.data, decimals)} is protected by the registry. This contract sets the reserve when the treasury is created; to change it, create a treasury with the desired reserve.</p><Link href="/connect" className="mt-4 inline-flex text-sm font-bold uppercase tracking-wide text-black underline decoration-2 underline-offset-4 hover:opacity-70">Treasury setup →</Link></section>
          </aside>
        </div>
      </>}
    </main>
    <WorkspaceFooter />
  </div>;
}

function Metric({ label, value, primary = false }: { label: string; value: string; primary?: boolean }) {
  if (primary) return <div className="border-2 border-black bg-[#ffe17c] p-5 shadow-[4px_4px_0_0_#000]"><div className="neo-label">{label}</div><div className="mt-1 cabinet text-2xl tabular-nums text-black">{value}</div></div>;
  return <div className="neo-card p-5"><div className="neo-label">{label}</div><div className="mt-1 cabinet text-2xl tabular-nums text-black">{value}</div></div>;
}
