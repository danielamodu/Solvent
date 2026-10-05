"use client";

import Link from "next/link";
import { useAccount, useReadContract } from "wagmi";
import { CHAIN_ID, OBLIGATION_REGISTRY_ABI, treasuryVaultAbi } from "@/lib/contracts";
import { useTreasury } from "@/lib/treasury-context";
import { useObligations } from "@/lib/useObligations";
import { formatUSD } from "@/lib/format";
import { ObligationCard } from "@/app/components/ObligationCard";
import { WorkspaceFooter, WorkspaceHeader } from "@/app/components/Workspace";

export default function ObligationsPage() {
  const { address, isConnected, chainId } = useAccount();
  const { treasury } = useTreasury();
  const { obligations, activeCount, refetch, loadError } = useObligations();
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

  return <div className="workspace-shell flex min-h-screen flex-col">
    <WorkspaceHeader active="obligations" />
    <main className="dot-pattern-light mx-auto w-full max-w-[1440px] flex-1 px-5 py-10 md:px-10">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div><div className="neo-label text-[#b7c6c2]">Treasury commitments</div><h1 className="cabinet mt-2 text-4xl uppercase tracking-tight text-white sm:text-5xl">Upcoming obligations</h1><p className="mt-3 max-w-2xl text-sm text-[#b7c6c2]">Record payments before they are due. Each pending obligation reduces capital available for strategy deployment.</p></div>
        {configured && <a href="#create-obligation" className="neo-btn neo-btn-accent shrink-0">Create obligation +</a>}
      </div>
      {!configured ? <EmptyTreasury /> : <>
        {loadError && <p className="mt-4 rounded-lg border border-amber-700/40 bg-amber-950/20 p-3 text-xs text-amber-100">Couldn&apos;t load obligations from the network — figures below may be stale. Check the RPC and refresh.</p>}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Summary label="Pending obligations" value={String(activeCount)} note={`${totalCount} total records`} />
          <Summary label="Protected amount" value={formatUSD(outstanding.data, unit)} note="Reserve plus commitments" />
          <Summary label="Overdue" value={String(overdueCount)} note={overdueCount ? "Owner action required" : "No overdue payments"} accent={overdueCount > 0} />
        </div>
        <div id="create-obligation" className="mt-8 grid gap-6 lg:grid-cols-[.7fr_1.3fr]">
          <aside className="accent-bar h-fit border-2 border-black bg-[#b7c6c2] p-6 shadow-[8px_8px_0_0_#000]"><div className="neo-label">Payment readiness</div><h2 className="cabinet mt-2 text-2xl uppercase tracking-tight text-black">Promises first</h2><p className="mt-3 text-sm leading-6 text-black/70">Before a payment is settled, the vault checks that enough idle liquidity is available. If funds are deployed, recall them first.</p><div className="mt-6 border-2 border-black bg-white p-4"><div className="neo-label">Idle vault balance</div><div className="cabinet mt-1 text-2xl tabular-nums text-black">{formatUSD(available.data, unit)}</div></div><Link href="/liquidity" className="mt-5 inline-flex text-sm font-bold uppercase tracking-wide text-black underline decoration-2 underline-offset-4 hover:opacity-70">Review liquidity →</Link></aside>
          <ObligationCard decimals={unit} availableBalance={available.data} isOwner={isOwner} obligations={obligations} refetch={() => void refetch()} onChange={refresh} disabled={!canInteract} disabledReason={!isConnected ? "Connect your wallet" : "Switch to Arbitrum Sepolia"} />
        </div>
      </>}
    </main>
    <WorkspaceFooter />
  </div>;
}

function Summary({ label, value, note, accent = false }: { label: string; value: string; note: string; accent?: boolean }) {
  return <div className={`neo-card p-5 ${accent ? "border-l-4 border-l-[#ef4444]" : ""}`}><div className="neo-label">{label}</div><div className={`mt-1 cabinet text-3xl tabular-nums ${accent ? "text-[#ef4444]" : "text-black"}`}>{value}</div><p className="mt-1 text-xs text-black/50">{note}</p></div>;
}

function EmptyTreasury() {
  return <div className="neo-card-lg mt-8 p-8 text-center"><h2 className="cabinet text-lg uppercase tracking-tight">Connect a treasury to see obligations</h2><p className="mt-2 text-sm text-black/60">Onchain commitments will appear here once a treasury is selected.</p><Link href="/connect" className="neo-btn neo-btn-primary mt-5 inline-flex">Connect treasury</Link></div>;
}
