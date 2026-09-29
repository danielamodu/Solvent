"use client";

import { ReactNode, useState } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider } from "connectkit";
import { TreasuryProvider } from "@/lib/treasury-context";
import { safeAppConnector } from "@/lib/safe-app-connector";

// Foundation phase: a minimal wagmi config for Arbitrum Sepolia with an
// injected (browser wallet) connector. Financial logic is intentionally absent.
const config = createConfig({
  chains: [arbitrumSepolia],
  connectors: [safeAppConnector(), injected()],
  transports: {
    // Falls back to the chain's public RPC when the env var is unset.
    [arbitrumSepolia.id]: http(process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC),
  },
  ssr: true,
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider>
          <TreasuryProvider>{children}</TreasuryProvider>
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
