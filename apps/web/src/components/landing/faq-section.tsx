'use client';

import { useState } from 'react';
import { useT } from '@/lib/i18n';

export function FaqSection() {
  const { t } = useT();
  return (
    <section id="faq" className="relative">
      <div className="mx-auto max-w-[900px] px-4 py-14 md:px-8 md:py-20">
        <header className="text-center">
          <div className="text-[11px] uppercase tracking-[0.2em] text-brand">
            {t.faq.label}
          </div>
          <h2 className="mt-1 text-4xl font-extrabold tracking-[-0.02em] md:text-5xl">
            {t.faq.headline_1}{' '}
            <span className="logo-gradient">{t.faq.headline_2}</span>{' '}
            {t.faq.headline_3}
          </h2>
        </header>

        <div className="mt-10 space-y-2">
          {t.faq.items.map((item, i) => (
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
