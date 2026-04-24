'use client';

import { useState } from 'react';

const QA: Array<{ q: string; a: string }> = [
  {
    q: 'What is BottomUP, in one sentence?',
    a: 'The App Store of smart money — a marketplace where you subscribe to human traders, algorithmic bots, and AI agents, with every signal audited by our proprietary AI firewall before it reaches your wallet.',
  },
  {
    q: 'How is Foxy AI different from regular copy trading?',
    a: "Traditional copy-trading just mirrors whatever the trader (or bot) sends. If they revenge-trade with 50x leverage, so do you. Foxy intercepts every signal, scores it 0–100 across 225 data sources, and blocks the trade at the firewall if risk is too high — even if you subscribed. It's audit, not mirror.",
  },
  {
    q: 'What are MCPs?',
    a: "Modular Crypto Processors — nine specialized AI agents running alongside Foxy: risk mitigation, trade timing, trader matchmaking, token research, airdrop scout, portfolio rebalancing, regulatory scan, sentiment divergence, and influencer manipulation watchdog. Each one turns a different stream of noise into actionable signal.",
  },
  {
    q: 'What can I subscribe to on the marketplace?',
    a: 'Three kinds of shops: human traders publishing live setups, vetted algorithmic bots running 24/7, and autonomous AI agents with specialized mandates (alpha scout, rebalancer, hedger). Credits subscribe you across all three.',
  },
  {
    q: 'How does copy trading on OKX work?',
    a: "Connect your OKX API (Read + Trade only — never Withdraw). When a creator you subscribe to publishes a signal, Foxy audits it, optimizes the entry/exit, and our worker places the same order on your account. You keep full control — revoke the API key at OKX or disconnect from BottomUP any time.",
  },
  {
    q: 'What are BottomUP Credits?',
    a: "The universal currency across the marketplace. Buy with credit card or crypto, use them to subscribe to any shop. Creators earn 25% of credit revenue they generate plus 10% on referrals. The platform takes 30%; the rest funds infrastructure and volume rebates.",
  },
  {
    q: 'Is the $BUP token live?',
    a: 'Not yet. $BUP launches alongside the marketplace in 2026 with trade-to-earn mechanics — utility spans marketplace purchases, back-testing access, full Foxy features, and volume rewards. More info in the pitch deck and whitepaper.',
  },
  {
    q: 'Which exchanges and assets are supported?',
    a: "OKX is live today; Binance and Bybit are on the roadmap. Crypto is live across all markets; Stocks, Forex, and Commodities launch in Q1 2027 on the same marketplace.",
  },
  {
    q: 'Why should I trust you with my trades?',
    a: "The numbers are public: $1.59B lifetime volume, 107K+ organic downloads, 4.4/5 on Trustpilot, 315% YoY revenue growth, $0 paid CAC. Delaware HQ, Dubai VARA license in progress. No exchange dependency — we don't custody your funds, your wallet stays yours.",
  },
  {
    q: 'How do I get started today?',
    a: 'Sign up free at bupcore.ai — email, Google, Apple, or phone. Your account syncs with iOS and Android instantly. Browse shops, try Foxy simulation mode to test a strategy, then connect OKX when you want to go live.',
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="relative">
      <div className="mx-auto max-w-[900px] px-4 py-14 md:px-8 md:py-20">
        <header className="text-center">
          <div className="text-[11px] uppercase tracking-[0.2em] text-brand">
            Frequently asked
          </div>
          <h2 className="mt-1 text-4xl font-extrabold tracking-[-0.02em] md:text-5xl">
            Everything investors and{' '}
            <span className="logo-gradient">traders</span> ask us.
          </h2>
        </header>

        <div className="mt-10 space-y-2">
          {QA.map((item, i) => (
            <FaqItem key={i} q={item.q} a={item.a} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-bg-card transition hover:border-white/20">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-sm font-medium text-fg md:text-base">{q}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-fg-muted transition ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open ? (
        <div className="px-5 pb-5 text-sm leading-relaxed text-fg-muted">
          {a}
        </div>
      ) : null}
    </div>
  );
}
