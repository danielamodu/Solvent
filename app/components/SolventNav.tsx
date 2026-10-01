"use client";

import Link from "next/link";
import { ConnectKitButton } from "connectkit";

const links = [
  ["Overview", "/dashboard", "dashboard"],
  ["Obligations", "/obligations", "obligations"],
  ["Liquidity", "/liquidity", "liquidity"],
  ["Deployment", "/deploy", "deploy"],
] as const;

export function SolventNav({ active, marketing = false }: { active?: string; marketing?: boolean }) {
  return (
    <header className={`solvent-header ${marketing ? "solvent-header-marketing" : ""}`}>
      <div className="solvent-header-inner">
        <Link href="/" className="solvent-brand" aria-label="Solvent home">
          <span className="solvent-brand-mark" aria-hidden="true">S</span>
          <span>solvent<span className="brand-period">.</span></span>
        </Link>
        {marketing ? (
          <nav className="solvent-nav-links" aria-label="Main navigation">
            <a href="#product">Product</a>
            <a href="#how-it-works">How it works</a>
            <Link href="/dashboard">App</Link>
          </nav>
        ) : (
          <nav className="solvent-nav-links app-nav-links" aria-label="Treasury navigation">
            {links.map(([label, href, key]) => (
              <Link key={key} href={href} aria-current={active === key ? "page" : undefined} className={active === key ? "active" : ""}>
                {label}
              </Link>
            ))}
          </nav>
        )}
        <div className="solvent-wallet"><ConnectKitButton /></div>
      </div>
    </header>
  );
}

export function SolventFooter({ marketing = false }: { marketing?: boolean }) {
  if (marketing) {
    return (
      <footer className="solvent-footer solvent-footer-marketing">
        <div className="footer-main">
          <div className="footer-about">
            <Link href="/" className="solvent-footer-brand">solvent<span>.</span></Link>
            <p>Payment commitments and treasury liquidity, brought into one onchain view.</p>
            <span className="footer-tagline">Treasury clarity, onchain.</span>
          </div>
          <div className="footer-column"><h2>Workspace</h2><Link href="/dashboard">Overview</Link><Link href="/obligations">Obligations</Link><Link href="/liquidity">Liquidity</Link><Link href="/deploy">Deployment</Link></div>
          <div className="footer-column"><h2>Get started</h2><Link href="/connect">Connect a treasury</Link><Link href="/dashboard">Open the app</Link><a href="#product">How Solvent works</a></div>
          <div className="footer-network-card"><span className="footer-network"><i aria-hidden="true" /> ARBITRUM SEPOLIA</span><p>Solvent is currently a testnet application. Test tokens and mock strategy positions have no real-world value.</p></div>
        </div>
        <div className="footer-bottom"><span>Solvent · Onchain treasury management</span><span>Built for clearer capital decisions.</span></div>
      </footer>
    );
  }

  return (
    <footer className="solvent-footer">
      <div className="solvent-footer-inner">
        <Link href="/" className="solvent-footer-brand">solvent<span>.</span></Link>
        <span>Treasury clarity, onchain.</span>
        <nav aria-label="Footer navigation">
          <Link href="/dashboard">Overview</Link>
          <Link href="/obligations">Obligations</Link>
          <Link href="/liquidity">Liquidity</Link>
          {marketing && <a href="#product">Product</a>}
        </nav>
        <span className="footer-network">Arbitrum Sepolia <i aria-hidden="true" /></span>
      </div>
    </footer>
  );
}
