'use client';

import { useState } from 'react';

const QA: Array<{ q: string; a: string }> = [
  {
    q: 'How do I get started?',
    a: 'Sign up for free at bupcore.ai with email, Google, Apple, or your phone number. The moment your account is created we credit it with a $10,000 virtual portfolio — no payment info required.',
  },
  {
    q: 'How does the $10,000 virtual portfolio work?',
    a: "Pick up to 6 traders for your team. Every setup they publish opens in your portfolio at real market prices. After 30 days you see exactly what you would have made (or lost) if you had traded with real money.",
  },
  {
    q: 'Is OKX copy trading safe?',
    a: "Your API credentials are encrypted on our servers and never returned to the browser. We only need Read + Trade permissions — Withdraw is never requested. You can also add an IP restriction on OKX. Revoke at any time from OKX or disconnect from bupcore.",
  },
  {
    q: 'How are traders selected?',
    a: "Every trader is manually approved by the Bupcore team. Each profile shows their 180-day cumulative P&L curve, win rate, and risk profile — you decide who to follow based on real data, not marketing.",
  },
  {
    q: 'What is Foxy AI?',
    a: "An automated risk note attached to every setup: a 0-100 risk score and a short paragraph covering entry-stop sanity, R/R, news alignment, and breakeven-stop detection. Powered by Anthropic's Claude Haiku.",
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Even on the 3-month or 6-month plan you can cancel auto-renew at any time and keep full access until the remaining period ends.',
  },
  {
    q: 'Which exchanges are supported?',
    a: 'OKX today. Binance and Bybit are coming in 2026. Setups are exchange-agnostic — you can follow them anywhere; only copy trading is tied to a specific broker.',
  },
  {
    q: 'Is there a mobile app?',
    a: 'Yes. Bupcore is available on the App Store and Google Play. Your web account syncs with mobile — sign in anywhere, same team, same performance.',
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
          <h2 className="mt-1 text-3xl font-semibold md:text-4xl">
            Things people ask before signing up
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
