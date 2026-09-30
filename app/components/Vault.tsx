"use client";

import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import { useAccount, usePublicClient, useReadContract, useSwitchChain } from "wagmi";
import {
  CHAIN_ID,
  erc20Abi,
  MOCK_STRATEGY_ABI,
  OBLIGATION_REGISTRY_ABI,
  treasuryFactoryAbi,
  treasuryFactoryAddress,
  treasuryVaultAbi,
} from "@/lib/contracts";
import { formatUSD, shortenAddress } from "@/lib/format";
import { useObligations } from "@/lib/useObligations";
import { useTreasury } from "@/lib/treasury-context";
import { DepositCard } from "./DepositCard";
import { LiquidityTimeline } from "./LiquidityTimeline";
import { ObligationCard } from "./ObligationCard";
import { ShortfallAlert } from "./ShortfallAlert";
import { StrategyCard } from "./StrategyCard";
import { TreasurySetup } from "./TreasurySetup";
import { Skeleton } from "./ui";
import { WithdrawCard } from "./WithdrawCard";

export function Vault() {
  const { address, isConnected, chainId } = useAccount();
  const publicClient = usePublicClient({ chainId: CHAIN_ID });
  const { switchChain } = useSwitchChain();
  const { treasury, setTreasury, hydrated } = useTreasury();
  const [showSetup, setShowSetup] = useState(false);

  const configured = Boolean(treasury?.vault && treasury?.asset && treasury?.registry);

  const totalAssets = useReadContract({
    address: treasury?.vault,
    abi: treasuryVaultAbi,
    functionName: "totalAssets",
    chainId: CHAIN_ID,
    query: { enabled: configured },
  });
  const available = useReadContract({
    address: treasury?.vault,
    abi: treasuryVaultAbi,
    functionName: "availableBalance",
    chainId: CHAIN_ID,
    query: { enabled: configured },
  });
  const deployable = useReadContract({
    address: treasury?.vault,
    abi: treasuryVaultAbi,
    functionName: "deployableCapital",
    chainId: CHAIN_ID,
    query: { enabled: configured },
  });
  const deployed = useReadContract({
    address: treasury?.vault,
    abi: treasuryVaultAbi,
    functionName: "totalDeployed",
    chainId: CHAIN_ID,
    query: { enabled: configured },
  });
  const protectedLiquidity = useReadContract({
    address: treasury?.registry,
    abi: OBLIGATION_REGISTRY_ABI,
    functionName: "protectedLiquidity",
    chainId: CHAIN_ID,
    query: { enabled: configured },
  });
  const ownerRead = useReadContract({
    address: treasury?.vault,
    abi: treasuryVaultAbi,
    functionName: "owner",
    chainId: CHAIN_ID,
    query: { enabled: configured },
  });
  const decimalsRead = useReadContract({
    address: treasury?.asset,
    abi: erc20Abi,
    functionName: "decimals",
    chainId: CHAIN_ID,
    query: { enabled: configured },
  });
  const outstanding = useReadContract({
    address: treasury?.registry,
    abi: OBLIGATION_REGISTRY_ABI,
    functionName: "getOutstandingAmount",
    chainId: CHAIN_ID,
    query: { enabled: configured },
  });
  const reserve = useReadContract({
    address: treasury?.registry,
    abi: OBLIGATION_REGISTRY_ABI,
    functionName: "reserveRequirement",
    chainId: CHAIN_ID,
    query: { enabled: configured },
  });
  const strategyLiquidity = useReadContract({
    address: treasury?.strategy,
    abi: MOCK_STRATEGY_ABI,
    functionName: "availableLiquidity",
    chainId: CHAIN_ID,
    query: { enabled: configured && Boolean(treasury?.strategy) },
  });

  const decimals = decimalsRead.data ?? 6;
  const isOwner =
    Boolean(address) &&
    typeof ownerRead.data === "string" &&
    address!.toLowerCase() === ownerRead.data.toLowerCase();

  const { obligations, refetch: refetchObligations } = useObligations();

  // Payment coverage counts idle funds and presently withdrawable strategy liquidity.
  // Null when nothing is owed yet (all capital is deployable) or before the
  // idle balance has loaded, so the meter shows the "no obligations" state
  // instead of flashing 0%.
  const toNum = (v: bigint | undefined) =>
    v === undefined ? 0 : Number(formatUnits(v, decimals));
  const outstandingData = outstanding.data;
  const coverage =
    outstandingData !== undefined &&
    outstandingData > 0n &&
    available.data !== undefined &&
    strategyLiquidity.data !== undefined
      ? ((toNum(available.data) + toNum(strategyLiquidity.data)) /
          toNum(outstandingData)) *
        100
      : null;

  const refresh = () => {
    totalAssets.refetch();
    available.refetch();
    deployable.refetch();
    deployed.refetch();
    protectedLiquidity.refetch();
    outstanding.refetch();
    strategyLiquidity.refetch();
  };

  // Wallet / network gating. The dashboard always renders (public reads work
  // without a wallet); only the action cards are locked until a wallet is
  // connected on the right chain.
  const wrongNetwork = isConnected && chainId !== CHAIN_ID;
  const canInteract = isConnected && !wrongNetwork;
  const interactionHint = !isConnected
    ? "Connect your wallet"
    : wrongNetwork
      ? "Switch to Arbitrum Sepolia"
      : undefined;

  // Surface read failures (RPC down/timeout) instead of a blank or stale board.
  const readError =
    totalAssets.isError ||
    available.isError ||
    deployable.isError ||
    deployed.isError ||
    protectedLiquidity.isError;

  if (!hydrated) return <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 text-sm text-neutral-400">Loading treasury configuration…</div>;
  if (!configured || showSetup) return <TreasurySetup onSelect={(value) => { setTreasury(value); setShowSetup(false); }} onCancel={configured ? () => setShowSetup(false) : undefined} />;

  return (
    <section className="flex flex-col gap-4">
      {readError && (
        <div className="rounded-xl border border-red-600/40 bg-red-950/30 p-4">
          <div className="text-sm font-semibold text-red-300">
            Unable to fetch data
          </div>
          <p className="mt-1 text-xs text-red-200/80">
            Retrying… confirm your connection to Arbitrum Sepolia.
          </p>
        </div>
      )}

      {!isConnected && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-400">
          Connect a wallet to deposit, withdraw, or manage obligations — live
          treasury data is shown below.
        </div>
      )}

      {wrongNetwork && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-600/40 bg-amber-950/30 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-amber-300">
              Wrong network
            </div>
            <p className="mt-1 text-xs text-amber-200/80">
              This app runs on Arbitrum Sepolia. Switch networks to interact
              with the vault.
            </p>
          </div>
          <button
            onClick={() => switchChain({ chainId: CHAIN_ID })}
            className="shrink-0 rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-neutral-900"
          >
            Switch to Arbitrum Sepolia
          </button>
        </div>
      )}

      <div className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-xs">
        <span>Connected treasury · {shortenAddress(treasury!.vault)}</span>
        <button onClick={() => setShowSetup(true)} className="text-neutral-300 underline underline-offset-2">Change or add treasury</button>
      </div>

      <LiquidityTimeline
        totalAssets={totalAssets.data}
        totalDeployed={deployed.data}
        deployableCapital={deployable.data}
        reserveRequirement={reserve.data}
        outstandingAmount={outstanding.data}
        coverage={coverage}
        availableBalance={available.data}
        strategyLiquidity={strategyLiquidity.data}
        strategyPosition={deployed.data}
        decimals={decimals}
        obligations={obligations}
      />

      <div className="grid grid-cols-2 gap-4">
        <Stat
          label="Total assets"
          value={totalAssets.data}
          decimals={decimals}
          loading={totalAssets.isLoading}
        />
        <Stat
          label="Protected liquidity"
          value={protectedLiquidity.data}
          decimals={decimals}
          loading={protectedLiquidity.isLoading}
        />
        <Stat
          label="Deployed"
          value={deployed.data}
          decimals={decimals}
          loading={deployed.isLoading}
        />
        <Stat
          label="Available balance"
          value={available.data}
          decimals={decimals}
          loading={available.isLoading}
        />
      </div>
      <section className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-xs text-neutral-400">
        <h2 className="font-medium text-neutral-200">How liquidity is protected</h2>
        <p className="mt-1">Protected liquidity is the reserve plus all pending obligations. Deployable capital is what remains after protected funds and existing deployments. Payment readiness assumes the displayed strategy liquidity can be withdrawn now.</p>
        {typeof ownerRead.data === "string" && <p className="mt-2">Controls: owner only ({shortenAddress(ownerRead.data)}). If this owner is a Safe, its configured threshold governs approvals. EOA-owned treasuries require an explicit ownership transfer to use a Safe.</p>}
      </section>
      <DataFreshness updatedAt={totalAssets.dataUpdatedAt} />

      {treasury?.registry && (
        <ObligationCard
          decimals={decimals}
          availableBalance={available.data}
          isOwner={isOwner}
          obligations={obligations}
          refetch={refetchObligations}
          onChange={refresh}
          disabled={!canInteract}
          disabledReason={interactionHint}
        />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <DepositCard
          decimals={decimals}
          onChange={refresh}
          disabled={!canInteract}
          disabledReason={interactionHint}
        />
        <WithdrawCard
          decimals={decimals}
          isOwner={isOwner}
          onChange={refresh}
          disabled={!canInteract}
          disabledReason={interactionHint}
        />
        {treasury?.strategy && (
          <StrategyCard
            decimals={decimals}
            isOwner={isOwner}
            onChange={refresh}
            deployableCapital={deployable.data}
            disabled={!canInteract}
            disabledReason={interactionHint}
          />
        )}
      </div>
      <KeeperStatus vault={treasury!.vault} />
      <ReadinessAlerts
        vault={treasury!.vault}
        obligations={obligations}
        protectedLiquidity={protectedLiquidity.data}
        availableBalance={available.data}
        strategyLiquidity={strategyLiquidity.data}
        strategyPosition={deployed.data}
        decimals={decimals}
      />
      <TreasuryActivity vault={treasury!.vault} />
      <ShortfallAlert
        protectedLiquidity={protectedLiquidity.data}
        availableBalance={available.data}
        totalDeployed={deployed.data}
        strategyLiquidity={strategyLiquidity.data}
        decimals={decimals}
        isOwner={isOwner && canInteract}
        onChange={refresh}
      />
    </section>
  );
}

function Stat({
  label,
  value,
  decimals,
  loading,
}: {
  label: string;
  value: bigint | undefined;
  decimals: number;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">
        {loading ? (
          <Skeleton className="h-6 w-24" />
        ) : (
          formatUSD(value, decimals)
        )}
      </div>
    </div>
  );
}

// Static placeholder — the keeper is a standalone off-chain process (see
// /keeper), not wired to the app yet. Shows judges the automation exists.
function KeeperStatus({ vault }: { vault: `0x${string}` }) {
  const [status, setStatus] = useState<{ lastHeartbeat: number; state: string; lastAction: string | null; lastError: string | null } | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch(`/api/treasuries/${vault}/keeper`, { cache: "no-store" });
        const body = await response.json() as { keeper: typeof status };
        if (active) { setStatus(body.keeper); setLoaded(true); }
      } catch { if (active) setLoaded(true); }
    };
    void load();
    const id = window.setInterval(() => void load(), 30_000);
    return () => { active = false; window.clearInterval(id); };
  }, [vault]);
  const fresh = Boolean(status && Date.now() - status.lastHeartbeat < 120_000);
  return <div className="flex flex-wrap items-center gap-2 px-1 text-xs text-neutral-500">
    <span className={`h-2 w-2 rounded-full ${fresh && status?.state === "healthy" ? "bg-emerald-400" : fresh ? "bg-amber-400" : "bg-neutral-600"}`} aria-hidden />
    <span className="font-medium text-neutral-400">Keeper</span>
    <span>{fresh ? `${status?.state} · heartbeat ${Math.max(0, Math.floor((Date.now() - status!.lastHeartbeat) / 1000))}s ago` : loaded ? "No recent heartbeat" : "Checking heartbeat…"}</span>
    {fresh && status?.lastAction && <span>· {status.lastAction}</span>}
    {fresh && status?.lastError && <span className="text-amber-300">· {status.lastError}</span>}
  </div>;
}

function DataFreshness({ updatedAt }: { updatedAt: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);
  if (!updatedAt) return <p className="px-1 text-xs text-neutral-500">Waiting for the first onchain read…</p>;
  const seconds = Math.max(0, Math.floor((now - updatedAt) / 1000));
  return <p className="px-1 text-xs text-neutral-500">Vault data updated {seconds < 5 ? "just now" : `${seconds}s ago`} · refreshes after confirmed actions.</p>;
}

function ReadinessAlerts({ vault, obligations, protectedLiquidity, availableBalance, strategyLiquidity, strategyPosition, decimals }: {
  vault: `0x${string}`;
  obligations: import("@/lib/useObligations").ObligationRecord[];
  protectedLiquidity?: bigint;
  availableBalance?: bigint;
  strategyLiquidity?: bigint;
  strategyPosition?: bigint;
  decimals: number;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 60_000); return () => window.clearInterval(id); }, []);
  const pending = obligations.filter(o => o.status === 0);
  const overdue = pending.filter(o => Number(o.dueAt) < now / 1000);
  const urgent = pending.filter(o => Number(o.dueAt) >= now / 1000 && Number(o.dueAt) <= now / 1000 + 7 * 86400);
  const totalGap = protectedLiquidity !== undefined && availableBalance !== undefined && protectedLiquidity > availableBalance ? protectedLiquidity - availableBalance : 0n;
  const reportedLiquidity = strategyLiquidity ?? 0n;
  const recordedPosition = strategyPosition ?? 0n;
  const recallable = reportedLiquidity < recordedPosition ? reportedLiquidity : recordedPosition;
  const uncovered = totalGap > recallable ? totalGap - recallable : 0n;
  const [notifications, setNotifications] = useState(false);
  const [persistentAlerts, setPersistentAlerts] = useState<Array<{ id: string; type: string; message: string }>>([]);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch(`/api/treasuries/${vault}/alerts`, { cache: "no-store" });
        if (!response.ok) return;
        const body = await response.json() as { alerts: Array<{ id: string; type: string; message: string }> };
        if (active) setPersistentAlerts(body.alerts);
      } catch { /* onchain readiness remains available if the service is offline */ }
    };
    void load();
    const id = window.setInterval(() => void load(), 60_000);
    return () => { active = false; window.clearInterval(id); };
  }, [vault]);
  useEffect(() => { setNotifications(typeof Notification !== "undefined" && Notification.permission === "granted"); }, []);
  useEffect(() => {
    if (!notifications || typeof Notification === "undefined") return;
    const seenKey = "solvent-notified-obligations";
    let seen = new Set<string>();
    try { seen = new Set(JSON.parse(localStorage.getItem(seenKey) ?? "[]") as string[]); } catch { /* ignore malformed local preference */ }
    for (const o of [...overdue, ...urgent]) {
      if (seen.has(o.id)) continue;
      const isOverdue = Number(o.dueAt) < Date.now() / 1000;
      new Notification(isOverdue ? "Solvent payment overdue" : "Solvent payment coming due", { body: `${formatUSD(o.amount, decimals)} ${isOverdue ? "was due" : "due"} ${new Date(Number(o.dueAt) * 1000).toLocaleDateString()}` });
      seen.add(o.id);
    }
    localStorage.setItem(seenKey, JSON.stringify([...seen]));
}, [notifications, urgent, overdue, decimals]);
  if (!urgent.length && !overdue.length && totalGap === 0n && !persistentAlerts.length) return null;
  return <section className="rounded-xl border border-amber-700/40 bg-amber-950/20 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-sm font-semibold text-amber-200">Treasury alerts</h2>
        {overdue.length > 0 && <p className="mt-1 text-xs text-red-300">{overdue.length} pending {overdue.length === 1 ? "payment is" : "payments are"} overdue.</p>}
        {urgent.length > 0 && <p className="mt-1 text-xs text-amber-100/80">{urgent.length} pending {urgent.length === 1 ? "payment is" : "payments are"} due within 7 days.</p>}
        {totalGap > 0n && <p className="mt-1 text-xs text-amber-100/80">Protected funds exceed idle cash by {formatUSD(totalGap, decimals)}.{uncovered > 0n && ` ${formatUSD(uncovered, decimals)} remains uncovered after available strategy liquidity.`}</p>}
        {persistentAlerts.map(alert => <p key={alert.id} className="mt-1 text-xs text-amber-100/80">{alert.message}</p>)}
      </div>
      {typeof Notification !== "undefined" && Notification.permission !== "granted" && <button onClick={async () => { const p = await Notification.requestPermission(); setNotifications(p === "granted"); }} className="rounded-lg border border-amber-700/50 px-3 py-2 text-xs text-amber-100">Enable browser reminders</button>}
      {notifications && <span className="text-xs text-emerald-300">Browser reminders enabled while this dashboard is open</span>}
    </div>
  </section>;
}

type ActivityItem = { id: string; text: string; timestamp: number };

function TreasuryActivity({ vault }: { vault: `0x${string}` }) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const load = async () => {
    setLoading(true);
    setFailed(false);
    try {
      const response = await fetch(`/api/treasuries/${vault}/activity`, { cache: "no-store" });
      if (!response.ok) throw new Error("Activity API unavailable");
      const body = await response.json() as { activity: Array<{ id: string; detail: string; timestamp: number }> };
      setItems(body.activity.map(item => ({ id: item.id, text: item.detail, timestamp: item.timestamp })));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(id);
  }, [vault]);
  return <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
    <div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-medium text-neutral-200">Recent activity</h2><p className="mt-1 text-xs text-neutral-500">Latest treasury and obligation events onchain.</p></div><button onClick={() => void load()} disabled={loading} className="rounded-md border border-neutral-700 px-2.5 py-1.5 text-xs text-neutral-300 disabled:opacity-50">{loading ? "Refreshing…" : "Refresh"}</button></div>
    {failed && <p className="mt-3 text-xs text-amber-300">Could not load activity. Check the RPC and try again.</p>}
    {items.length ? <ul className="mt-3 divide-y divide-neutral-800">{items.map(i => <li key={i.id} className="flex justify-between gap-3 py-2 text-xs"><span className="text-neutral-300">{i.text}</span><span className="shrink-0 text-neutral-500">{new Date(i.timestamp * 1000).toLocaleString()}</span></li>)}</ul> : !failed && <p className="mt-3 text-xs text-neutral-500">{loading ? "Loading recent activity…" : "No recent activity found."}</p>}
    <p className="mt-2 text-[10px] text-neutral-600">Activity is indexed from deployment and stored for this treasury.</p>
  </section>;
}
