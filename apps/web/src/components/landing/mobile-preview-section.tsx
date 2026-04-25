'use client';

import { useT } from '@/lib/i18n';
import { StoreBadges } from './store-badges';

export function MobilePreviewSection() {
  const { t } = useT();
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute right-[5%] top-1/2 h-[460px] w-[460px] -translate-y-1/2 rounded-full bg-brand/10 blur-[140px]" />
        <div className="absolute right-[20%] top-[30%] h-[260px] w-[260px] rounded-full bg-violet/10 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-[1100px] px-4 py-14 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mono-label">{t.mobile.label}</div>
          <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.02em] md:text-5xl">
            {t.mobile.headline_1}{' '}
            <span className="logo-gradient">{t.mobile.headline_2}</span>{' '}
            {t.mobile.headline_3}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-fg-muted md:text-base">
            {t.mobile.body}
          </p>
        </div>

        <ul className="mx-auto mt-10 grid max-w-2xl grid-cols-1 gap-3 text-sm text-fg sm:grid-cols-3">
          <li className="flex items-start gap-2 rounded-xl border border-border bg-bg-card/40 p-4">
            <Tick />
            <span>{t.mobile.bullet_push}</span>
          </li>
          <li className="flex items-start gap-2 rounded-xl border border-border bg-bg-card/40 p-4">
            <Tick />
            <span>{t.mobile.bullet_score}</span>
          </li>
          <li className="flex items-start gap-2 rounded-xl border border-border bg-bg-card/40 p-4">
            <Tick />
            <span>{t.mobile.bullet_copy}</span>
          </li>
        </ul>

        <div className="mt-8 flex justify-center">
          <StoreBadges />
        </div>
      </div>
    </section>
  );
}

function Tick() {
  return (
    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mint/15 text-mint ring-1 ring-mint/40">
      <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  );
}
