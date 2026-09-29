"use client";

import Link from "next/link";
import { ConnectKitButton } from "connectkit";

const links = [
  ["Dashboard", "/dashboard", "dashboard"],
  ["Obligations", "/obligations", "obligations"],
  ["Liquidity", "/liquidity", "liquidity"],
  ["Deploy", "/deploy", "deploy"],
] as const;

export function SolventNav({ active, marketing = false }: { active?: string; marketing?: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-blue-900/10 bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-[76px] max-w-[1280px] items-center justify-between gap-4 px-5 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="Solvent home">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-700 text-lg font-bold text-white">S</span>
          <span className="text-lg font-extrabold tracking-tight text-slate-900">solvent<span className="text-blue-700">.</span></span>
        </Link>
        {marketing ? (
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#product" className="transition hover:text-blue-700">Product</a>
            <a href="#how-it-works" className="transition hover:text-blue-700">How it works</a>
            <Link href="/dashboard" className="transition hover:text-blue-700">Dashboard</Link>
          </nav>
        ) : (
          <nav className="hidden items-center gap-1 md:flex">
            {links.map(([label, href, key]) => (
              <Link key={key} href={href} aria-current={active === key ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${active === key ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
                {label}
              </Link>
            ))}
          </nav>
        )}
        <div className="flex shrink-0 items-center gap-2">
          <ConnectKitButton />
        </div>
      </div>
    </header>
  );
}

export function SolventFooter({ marketing = false }: { marketing?: boolean }) {
  return <footer className="border-t border-slate-200 bg-white">
    <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-5 py-7 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
      <div><span className="font-bold text-slate-800">solvent.</span><span className="ml-2">Treasury clarity, onchain.</span></div>
      <div className="flex flex-wrap gap-x-5 gap-y-2"><Link href="/dashboard" className="hover:text-blue-700">Dashboard</Link><Link href="/obligations" className="hover:text-blue-700">Obligations</Link><Link href="/liquidity" className="hover:text-blue-700">Liquidity</Link>{marketing && <a href="#product" className="hover:text-blue-700">Product</a>}</div>
      <span>Arbitrum Sepolia · Testnet</span>
    </div>
  </footer>;
}
