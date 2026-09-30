# Shared layouts and app shell

## Root layout — `app/layout.tsx`

Wraps all pages with the global stylesheet and application providers.

```tsx
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Solvent",
  description: "Obligation-aware programmable treasury protocol",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><Providers>{children}</Providers></body></html>;
}
```

## Current dashboard page — `app/page.tsx`

The page contains a header with the product name and ConnectKit wallet control, followed by the Vault dashboard.

```tsx
"use client";

import { ConnectKitButton } from "connectkit";
import { Vault } from "./components/Vault";

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-16">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Solvent</h1>
            <p className="mt-1 text-sm text-neutral-400">Obligation-aware treasury — deposit, deploy surplus, never break a promise</p>
          </div>
          <ConnectKitButton />
        </header>
        <Vault />
      </div>
    </main>
  );
}
```

## Providers — `app/providers.tsx`

Wagmi and React Query wallet clients, ConnectKit, Safe Apps connector, and treasury configuration context.

```tsx
"use client";

import { ReactNode, useState } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider } from "connectkit";
import { TreasuryProvider } from "@/lib/treasury-context";
import { safeAppConnector } from "@/lib/safe-app-connector";

const config = createConfig({
  chains: [arbitrumSepolia],
  connectors: [safeAppConnector(), injected()],
  transports: { [arbitrumSepolia.id]: http(process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC) },
  ssr: true,
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return <WagmiProvider config={config}><QueryClientProvider client={queryClient}><ConnectKitProvider><TreasuryProvider>{children}</TreasuryProvider></ConnectKitProvider></QueryClientProvider></WagmiProvider>;
}
```
