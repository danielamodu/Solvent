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

  return <section className="neo-card-lg mx-auto w-full max-w-xl p-5">
    <div className="flex items-start justify-between gap-3">
      <div><h2 className="cabinet text-lg uppercase tracking-tight">Set up your treasury</h2><p className="mt-1 text-sm text-black/50">Create a testnet treasury or connect to an existing one.</p></div>
      {onCancel && <button onClick={onCancel} className="text-xs font-bold text-black underline decoration-2 underline-offset-2">Back to treasury</button>}
    </div>
    {!isConnected && <p className="mt-4 border-2 border-black bg-black/5 p-3 text-xs text-black/70">Connect a wallet to discover treasuries owned by that wallet or create one.</p>}
    {isConnected && !correctNetwork && <div className="mt-4 flex items-center justify-between gap-3 border-2 border-l-4 border-black border-l-[#ffe17c] bg-black/5 p-3"><span className="text-xs font-semibold text-black/70">Switch to Arbitrum Sepolia to manage this testnet deployment.</span><button onClick={() => switchChain({ chainId: CHAIN_ID })} className="neo-btn neo-btn-primary shrink-0">Switch network</button></div>}
    {isConnected && treasuryFactoryAddress && (ownerTreasuries.data?.length ?? 0) > 0 && <div className="mt-4"><label className="text-xs text-black/50">Treasuries owned by {shortenAddress(account!)}</label><div className="mt-2 flex flex-wrap gap-2">{ownerTreasuries.data?.map(vault => <button key={vault} onClick={() => { setVaultText(vault); setMode("connect"); }} className="border-2 border-black bg-white px-3 py-2 text-xs font-bold text-black transition-colors hover:bg-[#ffe17c]">{shortenAddress(vault)}</button>)}</div></div>}
    <div className="mt-5 flex gap-2 border-b-2 border-black pb-3"><button onClick={() => setMode("create")} className={`cabinet border-2 px-3 py-1.5 text-xs uppercase tracking-wider transition-colors ${mode === "create" ? "border-black bg-[#ffe17c] text-black" : "border-transparent text-black/50 hover:text-black"}`}>Create</button><button onClick={() => setMode("connect")} className={`cabinet border-2 px-3 py-1.5 text-xs uppercase tracking-wider transition-colors ${mode === "connect" ? "border-black bg-[#ffe17c] text-black" : "border-transparent text-black/50 hover:text-black"}`}>Connect existing</button></div>
    {mode === "create" ? <div className="mt-4 space-y-3">
      <p className="text-xs leading-5 text-black/60">Use the official Aave Arbitrum Sepolia USDC below for the Aave testnet lending strategy. Interest accrues only when reserve conditions produce it. Other tokens, including your own Solvent USD (SUSD), get the principal-only strategy.</p>
      {!treasuryFactoryAddress && <p className="border-2 border-l-4 border-black border-l-[#ffe17c] bg-black/5 p-3 text-xs text-black/70">TreasuryFactory is not configured yet. Deploy the factory, then set NEXT_PUBLIC_TREASURY_FACTORY_ADDRESS and restart the app.</p>}
      <label className="block text-xs font-bold text-black/60">Token address (SUSD or USDC)<input value={assetText} onChange={e => setAssetText(e.target.value)} placeholder="0x…" className="neo-input mt-1 text-xs" /></label>
      <p className="text-[11px] text-black/50">Aave Arbitrum Sepolia USDC: <code className="select-all">0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d</code>. Get this test token from the Aave testnet Faucet; your own SUSD is not accepted by Aave.</p>
      {tokenDecimals.data !== undefined && <p className="text-[11px] text-black/50">Token responds on Arbitrum Sepolia · {tokenDecimals.data} decimals</p>}
      <label className="block text-xs font-bold text-black/60">Reserve amount<input value={reserveText} onChange={e => setReserveText(e.target.value)} inputMode="decimal" placeholder="0" className="neo-input mt-1" /></label>
      <button onClick={() => { setError(""); if (!asset || reserveUnits === null || reserveUnits === undefined || !canCreate) return; writeContract({ address: treasuryFactoryAddress!, abi: treasuryFactoryAbi, functionName: "createTreasury", args: [asset, reserveUnits], chainId: CHAIN_ID }); }} disabled={!canCreate} className="neo-btn neo-btn-primary w-full"><BusyLabel busy={isPending || receipt.isLoading}>{receipt.isLoading ? "Waiting for confirmation…" : isPending ? "Confirm in wallet…" : "Create treasury"}</BusyLabel></button>
      {txHash && <a href={`https://sepolia.arbiscan.io/tx/${txHash}`} target="_blank" rel="noreferrer" className="block text-xs font-bold text-black underline decoration-2 underline-offset-2">View creation transaction ↗</a>}
      {receipt.isError && <p className="text-xs font-bold text-[#ef4444]">Creation transaction failed. Check the selected network and token contract.</p>}
      {txError && <p className="break-words text-xs font-bold text-[#ef4444]">{txError.message}</p>}
    </div> : <div className="mt-4 space-y-3">
      <p className="text-xs leading-5 text-black/60">Connect any verified Solvent vault on Arbitrum Sepolia. Viewing is public; owner actions remain protected by the contract. An optional strategy must be wired to this vault and asset.</p>
      <label className="block text-xs font-bold text-black/60">Vault address<input value={vaultText} onChange={e => setVaultText(e.target.value)} placeholder="0x…" className="neo-input mt-1 text-xs" /></label>
      <label className="block text-xs font-bold text-black/60">Strategy address (optional)<input value={strategyText} onChange={e => setStrategyText(e.target.value)} placeholder="0x…" className="neo-input mt-1 text-xs" /></label>
      <button onClick={() => void connectExisting()} disabled={busy || !vaultText || !publicClient} className="neo-btn neo-btn-primary w-full"><BusyLabel busy={busy}>{busy ? "Verifying contracts…" : "Connect treasury"}</BusyLabel></button>
    </div>}
    {error && <p className="mt-3 break-words border-2 border-[#ef4444] bg-[#ef4444]/10 p-3 text-xs font-semibold text-[#ef4444]">{error}</p>}
    {!isConnected && <p className="mt-3 text-[11px] text-black/50">Wallet connection is handled from the top of the page.</p>}
  </section>;
}
