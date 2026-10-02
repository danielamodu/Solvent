"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseUnits } from "viem";
import { useAccount, useReadContract, useSwitchChain } from "wagmi";
import { ConnectKitButton } from "connectkit";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Coins,
  Plug,
  Rocket,
  Shield,
  ShieldCheck,
  Wallet,
  Zap,
} from "lucide-react";
import { CHAIN_ID, erc20Abi, susdFaucetAbi, usdcAddress } from "@/lib/contracts";
import { formatUSD } from "@/lib/format";
import { useTx } from "@/lib/useTx";
import { FAUCET_AMOUNT, formatCooldown, useFaucetCooldown } from "@/lib/useFaucet";
import { BusyLabel, TxFeedback } from "@/app/components/ui";

const STEPS = ["Welcome", "What is Solvent", "How it works", "Get test funds", "Ready"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const total = STEPS.length;
  const next = () => setStep((s) => Math.min(s + 1, total - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));
  const finish = () => router.push("/dashboard");

  return (
    <div className="workspace-shell flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 flex h-20 items-center justify-between border-b-2 border-black bg-[#ffe17c] px-6 md:px-12">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center bg-black">
            <Zap className="h-6 w-6 text-[#ffe17c]" aria-hidden="true" />
          </span>
          <span className="cabinet text-2xl uppercase tracking-tight text-black">Solvent</span>
        </div>
        <button
          onClick={finish}
          className="cabinet text-xs uppercase tracking-widest text-black/60 underline decoration-2 underline-offset-4 hover:text-black"
        >
          Skip onboarding
        </button>
      </header>
      <div className="h-1 w-full bg-black/10">
        <div
          className="h-full bg-[#ffe17c] transition-[width] duration-500 ease-out"
          style={{ width: `${((step + 1) / total) * 100}%` }}
        />
      </div>

      <main className="dot-pattern-light mx-auto w-full max-w-6xl flex-1 px-6 py-14 md:px-12">
        {step === 0 && <WelcomeStep onStart={next} onDemo={() => router.push("/demo")} />}
        {step === 1 && <EducationalStep onNext={next} onBack={back} />}
        {step === 2 && <HowItWorksStep onNext={next} onBack={back} />}
        {step === 3 && <FundStep onNext={next} onBack={back} />}
        {step === 4 && <ReadyStep onFinish={finish} />}
      </main>

      <div className="pointer-events-none fixed bottom-6 right-6 z-50">
        <div className="border-2 border-[#b7c6c2] bg-[#171e19] px-4 py-2">
          <span className="cabinet text-xs uppercase tracking-widest text-[#b7c6c2]">
            Step {step + 1} of {total}
          </span>
        </div>
      </div>
    </div>
  );
}

function WelcomeStep({ onStart, onDemo }: { onStart: () => void; onDemo: () => void }) {
  const features = [
    { icon: ClipboardList, label: "Track & manage all financial commitments" },
    { icon: Wallet, label: "Deploy capital within obligation-aware limits" },
    { icon: BarChart3, label: "Real-time liquidity & coverage monitoring" },
  ];
  return (
    <div className="grid items-center gap-12 py-6 lg:grid-cols-2">
      <div>
        <div className="neo-label text-[#b7c6c2]">Obligation-aware treasury</div>
        <h1 className="cabinet mt-3 text-5xl uppercase leading-[0.95] tracking-tight text-white sm:text-6xl">
          Welcome to <span className="text-[#ffe17c]">Solvent</span>
        </h1>
        <p className="mt-5 max-w-lg text-lg text-[#b7c6c2]">
          Obligation-aware treasury management for onchain organizations.
        </p>
        <ul className="mt-8 space-y-4">
          {features.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-3 text-white">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center border-2 border-black bg-[#ffe17c]">
                <Icon className="h-4 w-4 text-black" aria-hidden="true" />
              </span>
              <span className="text-sm font-medium">{label}</span>
            </li>
          ))}
        </ul>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
          <button onClick={onStart} className="neo-btn neo-btn-primary px-10">
            Get started
          </button>
          <button
            onClick={onDemo}
            className="cabinet text-sm font-bold uppercase tracking-wide text-[#ffe17c] underline decoration-2 underline-offset-4 hover:opacity-70"
          >
            View demo
          </button>
        </div>
      </div>
      <div className="neo-card-lg hidden p-6 lg:block">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex h-24 flex-col justify-end border-2 border-black bg-[#b7c6c2] p-3"><div className="neo-label">Reserve</div><div className="cabinet text-lg">$100k</div></div>
          <div className="flex h-24 flex-col justify-end border-2 border-black bg-[#ffe17c] p-3"><div className="neo-label">Deployable</div><div className="cabinet text-lg">$810k</div></div>
          <div className="flex h-24 flex-col justify-end border-2 border-black bg-[#171e19] p-3 text-white"><div className="neo-label text-white/50">Deployed</div><div className="cabinet text-lg">$255k</div></div>
          <div className="flex h-24 flex-col justify-end border-2 border-black bg-white p-3"><div className="neo-label">Coverage</div><div className="cabinet text-lg text-[#10b981]">345%</div></div>
        </div>
      </div>
    </div>
  );
}

function StepNav({
  onBack,
  onNext,
  nextLabel = "Continue",
  nextDisabled = false,
}: {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="mt-12 flex flex-col items-center gap-5">
      {onNext && (
        <button onClick={onNext} disabled={nextDisabled} className="neo-btn neo-btn-primary px-14">
          {nextLabel}
        </button>
      )}
      {onBack && (
        <button
          onClick={onBack}
          className="cabinet text-xs font-bold uppercase tracking-widest text-[#b7c6c2] underline decoration-2 underline-offset-4 hover:text-[#ffe17c]"
        >
          Go back
        </button>
      )}
    </div>
  );
}

function EducationalStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const cards = [
    { icon: ClipboardCheck, title: "Record the promise", body: "Log every financial commitment before deploying capital. Solvent ensures nothing is forgotten." },
    { icon: ShieldCheck, title: "Keep it protected", body: "Liquidity is automatically ring-fenced based on obligation amounts and due dates." },
    { icon: Rocket, title: "Move with context", body: "Only deploy capital that's truly free. Smart limits prevent over-commitment." },
  ];
  const rows = [
    ["Obligation tracking", "Manual", "Automated"],
    ["Deployment limits", "Guesswork", "Obligation-aware"],
    ["Liquidity alerts", "Manual", "Real-time"],
  ];
  return (
    <div>
      <div className="text-center">
        <h1 className="cabinet text-4xl uppercase leading-none tracking-tight text-white sm:text-5xl">What is Solvent?</h1>
        <p className="mt-4 text-lg text-[#b7c6c2]">A treasury system that respects your future obligations.</p>
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {cards.map(({ icon: Icon, title, body }) => (
          <div key={title} className="accent-bar neo-card p-6">
            <span className="flex h-12 w-12 items-center justify-center border-2 border-black bg-black">
              <Icon className="h-6 w-6 text-[#ffe17c]" aria-hidden="true" />
            </span>
            <h3 className="cabinet mt-4 text-lg uppercase tracking-tight">{title}</h3>
            <p className="mt-3 text-sm text-black/70">{body}</p>
          </div>
        ))}
      </div>
      <div className="neo-card-lg mt-8 p-6 md:p-8">
        <h2 className="cabinet text-xl uppercase tracking-tight">Solvent vs. traditional treasury</h2>
        <div className="mt-6 divide-y-2 divide-black/10">
          <div className="grid grid-cols-3 pb-3 text-[10px] font-bold uppercase tracking-widest text-black/40">
            <span>Feature</span><span>Traditional</span><span>Solvent</span>
          </div>
          {rows.map(([feature, trad, sol]) => (
            <div key={feature} className="grid grid-cols-3 items-center py-3 text-sm">
              <span className="font-bold text-black">{feature}</span>
              <span className="font-bold text-[#ef4444]/70">{trad}</span>
              <span className="font-bold text-[#10b981]">{sol}</span>
            </div>
          ))}
        </div>
      </div>
      <StepNav onBack={onBack} onNext={onNext} />
    </div>
  );
}

function HowItWorksStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const steps = [
    { icon: Plug, title: "Connect wallet", body: "Link your Arbitrum Sepolia address and verify ownership." },
    { icon: ClipboardList, title: "Record obligations", body: "Log all commitments with amounts and due dates." },
    { icon: Shield, title: "Protect liquidity", body: "The system automatically ring-fences protected capital." },
    { icon: Zap, title: "Deploy safely", body: "Move capital within obligation-aware safe limits." },
  ];
  return (
    <div>
      <div>
        <h1 className="cabinet text-4xl uppercase leading-none tracking-tight text-white sm:text-5xl">How Solvent works</h1>
        <p className="mt-4 text-lg text-[#b7c6c2]">A four-step process to secure your treasury liquidity.</p>
      </div>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(({ icon: Icon, title, body }, i) => (
          <div key={title} className="neo-card flex flex-col items-center p-6 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-black bg-[#ffe17c]">
              <span className="cabinet text-black">{i + 1}</span>
            </span>
            <Icon className="mt-4 h-7 w-7 text-black" aria-hidden="true" />
            <h3 className="cabinet mt-3 text-sm uppercase tracking-tight">{title}</h3>
            <p className="mt-2 text-[11px] font-medium uppercase leading-tight text-black/60">{body}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="neo-card-lg p-8">
          <h3 className="cabinet text-lg uppercase tracking-tight">What Solvent calculates</h3>
          <div className="mt-5 border-2 border-black bg-black/5 p-5 text-center text-xs font-bold leading-relaxed text-black">
            PROTECTED LIQUIDITY =<br />RESERVE REQUIREMENT +<br />SUM OF PENDING OBLIGATIONS
          </div>
          <p className="mt-5 text-sm text-black/60">
            Every dollar you&apos;ve promised to pay in the future is locked and removed from today&apos;s deployable balance.
          </p>
        </div>
        <div className="neo-card-lg p-8">
          <h3 className="cabinet text-lg uppercase tracking-tight">Your safe maximum</h3>
          <div className="mt-5 border-2 border-black bg-black/5 p-5 text-center text-xs font-bold leading-relaxed text-black">
            DEPLOYABLE CAPITAL =<br />TOTAL ASSETS −<br />PROTECTED LIQUIDITY
          </div>
          <div className="mt-5 flex h-14 overflow-hidden border-2 border-black">
            <div className="flex w-[35%] items-center justify-center border-r-2 border-black bg-[#b7c6c2] text-[9px] font-black uppercase leading-tight">Protected</div>
            <div className="flex w-[65%] items-center justify-center bg-[#ffe17c] text-[9px] font-black uppercase leading-tight">Deployable</div>
          </div>
        </div>
      </div>
      <StepNav onBack={onBack} onNext={onNext} nextLabel="Next: get test funds" />
    </div>
  );
}

function FundStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const correctNetwork = chainId === CHAIN_ID;
  const { canClaim, hasClaimed, remainingMs, recordClaim } = useFaucetCooldown(address);
  const balance = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address!],
    chainId: CHAIN_ID,
    query: { enabled: Boolean(address && usdcAddress) },
  });
  const mint = useTx(() => {
    recordClaim();
    balance.refetch();
  });
  const busy = mint.isPending || mint.isConfirming;
  const onCooldown = hasClaimed && !canClaim;

  return (
    <div className="mx-auto max-w-xl">
      <div className="text-center">
        <h1 className="cabinet text-4xl uppercase leading-none tracking-tight text-white sm:text-5xl">Get test funds</h1>
        <p className="mt-4 text-lg text-[#b7c6c2]">Claim {FAUCET_AMOUNT.toLocaleString()} test SUSD to fund your first treasury — testnet only, no real value.</p>
      </div>
      <div className="neo-card-lg mt-8 p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-black bg-[#b7c6c2]"><Coins className="h-5 w-5 text-black" aria-hidden="true" /></span>
          <div><h2 className="cabinet text-sm uppercase tracking-tight">Solvent USD faucet</h2><p className="mt-0.5 text-xs font-semibold text-black/50">{FAUCET_AMOUNT.toLocaleString()} SUSD per claim · once every 6 hours</p></div>
        </div>
        {!usdcAddress ? (
          <p className="border-2 border-l-4 border-black border-l-[#ffe17c] bg-black/5 p-3 text-xs text-black/70">The SUSD token isn&apos;t configured. Set NEXT_PUBLIC_USDC_ADDRESS and restart to enable the faucet.</p>
        ) : !isConnected ? (
          <div className="space-y-3"><p className="text-sm text-black/60">Connect a wallet to claim your test SUSD.</p><ConnectKitButton /></div>
        ) : !correctNetwork ? (
          <div className="flex items-center justify-between gap-3 border-2 border-l-4 border-black border-l-[#ffe17c] bg-black/5 p-3"><span className="text-xs font-semibold text-black/70">Switch to Arbitrum Sepolia to claim.</span><button onClick={() => switchChain({ chainId: CHAIN_ID })} className="neo-btn neo-btn-primary shrink-0">Switch</button></div>
        ) : (
          <>
            <p className="text-xs font-semibold text-black/50">Wallet balance: {formatUSD(balance.data, 6)} SUSD</p>
            <button onClick={() => canClaim && address && mint.writeContract({ address: usdcAddress!, abi: susdFaucetAbi, functionName: "mint", args: [address, parseUnits(String(FAUCET_AMOUNT), 6)], chainId: CHAIN_ID })} disabled={busy || !canClaim} className="neo-btn neo-btn-primary mt-3 w-full">
              <BusyLabel busy={busy}>{mint.isPending ? "Confirm in wallet…" : mint.isConfirming ? "Minting…" : onCooldown ? `Next claim in ${formatCooldown(remainingMs)}` : `Claim ${FAUCET_AMOUNT.toLocaleString()} SUSD`}</BusyLabel>
            </button>
            {mint.isConfirmed && <p className="mt-2 text-[11px] font-bold text-[#10b981]">Minted — {FAUCET_AMOUNT.toLocaleString()} SUSD is in your wallet. Continue to your treasury.</p>}
            <TxFeedback tx={mint} />
          </>
        )}
      </div>
      <StepNav onBack={onBack} onNext={onNext} nextLabel={hasClaimed ? "Continue" : "Skip for now"} />
    </div>
  );
}

function ReadyStep({ onFinish }: { onFinish: () => void }) {
  const can = [
    "Record all pending obligations",
    "Set custom reserve requirements",
    "Monitor real-time liquidity health",
    "Deploy capital safely via guards",
    "Track coverage across time periods",
    "Receive alerts on settlement shortfalls",
  ];
  return (
    <div className="mx-auto max-w-3xl">
      <div className="text-center">
        <div className="neo-label text-[#b7c6c2]">Step 5 — all set</div>
        <h1 className="cabinet mt-3 text-5xl uppercase leading-[0.95] tracking-tight text-white sm:text-6xl">Ready to begin</h1>
        <p className="mt-4 text-lg text-[#b7c6c2]">
          Your wallet is funded. Open the dashboard to create a treasury and start managing obligations.
        </p>
      </div>
      <div className="neo-card-lg mt-10 p-8 md:p-10">
        <h2 className="cabinet text-2xl uppercase tracking-tight">What you can do today</h2>
        <p className="mt-2 text-sm text-black/60">Everything you need to manage an obligation-aware onchain treasury.</p>
        <div className="mt-6 grid gap-x-10 gap-y-4 border-t-2 border-black/10 pt-6 md:grid-cols-2">
          {can.map((item) => (
            <div key={item} className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-[#10b981]" aria-hidden="true" />
              <span className="text-sm font-bold uppercase tracking-tight text-black/80">{item}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-10 flex justify-center">
        <button onClick={onFinish} className="neo-btn neo-btn-primary inline-flex items-center gap-2 px-14">
          Go to dashboard <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
