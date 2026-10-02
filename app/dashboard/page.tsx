import { WorkspaceFooter, WorkspaceHeader } from "@/app/components/Workspace";
import { Vault } from "@/app/components/Vault";

export default function DashboardPage() {
  return (
    <div className="workspace-shell flex min-h-screen flex-col">
      <WorkspaceHeader active="overview" />
      <main className="dot-pattern-light mx-auto w-full max-w-[1440px] flex-1 px-5 py-10 md:px-10">
        <div className="mb-8">
          <div className="neo-label text-[#b7c6c2]">Treasury overview</div>
          <h1 className="cabinet mt-2 text-4xl uppercase tracking-tight text-white sm:text-5xl">
            Your treasury
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-[#b7c6c2]">
            Live balances, commitments, and deployment capacity from Arbitrum Sepolia.
          </p>
        </div>
        <Vault />
      </main>
      <WorkspaceFooter />
    </div>
  );
}
