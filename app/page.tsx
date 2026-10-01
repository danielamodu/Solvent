import Link from "next/link";
import { SolventFooter, SolventNav } from "./components/SolventNav";

const principles = [
  { index: "01", title: "Record the promise", copy: "Put payment commitments onchain before treasury funds are put to work." },
  { index: "02", title: "Keep it protected", copy: "The registry reserves the required liquidity and counts pending obligations against deployable capital." },
  { index: "03", title: "Move with context", copy: "Review idle funds, strategy positions, and upcoming payments from one treasury view." },
];

export default function Home() {
  return (
    <main className="marketing-page">
      <SolventNav marketing />
      <section className="marketing-hero">
        <div className="hero-grid-texture" aria-hidden="true" />
        <div className="marketing-hero-inner">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-line" /> Onchain treasury management</p>
            <h1>Know what you owe.<br /><em>Move what is free.</em></h1>
            <p className="hero-description">Solvent gives teams a clear view of payment commitments, protected liquidity, and capital available to deploy.</p>
            <div className="hero-actions">
              <Link href="/connect" className="button button-lime">Connect a treasury <span aria-hidden="true">↗</span></Link>
              <Link href="/dashboard" className="hero-text-link">Explore the app <span aria-hidden="true">→</span></Link>
            </div>
            <div className="hero-footnote"><span className="status-dot" /> Arbitrum Sepolia testnet <span className="footnote-divider">/</span> Owner controlled</div>
          </div>
          <div className="hero-visual" aria-label="Illustrative treasury dashboard preview">
            <div className="preview-orbit orbit-one" />
            <div className="preview-orbit orbit-two" />
            <div className="preview-window">
              <div className="preview-topline"><span>WORKSPACE / TREASURY</span><span className="preview-live"><i /> CONNECTED</span></div>
              <div className="preview-heading"><div><span className="preview-label">TREASURY OVERVIEW</span><h2>Operations vault</h2></div><span className="preview-chain">ARB / TESTNET</span></div>
              <div className="preview-value-row"><div><span>Total assets</span><strong>Onchain</strong></div><div><span>Free to deploy</span><strong>Guarded</strong></div></div>
              <div className="preview-allocation"><div className="allocation-heading"><span>Capital allocation</span><span>Live contract data</span></div><div className="allocation-bar"><i /><i /><i /><i /></div><div className="allocation-legend"><span><i /> Reserve</span><span><i /> Obligations</span><span><i /> Deployed</span><span><i /> Available</span></div></div>
              <div className="preview-obligation"><div className="obligation-marker" /><div><span>NEXT COMMITMENT</span><strong>Payment readiness</strong></div><b>Review</b></div>
              <div className="preview-bottom"><span>Data loads from your connected treasury</span><span className="preview-arrow">↗</span></div>
            </div>
            <div className="visual-caption"><span>01</span><span>Commitments first. Capital second.</span></div>
          </div>
        </div>
        <div className="hero-index"><span>01 — 03</span><span>SCROLL TO EXPLORE</span></div>
      </section>

      <section id="product" className="product-intro">
        <div className="section-marker"><span>01</span><span>THE PRODUCT</span></div>
        <div className="product-intro-grid"><h2>A treasury should know its obligations before it reaches for yield.</h2><p>Solvent connects payment records to vault liquidity, so a team can see what is committed, what is deployed, and what the contracts consider available.</p></div>
        <div id="how-it-works" className="principle-list">
          {principles.map((item) => <article className="principle-row" key={item.index}><span className="principle-index">{item.index}</span><h3>{item.title}</h3><p>{item.copy}</p><span className="principle-arrow" aria-hidden="true">↗</span></article>)}
        </div>
      </section>

      <section className="capital-section">
        <div className="capital-copy">
          <div className="section-marker"><span>02</span><span>CAPITAL, MADE LEGIBLE</span></div>
          <h2>Every asset has a job.</h2>
          <p>Solvent separates the balances a treasury needs to honor from the capital it can put to work. The vault calculates deployable capital onchain after protected liquidity and existing strategy positions are accounted for.</p>
          <Link href="/liquidity" className="section-link">Explore liquidity <span aria-hidden="true">↗</span></Link>
        </div>
        <div className="capital-visual" aria-label="Illustration of treasury capital categories">
          <div className="capital-visual-head"><span>VAULT BALANCE</span><span>CONTRACT VIEW</span></div>
          <div className="capital-flow"><div className="flow-total"><span>Total assets</span><b>From the vault</b></div><div className="flow-branches"><div><i className="flow-swatch reserve-swatch"/><span><b>Reserve</b><small>Required liquidity</small></span></div><div><i className="flow-swatch obligation-swatch"/><span><b>Obligations</b><small>Pending payments</small></span></div><div><i className="flow-swatch deployed-swatch"/><span><b>Deployed</b><small>Strategy position</small></span></div><div><i className="flow-swatch free-swatch"/><span><b>Deployable</b><small>Available by contract rule</small></span></div></div></div>
          <p className="capital-footnote">Illustrative categories. Balances load from the selected treasury.</p>
        </div>
      </section>

      <section className="workspace-section">
        <div className="workspace-heading"><div><div className="section-marker"><span>03</span><span>FOUR VIEWS, ONE TREASURY</span></div><h2>From obligation to action.</h2></div><p>Each workspace view answers a different treasury question, with wallet actions available where the connected account has permission.</p></div>
        <div className="workspace-grid">
          <Link href="/dashboard" className="workspace-card overview-card"><span className="workspace-number">01 / OVERVIEW</span><h3>What is in the vault?</h3><p>Review total assets, protected liquidity, deployed funds, and current payment readiness.</p><span className="workspace-arrow">Open overview ↗</span></Link>
          <Link href="/obligations" className="workspace-card"><span className="workspace-number">02 / OBLIGATIONS</span><h3>What is due?</h3><p>Record commitments, see upcoming due dates, and check how obligations affect protected capital.</p><span className="workspace-arrow">Review commitments ↗</span></Link>
          <Link href="/liquidity" className="workspace-card"><span className="workspace-number">03 / LIQUIDITY</span><h3>What is available?</h3><p>Understand reserve requirements, pending obligations, idle balance, and strategy liquidity.</p><span className="workspace-arrow">Inspect liquidity ↗</span></Link>
          <Link href="/deploy" className="workspace-card"><span className="workspace-number">04 / DEPLOYMENT</span><h3>What can move?</h3><p>Review the onchain deployment limit and use the connected strategy controls when permitted.</p><span className="workspace-arrow">View deployment ↗</span></Link>
        </div>
      </section>

      <section className="setup-section">
        <div className="section-marker"><span>04</span><span>GETTING STARTED</span></div>
        <div className="setup-heading"><h2>Start with a treasury<br />you can verify.</h2><Link href="/connect" className="button button-dark">Connect a treasury <span aria-hidden="true">↗</span></Link></div>
        <div className="setup-steps"><article><span>01</span><div><h3>Connect a wallet</h3><p>Use a wallet or Safe on Arbitrum Sepolia. Reads remain public, while owner actions require the correct account and network.</p></div></article><article><span>02</span><div><h3>Select or create a vault</h3><p>Connect an existing vault, or create a testnet treasury through the configured factory.</p></div></article><article><span>03</span><div><h3>Review before acting</h3><p>Check obligations and liquidity first. The vault enforces the deployable limit when strategy capital moves.</p></div></article></div>
      </section>

      <section className="marketing-close"><div className="section-marker"><span>05</span><span>START WITH THE TREASURY</span></div><div className="close-grid"><h2>See the whole picture<br /><em>before capital moves.</em></h2><div><p>Connect a treasury to review its onchain balances and commitments. Owner actions stay gated by the connected wallet and the contracts.</p><Link href="/connect" className="button button-dark">Open Solvent <span aria-hidden="true">↗</span></Link></div></div><div className="testnet-note"><span>TESTNET ENVIRONMENT</span><p>Solvent currently runs on Arbitrum Sepolia. Test tokens and mock strategy positions have no real-world value.</p></div></section>
      <SolventFooter marketing />
    </main>
  );
}
