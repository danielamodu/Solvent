"use client";

import { useEffect, useRef, useState } from "react";
import { getAddress, isAddress, parseUnits, zeroAddress, type Address } from "viem";
import { useAccount, usePublicClient, useReadContract, useSwitchChain, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import {
  CHAIN_ID,
  erc20Abi,
  MOCK_STRATEGY_ABI,
  OBLIGATION_REGISTRY_ABI,
  treasuryFactoryAbi,
  treasuryFactoryAddress,
  treasuryVaultAbi,
} from "@/lib/contracts";
import { usdcAddress } from "@/lib/contracts";
import type { TreasuryConfig } from "@/lib/treasury-context";
import { shortenAddress } from "@/lib/format";
import { BusyLabel } from "./ui";

export function TreasurySetup({ onSelect, onCancel }: {
  onSelect: (treasury: TreasuryConfig) => void;
  onCancel?: () => void;
}) {
  const { address: account, isConnected, chainId } = useAccount();
  const publicClient = usePublicClient({ chainId: CHAIN_ID });
  const { switchChain } = useSwitchChain();
  const [mode, setMode] = useState<"create" | "connect">("create");
  const [assetText, setAssetText] = useState(usdcAddress ?? "");
  const [reserveText, setReserveText] = useState("0");
  const [vaultText, setVaultText] = useState("");
  const [strategyText, setStrategyText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reserveInvalid, setReserveInvalid] = useState(false);
  const processedTx = useRef<string | undefined>(undefined);
  const { writeContract, data: txHash, isPending, error: txError } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: txHash });

  const asset = isAddress(assetText) ? getAddress(assetText) : undefined;
  const tokenDecimals = useReadContract({
    address: asset,
    abi: erc20Abi,
    functionName: "decimals",
    chainId: CHAIN_ID,
    query: { enabled: Boolean(asset) },
  });
  const reserveUnits = (() => {
    if (!reserveText || tokenDecimals.data === undefined) return null;
    try { return parseUnits(reserveText, Number(tokenDecimals.data)); } catch { return null; }
  })();
  const ownerTreasuries = useReadContract({
    address: treasuryFactoryAddress,
    abi: treasuryFactoryAbi,
    functionName: "getTreasuries",
    args: [account ?? zeroAddress],
    chainId: CHAIN_ID,
    query: { enabled: Boolean(treasuryFactoryAddress && account) },
  });

  useEffect(() => {
    if (receipt.data?.status !== "success" || !account || !publicClient || !treasuryFactoryAddress || !txHash || processedTx.current === txHash) return;
    processedTx.current = txHash;
    let cancelled = false;
    void (async () => {
      try {
        const vaults = await publicClient.readContract({
          address: treasuryFactoryAddress,
          abi: treasuryFactoryAbi,
          functionName: "getTreasuries",
          args: [account],
        });
        const vault = vaults[vaults.length - 1];
        if (!vault) throw new Error("Factory transaction confirmed, but no treasury was returned.");
        const [registry, strategy, token] = await Promise.all([
          publicClient.readContract({ address: treasuryFactoryAddress, abi: treasuryFactoryAbi, functionName: "registryForVault", args: [vault] }),
          publicClient.readContract({ address: treasuryFactoryAddress, abi: treasuryFactoryAbi, functionName: "strategyForVault", args: [vault] }),
          publicClient.readContract({ address: vault, abi: treasuryVaultAbi, functionName: "asset" }),
        ]);
        if (!cancelled) onSelect({ vault, registry, strategy, asset: token });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load the new treasury.");
      }
    })();
    return () => { cancelled = true; };
  }, [receipt.data?.status, account, publicClient, onSelect, txHash]);

  async function connectExisting() {
    setError("");
    if (!publicClient || !isAddress(vaultText)) return setError("Enter a valid vault address.");
    setBusy(true);
    try {
      const vault = getAddress(vaultText);
      const code = await publicClient.getCode({ address: vault });
      if (!code || code === "0x") throw new Error("No contract was found at that address on Arbitrum Sepolia.");
      const [registry, assetAddress] = await Promise.all([
        publicClient.readContract({ address: vault, abi: treasuryVaultAbi, functionName: "obligationRegistry" }),
        publicClient.readContract({ address: vault, abi: treasuryVaultAbi, functionName: "asset" }),
      ]);
      if (registry === zeroAddress) throw new Error("This vault has no obligation registry configured.");
      const registryVault = await publicClient.readContract({ address: registry, abi: OBLIGATION_REGISTRY_ABI, functionName: "vault" });
      if (registryVault.toLowerCase() !== vault.toLowerCase()) throw new Error("The vault and registry do not point to each other.");

      let strategy: Address | undefined;
      if (strategyText.trim()) {
        if (!isAddress(strategyText)) throw new Error("Enter a valid strategy address.");
        strategy = getAddress(strategyText);
        const [strategyVault, strategyAsset] = await Promise.all([
          publicClient.readContract({ address: strategy, abi: MOCK_STRATEGY_ABI, functionName: "vault" }),
          publicClient.readContract({ address: strategy, abi: MOCK_STRATEGY_ABI, functionName: "asset" }),
        ]);
        if (strategyVault.toLowerCase() !== vault.toLowerCase()) throw new Error("This strategy was created for a different vault.");
        if (strategyAsset.toLowerCase() !== assetAddress.toLowerCase()) throw new Error("The strategy asset does not match the vault asset.");
      }
      onSelect({ vault, registry, asset: assetAddress, ...(strategy ? { strategy } : {}) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect to this treasury.");
    } finally {
      setBusy(false);
    }
  }

  const correctNetwork = chainId === CHAIN_ID;
  const canCreate = Boolean(isConnected && correctNetwork && treasuryFactoryAddress && asset && reserveUnits !== null && reserveUnits !== undefined && !isPending && !receipt.isLoading);

  return <section className="mx-auto w-full max-w-xl rounded-xl border border-neutral-800 bg-neutral-900 p-5">
    <div className="flex items-start justify-between gap-3">
      <div><h2 className="text-lg font-semibold text-neutral-100">Set up your treasury</h2><p className="mt-1 text-sm text-neutral-400">Create a testnet treasury or connect to an existing one.</p></div>
      {onCancel && <button onClick={onCancel} className="text-xs text-neutral-400 underline">Back to treasury</button>}
    </div>
    {!isConnected && <p className="mt-4 rounded-lg border border-neutral-800 bg-neutral-950 p-3 text-xs text-neutral-300">Connect a wallet to discover treasuries owned by that wallet or create one.</p>}
    {isConnected && !correctNetwork && <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-amber-700/40 bg-amber-950/20 p-3"><span className="text-xs text-amber-100">Switch to Arbitrum Sepolia to manage this testnet deployment.</span><button onClick={() => switchChain({ chainId: CHAIN_ID })} className="rounded bg-amber-400 px-3 py-2 text-xs font-medium text-neutral-900">Switch network</button></div>}
    {isConnected && treasuryFactoryAddress && (ownerTreasuries.data?.length ?? 0) > 0 && <div className="mt-4"><label className="text-xs text-neutral-400">Treasuries owned by {shortenAddress(account!)}</label><div className="mt-2 flex flex-wrap gap-2">{ownerTreasuries.data?.map(vault => <button key={vault} onClick={() => { setVaultText(vault); setMode("connect"); }} className="rounded-md border border-neutral-700 px-3 py-2 text-xs text-neutral-200">{shortenAddress(vault)}</button>)}</div></div>}
    <div className="mt-5 flex gap-2 border-b border-neutral-800 pb-3"><button onClick={() => setMode("create")} className={`rounded-md px-3 py-2 text-xs ${mode === "create" ? "bg-white text-neutral-900" : "text-neutral-400"}`}>Create</button><button onClick={() => setMode("connect")} className={`rounded-md px-3 py-2 text-xs ${mode === "connect" ? "bg-white text-neutral-900" : "text-neutral-400"}`}>Connect existing</button></div>
    {mode === "create" ? <div className="mt-4 space-y-3">
      <p className="text-xs leading-5 text-neutral-400">Use the official Aave Arbitrum Sepolia USDC below to create a treasury with live testnet lending yield. Other tokens, including your custom Mock USDC, get the principal-only strategy.</p>
      {!treasuryFactoryAddress && <p className="rounded-lg border border-amber-700/40 bg-amber-950/20 p-3 text-xs text-amber-100">TreasuryFactory is not configured yet. Deploy the factory, then set NEXT_PUBLIC_TREASURY_FACTORY_ADDRESS and restart the app.</p>}
      <label className="block text-xs text-neutral-400">USDC token address<input value={assetText} onChange={e => setAssetText(e.target.value)} placeholder="0x…" className="mt-1 w-full rounded-lg bg-neutral-800 px-3 py-2 text-xs text-neutral-100 outline-none focus:ring-1 focus:ring-neutral-600" /></label>
      <p className="text-[11px] text-neutral-500">Aave Arbitrum Sepolia USDC: <code className="select-all">0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d</code>. Get this test token from the Aave testnet Faucet; your own mock USDC is not accepted by Aave.</p>
      {tokenDecimals.data !== undefined && <p className="text-[11px] text-neutral-500">Token responds on Arbitrum Sepolia · {tokenDecimals.data} decimals</p>}
      <label className="block text-xs text-neutral-400">Reserve amount<input value={reserveText} onChange={e => setReserveText(e.target.value)} inputMode="decimal" placeholder="0" className="mt-1 w-full rounded-lg bg-neutral-800 px-3 py-2 text-sm text-neutral-100 outline-none focus:ring-1 focus:ring-neutral-600" /></label>
      <button onClick={() => { setError(""); if (!asset || reserveUnits === null || reserveUnits === undefined || !canCreate) return; writeContract({ address: treasuryFactoryAddress!, abi: treasuryFactoryAbi, functionName: "createTreasury", args: [asset, reserveUnits], chainId: CHAIN_ID }); }} disabled={!canCreate} className="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 disabled:opacity-40"><BusyLabel busy={isPending || receipt.isLoading}>{receipt.isLoading ? "Waiting for confirmation…" : isPending ? "Confirm in wallet…" : "Create treasury"}</BusyLabel></button>
      {txHash && <a href={`https://sepolia.arbiscan.io/tx/${txHash}`} target="_blank" rel="noreferrer" className="block text-xs text-neutral-400 underline">View creation transaction ↗</a>}
      {receipt.isError && <p className="text-xs text-red-400">Creation transaction failed. Check the selected network and token contract.</p>}
      {txError && <p className="break-words text-xs text-red-400">{txError.message}</p>}
    </div> : <div className="mt-4 space-y-3">
      <p className="text-xs leading-5 text-neutral-400">Connect any verified Solvent vault on Arbitrum Sepolia. Viewing is public; owner actions remain protected by the contract. An optional strategy must be wired to this vault and asset.</p>
      <label className="block text-xs text-neutral-400">Vault address<input value={vaultText} onChange={e => setVaultText(e.target.value)} placeholder="0x…" className="mt-1 w-full rounded-lg bg-neutral-800 px-3 py-2 text-xs text-neutral-100 outline-none focus:ring-1 focus:ring-neutral-600" /></label>
      <label className="block text-xs text-neutral-400">Strategy address (optional)<input value={strategyText} onChange={e => setStrategyText(e.target.value)} placeholder="0x…" className="mt-1 w-full rounded-lg bg-neutral-800 px-3 py-2 text-xs text-neutral-100 outline-none focus:ring-1 focus:ring-neutral-600" /></label>
      <button onClick={() => void connectExisting()} disabled={busy || !vaultText || !publicClient} className="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 disabled:opacity-40"><BusyLabel busy={busy}>{busy ? "Verifying contracts…" : "Connect treasury"}</BusyLabel></button>
    </div>}
    {error && <p className="mt-3 break-words rounded-lg border border-red-700/40 bg-red-950/20 p-3 text-xs text-red-300">{error}</p>}
    {!isConnected && <p className="mt-3 text-[11px] text-neutral-500">Wallet connection is handled from the top of the page.</p>}
  </section>;
}
