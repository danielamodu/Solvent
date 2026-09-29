"use client";

import SafeAppsSDK, { type SafeInfoExtended } from "@safe-global/safe-apps-sdk";
import { SafeAppProvider } from "@safe-global/safe-apps-provider";
import { createConnector } from "wagmi";
import { getAddress } from "viem";

/** EIP-1193 connector for running Solvent inside the Safe web app. */
export function safeAppConnector() {
  return createConnector((config) => {
    let sdk: SafeAppsSDK | undefined;
    let safeInfo: SafeInfoExtended | undefined;
    let provider: SafeAppProvider | undefined;

    const isEmbedded = () => typeof window !== "undefined" && window.parent !== window;
    const initialize = async () => {
      if (!isEmbedded()) throw new Error("Safe connector is only available inside Safe.");
      if (safeInfo && sdk && provider) return { sdk, safeInfo, provider };
      sdk = new SafeAppsSDK({ allowedDomains: [/^https:\/\/app\.safe\.global$/] });
      safeInfo = await Promise.race([
        sdk.safe.getInfo(),
        new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error("Safe connection timed out.")), 2500)),
      ]);
      provider = new SafeAppProvider(safeInfo, sdk);
      return { sdk, safeInfo, provider };
    };

    return {
      id: "safe-app",
      name: "Safe",
      type: "safeApp" as const,
      async connect<withCapabilities extends boolean = false>(parameters?: { chainId?: number; withCapabilities?: withCapabilities | boolean }) {
        const { chainId, withCapabilities } = parameters ?? {};
        const { safeInfo, provider } = await initialize();
        if (chainId && chainId !== safeInfo.chainId) {
          throw new Error("Open this Safe on Arbitrum Sepolia to continue.");
        }
        if (safeInfo.isReadOnly) throw new Error("This Safe connection is read-only.");
        await provider.connect();
        const safeAddress = getAddress(safeInfo.safeAddress);
        const accounts = withCapabilities
          ? [{ address: safeAddress, capabilities: {} }]
          : [safeAddress];
        return { accounts: accounts as unknown as withCapabilities extends true ? readonly { address: `0x${string}`; capabilities: Record<string, unknown> }[] : readonly `0x${string}`[], chainId: safeInfo.chainId };
      },
      async disconnect() {
        await provider?.disconnect();
      },
      async getAccounts() {
        try {
          const { safeInfo } = await initialize();
          return [getAddress(safeInfo.safeAddress)];
        } catch {
          return [];
        }
      },
      async getChainId() {
        const { safeInfo } = await initialize();
        return safeInfo.chainId;
      },
      async getProvider() {
        return (await initialize()).provider;
      },
      async isAuthorized() {
        try {
          const { safeInfo } = await initialize();
          return !safeInfo.isReadOnly;
        } catch {
          return false;
        }
      },
      async switchChain({ chainId }) {
        const chain = config.chains.find((candidate) => candidate.id === chainId);
        if (!chain) throw new Error(`Unsupported Safe network: ${chainId}`);
        const { safeInfo } = await initialize();
        if (safeInfo.chainId !== chainId) throw new Error("Change networks from the Safe app, then reconnect.");
        return chain;
      },
      onAccountsChanged(accounts) {
        config.emitter.emit("change", { accounts: accounts.map((account) => getAddress(account)) });
      },
      onChainChanged(chainId) {
        const id = Number(chainId);
        if (Number.isFinite(id)) config.emitter.emit("change", { chainId: id });
      },
      onConnect(connectInfo) {
        config.emitter.emit("connect", { accounts: [getAddress(safeInfo!.safeAddress)], chainId: Number(connectInfo.chainId) });
      },
      onDisconnect() {
        config.emitter.emit("disconnect");
      },
    };
  });
}
