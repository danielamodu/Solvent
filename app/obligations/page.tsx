"use client";

import Link from "next/link";
import { useAccount, useReadContract } from "wagmi";
import { CHAIN_ID, OBLIGATION_REGISTRY_ABI, treasuryVaultAbi } from "@/lib/contracts";
import { useTreasury } from "@/lib/treasury-context";
import { useObligations } from "@/lib/useObligations";
import { formatUSD } from "@/lib/format";
import { ObligationCard } from "@/app/components/ObligationCard";
import { SolventFooter, SolventNav } from "@/app/components/SolventNav";

export default function ObligationsPage() {
  const { address, isConnected, chainId } = useAccount();
  const { treasury } = useTreasury();
  const { obligations, activeCount, refetch } = useObligations();
  const configured = Boolean(treasury?.vault && treasury?.registry);
  const owner = useReadContract({ address: treasury?.vault, abi: treasuryVaultAbi, functionName: "owner", chainId: CHAIN_ID, query: { enabled: configured } });
  const available = useReadContract({ address: treasury?.vault, abi: treasuryVaultAbi, functionName: "availableBalance", chainId: CHAIN_ID, query: { enabled: configured } });
  const outstanding = useReadContract({ address: treasury?.registry, abi: OBLIGATION_REGISTRY_ABI, functionName: "getOutstandingAmount", chainId: CHAIN_ID, query: { enabled: configured } });
  const decimals = useReadContract({ address: treasury?.asset, abi: [{ type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] }], functionName: "decimals", chainId: CHAIN_ID, query: { enabled: Boolean(treasury?.asset) } });
  const isOwner = Boolean(address && owner.data && address.toLowerCase() === owner.data.toLowerCase());
  const canInteract = isConnected && chainId === CHAIN_ID;
  const refresh = () => { void available.refetch(); void outstanding.refetch(); };
  const unit = Number(decimals.data ?? 6);
  const totalCount = obligations.length;
  const overdueCount = obligations.filter(o => o.status === 0 && Number(o.dueAt) < Date.now() / 1000).length;

  return <main className="min-h-screen bg-slate-50 text-slate-900">
    <SolventNav active="obligations" />
    <section className="solvent-dashboard mx-auto max-w-[1280px] px-5 py-10 lg:px-8">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-blue-700">Treasury commitments</p><h1 className="display-font mt-2 text-4xl font-extrabold sm:text-5xl">Upcoming obligations</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Record payments before they are due. Each pending obligation reduces capital available for strategy deployment.</p></div>
        {configured && <a href="#create-obligation" className="rounded-full bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800">Create obligation <span aria-hidden>＋</span></a>}
      </div>
      {!configured ? <EmptyTreasury /> : <>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Summary label="Pending obligations" value={String(activeCount)} note={`${totalCount} total records`} />
          <Summary label="Protected amount" value={formatUSD(outstanding.data, unit)} note="Reserve plus commitments" />
          <Summary label="Overdue" value={String(overdueCount)} note={overdueCount ? "Owner action required" : "No overdue payments"} accent={overdueCount > 0} />
        </div>
        <div id="create-obligation" className="mt-8 grid gap-6 lg:grid-cols-[.7fr_1.3fr]">
          <aside className="h-fit rounded-3xl border border-blue-100 bg-blue-700 p-6 text-white shadow-sm"><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-100">Payment readiness</p><h2 className="display-font mt-3 text-3xl font-extrabold">Promises first.</h2><p className="mt-3 text-sm leading-6 text-blue-50">Before a payment is settled, the vault checks that enough idle liquidity is available. If funds are deployed, recall them first.</p><div className="mt-6 rounded-2xl bg-white/10 p-4"><p className="text-xs text-blue-100">Idle vault balance</p><p className="mt-1 text-2xl font-bold">{formatUSD(available.data, unit)}</p></div><Link href="/liquidity" className="mt-5 inline-flex text-sm font-bold text-white underline underline-offset-4">Review liquidity →</Link></aside>
          <ObligationCard decimals={unit} availableBalance={available.data} isOwner={isOwner} obligations={obligations} refetch={() => void refetch()} onChange={refresh} disabled={!canInteract} disabledReason={!isConnected ? "Connect your wallet" : "Switch to Arbitrum Sepolia"} />
        </div>
      </>}
    </section>
    <SolventFooter />
  </main>;
}

function Summary({ label, value, note, accent = false }: { label: string; value: string; note: string; accent?: boolean }) {
  return <div className={`rounded-3xl border p-5 shadow-sm ${accent ? "border-red-100 bg-red-50" : "border-slate-200 bg-white"}`}><p className="text-xs font-semibold text-slate-500">{label}</p><p className={`mt-2 text-3xl font-extrabold tabular-nums ${accent ? "text-red-700" : "text-blue-700"}`}>{value}</p><p className="mt-1 text-xs text-slate-500">{note}</p></div>;
}

function EmptyTreasury() {
  return <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 text-center"><h2 className="text-lg font-bold">Connect a treasury to see obligations</h2><p className="mt-2 text-sm text-slate-600">Onchain commitments will appear here once a treasury is selected.</p><Link href="/connect" className="mt-5 inline-flex rounded-full bg-blue-700 px-5 py-3 text-sm font-bold text-white">Connect treasury</Link></div>;
}
