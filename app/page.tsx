"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, Droplets, Eye, LayoutDashboard, ListTodo, PenTool, Rocket, Shield, ShieldCheck, TrendingUp, Zap, type LucideIcon } from "lucide-react";
import { SolventMark } from "./components/Logo";

// Brand icons lucide no longer ships (Github/Twitter were removed), so the
// footer socials are inline SVGs. Globe below mirrors lucide's globe.
function GithubIcon({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" /></svg>;
}

function XIcon({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" /></svg>;
}

function GlobeIcon({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>;
}

// Social links — GitHub points at the public repo.
const GITHUB_URL = "https://github.com/danielamodu/Solvent";
const X_URL = "https://x.com/szrxbt";
const SITE_URL = "https://amodu.dev";
const SOCIALS: { label: string; href: string; Icon: (props: { size?: number }) => JSX.Element }[] = [
  { label: "GitHub", href: GITHUB_URL, Icon: GithubIcon },
  { label: "X (Twitter)", href: X_URL, Icon: XIcon },
  { label: "Website", href: SITE_URL, Icon: GlobeIcon },
];

const whyCards: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Eye, title: "Obligation awareness", body: "Know exactly what you owe and when. Real-time tracking of every commitment, so you never double-spend liquidity." },
  { icon: Zap, title: "Capital efficiency", body: "Move only what is free. Maximize utilization while meeting all obligations — never let the treasury sit idle." },
  { icon: TrendingUp, title: "Yield optimization", body: "Turn idle capital into revenue. Deploy available liquidity into principal-only strategies within safe limits." },
];
const productCards: { icon: LucideIcon; title: string; body: string; bg: string }[] = [
  { icon: PenTool, title: "Record the promise", body: "Log every commitment before it hits the ledger. Solvent ensures you never deploy capital already spoken for.", bg: "bg-[#ffe17c]" },
  { icon: ShieldCheck, title: "Keep it protected", body: "Liquidity is ring-fenced by reserve and due dates, with real-time on-chain reserve enforcement.", bg: "bg-white" },
  { icon: ArrowUpRight, title: "Move with context", body: "Only deploy what is truly free. The protocol computes your safe maximum deployment limit automatically.", bg: "bg-[#b7c6c2]" },
];
const steps = [
  { n: 1, title: "Connect wallet", body: "Integrate your DAO treasury or multisig on Arbitrum Sepolia.", dark: true },
  { n: 2, title: "Track obligations", body: "Record upcoming payments, locks, and operational reserves.", dark: false },
  { n: 3, title: "Deploy capital", body: "Allocate only unencumbered capital into strategies.", dark: true },
  { n: 4, title: "Stay solvent", body: "Watch your net balance grow while remaining fully covered.", dark: false },
];
const views: { icon: LucideIcon; title: string; body: string; href: string; bg: string }[] = [
  { icon: LayoutDashboard, title: "Dashboard", body: "The centralized overview with real-time health badges.", href: "/dashboard", bg: "bg-white" },
  { icon: ListTodo, title: "Obligations", body: "Record or settle commitments. Managing promises.", href: "/obligations", bg: "bg-white" },
  { icon: Droplets, title: "Liquidity", body: "Coverage and shortfall monitors across time.", href: "/liquidity", bg: "bg-[#ffe17c]" },
  { icon: Rocket, title: "Deploy", body: "Put capital to work without risking promises.", href: "/deploy", bg: "bg-[#b7c6c2]" },
];
const faqs = [
  { q: "What is obligation-aware treasury management?", a: "A framework that prioritizes liabilities over assets. Solvent tracks future commitments so you only deploy capital that isn't already promised elsewhere." },
  { q: "How does Solvent protect liquidity?", a: "Protected liquidity equals the reserve requirement plus all pending obligations. Deployable capital is what remains after protected funds and existing deployments." },
  { q: "What are the security measures?", a: "Solvent is non-custodial. Owner-only actions are enforced on-chain by the vault; the app only reads and submits transactions for your wallet to sign." },
  { q: "Which network is this?", a: "Solvent currently runs on the Arbitrum Sepolia testnet. Test tokens and mock strategy positions have no real-world value." },
  { q: "Does the strategy generate yield?", a: "The configured MockStrategy is a principal-only test adapter — it does not generate yield and represents no external protocol or APY." },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return <div className="flex min-h-screen flex-col bg-white text-black">
    <header className={`fixed z-50 flex items-center justify-between border-black bg-[#ffe17c] transition-all duration-300 ${scrolled ? "left-1/2 top-5 h-16 w-[92%] max-w-[1100px] -translate-x-1/2 rounded-2xl border-2 px-5 shadow-[4px_4px_0_0_#000] backdrop-blur" : "left-0 right-0 top-0 h-20 border-b-2 px-5 md:px-10"}`}>
      <Link href="/" className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center border-2 border-black bg-black text-[#ffe17c]"><SolventMark className="h-5 w-5" /></span><span className="cabinet text-xl tracking-tight">Solvent</span></Link>
      <nav className="hidden items-center gap-8 text-sm font-semibold uppercase tracking-wide md:flex"><a href="#product" className="hover:opacity-60">Product</a><a href="#how" className="hover:opacity-60">How it works</a><a href="#app" className="hover:opacity-60">App</a></nav>
      <Link href="/onboarding" className="neo-btn neo-btn-primary">Connect wallet</Link>
    </header>

    <main className="flex-1">
      <section className="dot-pattern relative overflow-hidden bg-[#ffe17c] px-5 pb-24 pt-36 md:px-10">
        <div className="mx-auto grid max-w-[1720px] items-center gap-12 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <span className="badge inline-flex items-center gap-2 border-2 border-black bg-black text-[#ffe17c]"><span className="h-2 w-2 rounded-full bg-[#ffe17c]" />New · Obligation-aware treasury control</span>
            <h1 className="cabinet mt-6 text-5xl uppercase leading-[0.95] tracking-tight sm:text-6xl md:text-7xl xl:text-8xl">Know what you owe.<br /><span className="text-transparent [-webkit-text-stroke:2px_#000]">Move what is free.</span></h1>
            <p className="mt-6 max-w-xl text-lg leading-7 text-black/70 lg:text-xl lg:leading-8">Solvent tracks every treasury commitment on-chain, protects the liquidity you need, and tells you the exact capital you can safely deploy.</p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link href="/onboarding" className="neo-btn neo-btn-primary px-7 py-4 text-base">Connect wallet <ArrowUpRight size={18} /></Link>
              <Link href="/dashboard" className="neo-btn neo-btn-secondary px-7 py-4 text-base">View dashboard</Link>
            </div>
          </div>
          <div className="brutalist-border brutalist-shadow-lg bg-white p-5">
            <div className="flex items-center justify-between border-b-2 border-black pb-3"><span className="neo-label">Treasury health</span><span className="badge bg-[#10b981] text-white">345% covered</span></div>
            <div className="mt-4 border-2 border-black bg-[#ffe17c] p-4"><div className="neo-label">Safe to deploy</div><div className="cabinet mt-1 text-3xl tabular-nums">$284,500</div></div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="border-2 border-black p-3"><div className="neo-label">Total assets</div><div className="cabinet mt-1 text-lg tabular-nums">$500,000</div></div>
              <div className="border-2 border-black p-3"><div className="neo-label">Protected</div><div className="cabinet mt-1 text-lg tabular-nums">$215,500</div></div>
            </div>
            <div className="mt-3 h-3 w-full border-2 border-black bg-white"><div className="h-full bg-[#10b981]" style={{ width: "72%" }} /></div>
          </div>
        </div>
      </section>
      <div className="overflow-hidden border-y-2 border-black bg-white py-4"><div className="animate-marquee"><Marquee /><Marquee /></div></div>
      <section className="bg-[#171e19] px-5 py-24 text-white md:px-10">
        <div className="mx-auto max-w-[1720px]">
          <div className="neo-label text-[#b7c6c2]">Why Solvent</div>
          <h2 className="cabinet mt-2 max-w-3xl text-4xl uppercase tracking-tight sm:text-5xl lg:text-6xl">Treasury management that starts with liabilities</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {whyCards.map(({ icon: Icon, title, body }) => <div key={title} className="accent-bar border-2 border-black bg-white p-7 text-black shadow-[8px_8px_0_0_#000]">
              <span className="grid h-12 w-12 place-items-center border-2 border-black bg-[#ffe17c]"><Icon size={22} /></span>
              <h3 className="cabinet mt-5 text-xl tracking-tight">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-black/60">{body}</p>
            </div>)}
          </div>
        </div>
      </section>

      <section id="product" className="bg-white px-5 py-24 md:px-10">
        <div className="mx-auto max-w-[1720px]">
          <div className="neo-label">The product</div>
          <h2 className="cabinet mt-2 max-w-3xl text-4xl uppercase tracking-tight sm:text-5xl lg:text-6xl">Record the promise. Protect it. Deploy the rest.</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {productCards.map(({ icon: Icon, title, body, bg }) => <div key={title} className={`border-2 border-black p-7 shadow-[8px_8px_0_0_#000] ${bg}`}>
              <span className="grid h-12 w-12 place-items-center border-2 border-black bg-black text-[#ffe17c]"><Icon size={22} /></span>
              <h3 className="cabinet mt-5 text-xl tracking-tight">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-black/70">{body}</p>
            </div>)}
          </div>
        </div>
      </section>
      <section id="how" className="dot-pattern bg-[#ffe17c] px-5 py-24 md:px-10">
        <div className="mx-auto max-w-[1720px]">
          <div className="neo-label">How it works</div>
          <h2 className="cabinet mt-2 text-4xl uppercase tracking-tight sm:text-5xl lg:text-6xl">Four steps to total clarity</h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ n, title, body, dark }) => <div key={n} className={`border-2 border-black p-6 shadow-[8px_8px_0_0_#000] ${dark ? "bg-[#171e19] text-white" : "bg-white text-black"}`}>
              <span className={`cabinet grid h-12 w-12 place-items-center border-2 text-xl ${dark ? "border-white bg-[#ffe17c] text-black" : "border-black bg-black text-[#ffe17c]"}`}>{n}</span>
              <h3 className="cabinet mt-5 text-lg tracking-tight">{title}</h3>
              <p className={`mt-2 text-sm leading-6 ${dark ? "text-white/60" : "text-black/60"}`}>{body}</p>
            </div>)}
          </div>
        </div>
      </section>

      <section className="bg-[#171e19] px-5 py-24 text-white md:px-10">
        <div className="mx-auto max-w-[1720px]">
          <div className="neo-label text-[#b7c6c2]">Capital legibility</div>
          <h2 className="cabinet mt-2 max-w-3xl text-4xl uppercase tracking-tight sm:text-5xl lg:text-6xl">Every dollar has a job</h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Primitive label="Reserve" sub="Operational floor" bg="bg-[#b7c6c2]" />
            <Primitive label="Obligations" sub="Promised out" bg="bg-[#ffe17c]" />
            <Primitive label="Deployed" sub="At work" bg="bg-white" />
            <Primitive label="Deployable" sub="Safe to move" bg="bg-[#ffe17c]" primary />
          </div>
          <p className="mt-10 max-w-2xl text-sm leading-6 text-[#b7c6c2]">Deployable = Total assets − Reserve − Pending obligations − Already deployed. The invariant is enforced on-chain, every block.</p>
        </div>
      </section>
      <section id="app" className="bg-white px-5 py-24 md:px-10">
        <div className="mx-auto max-w-[1720px]">
          <div className="neo-label">The workspace</div>
          <h2 className="cabinet mt-2 text-4xl uppercase tracking-tight sm:text-5xl lg:text-6xl">Four views, one source of truth</h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {views.map(({ icon: Icon, title, body, href, bg }) => <Link key={title} href={href} className={`group border-2 border-black p-6 shadow-[8px_8px_0_0_#000] transition-transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0_0_#000] ${bg}`}>
              <span className="grid h-12 w-12 place-items-center border-2 border-black bg-black text-[#ffe17c]"><Icon size={22} /></span>
              <h3 className="cabinet mt-5 flex items-center gap-1 text-lg tracking-tight">{title} <ArrowUpRight size={16} className="opacity-0 transition-opacity group-hover:opacity-100" /></h3>
              <p className="mt-2 text-sm leading-6 text-black/60">{body}</p>
            </Link>)}
          </div>
        </div>
      </section>

      <section className="bg-[#b7c6c2] px-5 py-24 md:px-10">
        <div className="mx-auto grid max-w-[1720px] gap-12 lg:grid-cols-[.8fr_1.2fr]">
          <div><div className="neo-label">FAQ</div><h2 className="cabinet mt-2 text-4xl uppercase tracking-tight sm:text-5xl lg:text-6xl">Questions, answered</h2><p className="mt-4 text-sm leading-6 text-black/70">Everything you need to know about obligation-aware treasury management on Solvent.</p></div>
          <div className="space-y-4">
            {faqs.map(({ q, a }) => <details key={q} className="border-2 border-black bg-white p-5 shadow-[6px_6px_0_0_#000] [&_svg]:open:rotate-180">
              <summary className="flex cursor-pointer items-center justify-between gap-4 font-bold tracking-tight marker:content-none"><span>{q}</span><ChevronDown size={18} className="shrink-0 transition-transform" /></summary>
              <p className="mt-3 text-sm leading-6 text-black/60">{a}</p>
            </details>)}
          </div>
        </div>
      </section>
      <section className="dot-pattern bg-[#ffe17c] px-5 py-28 text-center md:px-10">
        <div className="mx-auto max-w-[820px]">
          <h2 className="cabinet text-5xl uppercase leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">Deploy with total clarity.</h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-7 text-black/70">Connect your treasury, record what you owe, and move only the capital that is truly free.</p>
          <Link href="/onboarding" className="neo-btn neo-btn-primary mt-9 inline-flex px-8 py-4 text-base">Launch application <ArrowUpRight size={18} /></Link>
        </div>
      </section>
    </main>

    <footer className="bg-[#171e19] px-5 py-16 text-white md:px-10">
      <div className="mx-auto grid max-w-[1720px] gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center border-2 border-white bg-[#ffe17c] text-black"><SolventMark className="h-5 w-5" /></span><span className="cabinet text-xl tracking-tight">Solvent</span></div>
          <p className="mt-4 max-w-xs text-sm leading-6 text-[#b7c6c2]">Obligation-aware treasury management. Know what you owe, move what is free.</p>
          <div className="mt-5 flex gap-3">
            {SOCIALS.map(({ label, href, Icon }) => <a key={label} href={href} aria-label={label} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="grid h-10 w-10 place-items-center border-2 border-white/30 hover:border-[#ffe17c] hover:text-[#ffe17c]"><Icon size={18} /></a>)}
          </div>
        </div>
        <div>
          <div className="neo-label text-[#b7c6c2]">Workspace</div>
          <ul className="mt-4 space-y-2 text-sm text-[#b7c6c2]">
            {views.map(v => <li key={v.href}><Link href={v.href} className="hover:text-white">{v.title}</Link></li>)}
          </ul>
        </div>
        <div>
          <div className="neo-label text-[#b7c6c2]">Get started</div>
          <ul className="mt-4 space-y-2 text-sm text-[#b7c6c2]">
            <li><Link href="/onboarding" className="hover:text-white">Onboarding</Link></li>
            <li><Link href="/connect" className="hover:text-white">Connect treasury</Link></li>
            <li><a href="#how" className="hover:text-white">How it works</a></li>
            <li><a href="#app" className="hover:text-white">The workspace</a></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-12 flex max-w-[1720px] flex-col items-center justify-between gap-3 border-t-2 border-white/15 pt-6 text-xs text-[#b7c6c2] sm:flex-row">
        <span>© 2026 Solvent. Testnet software — no real-world value.</span>
        <span className="inline-flex items-center gap-2"><Shield size={14} /> Arbitrum Sepolia testnet</span>
      </div>
    </footer>
  </div>;
}

function Marquee() {
  const words = ["Obligation-aware", "Non-custodial", "On-chain reserve", "Deployable capital", "Coverage tracking", "Owner-only actions"];
  return <div className="flex shrink-0 items-center">
    {words.map((w, i) => <span key={i} className="cabinet flex items-center gap-6 whitespace-nowrap px-6 text-base uppercase tracking-tight text-black/70"><span>{w}</span><span className="text-[#ffe17c]">●</span></span>)}
  </div>;
}

function Primitive({ label, sub, bg, primary = false }: { label: string; sub: string; bg: string; primary?: boolean }) {
  return <div className={`border-2 border-black p-6 text-black shadow-[8px_8px_0_0_#000] ${bg}`}>
    <div className={`grid h-20 place-items-center border-2 border-black ${primary ? "bg-black text-[#ffe17c]" : "bg-white/60"}`}><span className="cabinet text-2xl uppercase tracking-tight">{primary ? "✓" : label[0]}</span></div>
    <h3 className="cabinet mt-4 text-lg tracking-tight">{label}</h3>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-black/50">{sub}</p>
  </div>;
}

