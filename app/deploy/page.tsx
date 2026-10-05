"use client";

import Link from "next/link";
import { useAccount, useReadContract } from "wagmi";
import { CHAIN_ID, OBLIGATION_REGISTRY_ABI, treasuryVaultAbi } from "@/lib/contracts";
import { useTreasury } from "@/lib/treasury-context";
import { formatUSD } from "@/lib/format";
import { DepositCard } from "@/app/components/DepositCard";
import { FaucetCard } from "@/app/components/FaucetCard";
import { StrategyCard } from "@/app/components/StrategyCard";
import { WithdrawCard } from "@/app/components/WithdrawCard";
import { WorkspaceFooter, WorkspaceHeader } from "@/app/components/Workspace";

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
  const symbolRead = useReadContract({ address: treasury?.asset, abi: [{ type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] }], functionName: "symbol", chainId: CHAIN_ID, query: { enabled: Boolean(treasury?.asset) } });
  const decimals = Number(decimalsRead.data ?? 6);
  const symbol = symbolRead.data ?? "SUSD";
  const isOwner = Boolean(address && owner.data && address.toLowerCase() === owner.data.toLowerCase());
  const canInteract = isConnected && chainId === CHAIN_ID;
  const refreshAll = () => { void available.refetch(); void deployable.refetch(); void deployed.refetch(); };

  return <div className="workspace-shell flex min-h-screen flex-col">
    <WorkspaceHeader active="deploy" />
    <main className="dot-pattern-light mx-auto w-full max-w-[1440px] flex-1 px-5 py-10 md:px-10">
      <div><div className="neo-label text-[#b7c6c2]">Treasury actions</div><h1 className="cabinet mt-2 text-4xl uppercase tracking-tight text-white sm:text-5xl">Deploy capital</h1><p className="mt-3 max-w-3xl text-sm text-[#b7c6c2]">Deploy idle vault assets only after reserve requirements and pending payment obligations are protected.</p></div>
      {!configured ? <div className="neo-card-lg mt-8 p-8 text-center"><h2 className="cabinet text-lg uppercase tracking-tight">Connect a treasury before deploying</h2><Link href="/connect" className="neo-btn neo-btn-primary mt-5 inline-flex">Connect treasury</Link></div> : <>
        <div className="mt-8 grid gap-4 sm:grid-cols-3"><Metric label="Safe deployment limit" value={formatUSD(deployable.data, decimals)} primary /><Metric label="Upcoming obligations" value={formatUSD(outstanding.data, decimals)} /><Metric label="Current strategy position" value={formatUSD(deployed.data, decimals)} /></div>
        <div className="mt-10"><div className="neo-label text-[#b7c6c2]">Fund the vault</div><h2 className="cabinet mt-2 text-2xl uppercase tracking-tight text-white">Claim, deposit, withdraw</h2></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FaucetCard decimals={decimals} onChange={refreshAll} disabled={!canInteract} disabledReason={!isConnected ? "Connect your wallet" : "Switch to Arbitrum Sepolia"} />
          <DepositCard decimals={decimals} symbol={symbol} onChange={refreshAll} disabled={!canInteract} disabledReason={!isConnected ? "Connect your wallet" : "Switch to Arbitrum Sepolia"} />
          <WithdrawCard decimals={decimals} symbol={symbol} isOwner={isOwner} onChange={refreshAll} disabled={!canInteract} disabledReason={!isConnected ? "Connect your wallet" : "Switch to Arbitrum Sepolia"} />
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          {treasury?.strategy ? <StrategyCard decimals={decimals} isOwner={isOwner} onChange={() => { void deployable.refetch(); void available.refetch(); void deployed.refetch(); }} deployableCapital={deployable.data} disabled={!canInteract} disabledReason={!isConnected ? "Connect your wallet" : "Switch to Arbitrum Sepolia"} /> : <div className="neo-card p-7"><h2 className="cabinet text-lg uppercase tracking-tight">No strategy connected</h2><p className="mt-2 text-sm text-black/60">Connect a strategy adapter that is wired to this vault and asset before deployment.</p></div>}
          <aside className="space-y-5">
            <section className="accent-bar neo-card p-6"><div className="neo-label">Guardrail active</div><h2 className="cabinet mt-1 text-xl uppercase tracking-tight">Promises remain protected</h2><p className="mt-3 text-sm leading-6 text-black/60">Deployable capital is computed onchain after subtracting protected liquidity and existing deployment positions.</p><div className="mt-5 space-y-3 border-t-2 border-black/10 pt-4"><Breakdown label="Idle vault balance" value={formatUSD(available.data, decimals)} /><Breakdown label="Protected liquidity" value={formatUSD(protectedLiquidity.data, decimals)} /><Breakdown label="Pending obligations" value={formatUSD(outstanding.data, decimals)} /></div></section>
            <section className="neo-card border-l-4 border-l-[#ffe17c] p-6"><h2 className="cabinet text-sm uppercase tracking-tight text-[#b45309]">Strategy information</h2><p className="mt-2 text-sm leading-6 text-black/70">The configured MockStrategy is a test adapter that returns principal only. It does not generate yield. No APY or external protocol is represented here.</p><p className="mt-3 text-xs font-bold text-black">Available now: {formatUSD(deployable.data, decimals)}</p></section>
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

function Breakdown({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 text-sm"><span className="text-black/60">{label}</span><span className="cabinet tabular-nums text-black">{value}</span></div>;
}
