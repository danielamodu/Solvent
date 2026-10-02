"use client";

import Link from "next/link";
import { ConnectKitButton } from "connectkit";
import { Zap, ArrowLeft } from "lucide-react";

type Tab = "overview" | "obligations" | "liquidity" | "deploy" | "connect";

const TABS: { label: string; href: string; key: Tab }[] = [
  { label: "Overview", href: "/dashboard", key: "overview" },
  { label: "Obligations", href: "/obligations", key: "obligations" },
  { label: "Liquidity", href: "/liquidity", key: "liquidity" },
  { label: "Deploy", href: "/deploy", key: "deploy" },
];

/**
 * Dark neo-brutalist workspace header. Mirrors the Superdesign WorkspaceHeader
 * component (activeTab + nav tabs + back + connect CTA); routes are the app's
 * real routes rather than draft preview URLs.
 */
export function WorkspaceHeader({
  active,
  backHref = "/",
}: {
  active?: Tab;
  backHref?: string;
}) {
  return (
    <header className="sticky top-0 z-50 border-b-2 border-black bg-[#171e19]">
      <div className="mx-auto flex min-h-[72px] w-full max-w-[1440px] flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3 md:px-10">
        <Link href="/" className="flex items-center gap-3" aria-label="Solvent home">
          <span className="flex h-9 w-9 items-center justify-center border-2 border-black bg-[#ffe17c]">
            <Zap className="h-5 w-5 text-black" strokeWidth={2.5} aria-hidden="true" />
          </span>
          <span className="cabinet text-xl uppercase tracking-tighter text-white">
            Solvent
          </span>
        </Link>

        <nav
          className="order-3 flex w-full items-center gap-1 overflow-x-auto md:order-none md:w-auto"
          aria-label="Treasury navigation"
        >
          {TABS.map((tab) => {
            const isActive = active === tab.key;
            return (
              <Link
                key={tab.key}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={`cabinet whitespace-nowrap border-2 px-3 py-1.5 text-xs uppercase tracking-wider transition-colors ${
                  isActive
                    ? "border-black bg-[#ffe17c] text-black"
                    : "border-transparent text-[#b7c6c2] hover:text-white"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <Link
            href={backHref}
            className="hidden items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#b7c6c2] transition-colors hover:text-white sm:flex"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back
          </Link>
          <div className="workspace-wallet">
            <ConnectKitButton />
          </div>
        </div>
      </div>
    </header>
  );
}

/**
 * Slim neo-brutalist footer with network info and links. Mirrors the
 * Superdesign WorkspaceFooter component.
 */
export function WorkspaceFooter({
  lastUpdated,
  docsHref = "#docs",
  supportHref = "#support",
}: {
  lastUpdated?: string;
  docsHref?: string;
  supportHref?: string;
}) {
  return (
    <footer className="border-t-2 border-black bg-[#171e19]">
      <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center gap-x-6 gap-y-3 px-5 py-5 text-xs md:px-10">
        <span className="inline-flex items-center gap-2 font-bold uppercase tracking-wider text-[#ffe17c]">
          <span className="h-2 w-2 rounded-full bg-[#ffe17c]" aria-hidden="true" />
          Arbitrum Sepolia
        </span>
        {lastUpdated && (
          <span className="text-[#b7c6c2]/70">Updated {lastUpdated}</span>
        )}
        <nav className="ml-auto flex items-center gap-5 text-[#b7c6c2]" aria-label="Footer navigation">
          <a href={docsHref} className="transition-colors hover:text-white">Docs</a>
          <a href={supportHref} className="transition-colors hover:text-white">Support</a>
          <Link href="/" className="transition-colors hover:text-white">Home</Link>
        </nav>
      </div>
    </footer>
  );
}
