import { SolventFooter, SolventNav } from "@/app/components/SolventNav";
import { Vault } from "@/app/components/Vault";

export default function DashboardPage() {
  return <main className="min-h-screen bg-slate-50 text-slate-900">
    <SolventNav active="dashboard" />
    <section className="solvent-dashboard mx-auto max-w-[1280px] px-5 py-10 lg:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-blue-700">Treasury overview</p><h1 className="display-font mt-2 text-4xl font-extrabold sm:text-5xl">Your treasury</h1><p className="mt-3 text-sm text-slate-600">Live balances, commitments, and deployment capacity from Arbitrum Sepolia.</p></div>
        <span className="rounded-full border border-blue-700/15 bg-white px-4 py-2 text-xs font-bold text-blue-700">ARBITRUM SEPOLIA</span>
      </div>
      <Vault />
    </section>
    <SolventFooter />
  </main>;
}
