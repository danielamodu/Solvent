import Link from "next/link";
import { SolventFooter, SolventNav } from "./components/SolventNav";

const features = [
  { number: "01", title: "Track obligations", text: "Record payment commitments onchain and see what is due before treasury funds are deployed." },
  { number: "02", title: "Protect payments", text: "Reserve requirements and pending obligations reduce the amount available for strategy deployment." },
  { number: "03", title: "Deploy with guardrails", text: "The vault enforces the deployable limit. Recall strategy principal before paying when idle liquidity is short." },
];

export default function Home() {
  return <main className="min-h-screen bg-white text-slate-900">
    <SolventNav marketing />
    <section className="relative overflow-hidden border-b border-blue-900/5 bg-gradient-to-b from-blue-700 via-blue-600 to-white">
      <div className="mx-auto grid min-h-[590px] max-w-[1280px] items-center gap-12 px-5 py-20 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-24">
        <div className="relative z-10 max-w-3xl text-white">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold tracking-wide text-white"><span className="h-2 w-2 rounded-full bg-white" /> ONCHAIN TREASURY MANAGEMENT</div>
          <h1 className="display-font text-5xl font-extrabold leading-[1.02] sm:text-6xl lg:text-[72px]">Know what you owe.<br />Deploy what you can.</h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-blue-50 sm:text-lg">Solvent makes payment commitments visible before capital moves, so your team can protect what is promised and act on what is free.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/connect" className="rounded-full bg-white px-7 py-4 text-sm font-bold text-blue-700 shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl">Connect wallet <span aria-hidden>→</span></Link>
            <Link href="/dashboard" className="rounded-full border border-white/50 px-7 py-4 text-sm font-semibold text-white transition hover:bg-white/10">Open dashboard</Link>
          </div>
          <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 text-xs font-medium text-blue-50"><span>Arbitrum Sepolia</span><span>Onchain commitments</span><span>Owner-controlled actions</span></div>
        </div>
        <div className="relative mx-auto w-full max-w-[520px]">
          <div className="absolute inset-8 rounded-full bg-blue-300/40 blur-3xl" />
          <div className="relative rotate-1 rounded-[28px] border border-white/70 bg-white p-5 shadow-[0_28px_80px_rgba(17,24,39,.2)] sm:p-7">
            <div className="flex items-center justify-between border-b border-slate-100 pb-5"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-blue-700">Treasury overview</p><h2 className="mt-1 text-xl font-bold text-slate-900">Arbitrum Treasury</h2></div><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">Protected</span></div>
            <div className="grid grid-cols-2 gap-3 py-5"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Total assets</p><p className="mt-2 text-2xl font-bold text-slate-900">Onchain</p></div><div className="rounded-2xl bg-blue-50 p-4"><p className="text-xs text-blue-700">Deployable</p><p className="mt-2 text-2xl font-bold text-blue-800">Guarded</p></div></div>
            <div className="rounded-2xl border border-slate-100 p-4"><div className="flex items-center justify-between"><span className="text-sm font-semibold">Payment readiness</span><span className="text-xs font-bold text-blue-700">Live</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-3/4 rounded-full bg-blue-700" /></div><div className="mt-4 space-y-3"><div className="flex items-center justify-between text-xs"><span className="text-slate-600">Pending obligations</span><span className="font-semibold text-slate-800">Tracked onchain</span></div><div className="flex items-center justify-between text-xs"><span className="text-slate-600">Strategy exposure</span><span className="font-semibold text-slate-800">Recallable principal</span></div></div></div>
            <p className="mt-4 text-center text-[11px] text-slate-400">Illustrative dashboard preview · values load from your treasury</p>
          </div>
        </div>
      </div>
    </section>
    <section id="product" className="mx-auto max-w-[1280px] px-5 py-20 lg:px-8 lg:py-24">
      <div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-blue-700">Product capabilities</p><h2 className="display-font mt-3 text-4xl font-extrabold sm:text-5xl">Clarity for every dollar in motion.</h2><p className="mt-5 text-base leading-7 text-slate-600">A single treasury view connects payment commitments, protected liquidity, and strategy positions to the contracts that enforce them.</p></div>
      <div id="how-it-works" className="mt-10 grid gap-5 md:grid-cols-3">{features.map(item => <article key={item.number} className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"><p className="text-sm font-bold text-blue-700">{item.number}</p><h3 className="mt-6 text-xl font-bold">{item.title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{item.text}</p></article>)}</div>
      <div className="mt-12 flex flex-col justify-between gap-6 rounded-3xl bg-blue-700 p-8 text-white sm:flex-row sm:items-center sm:p-10"><div><p className="text-sm font-semibold text-blue-100">Get started with Solvent</p><h2 className="display-font mt-2 text-3xl font-extrabold">Make every payment feel planned.</h2></div><Link href="/connect" className="shrink-0 rounded-full bg-white px-7 py-4 text-sm font-bold text-blue-700 hover:bg-blue-50">Connect wallet today →</Link></div>
    </section>
    <SolventFooter marketing />
  </main>;
}
