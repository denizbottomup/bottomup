'use client';

import Link from 'next/link';
import { useT } from '@/lib/i18n';
import type { LandingPayload } from './landing-data';
import { StoreBadges } from './store-badges';

export function Hero({ data }: { data: LandingPayload | null }) {
  const { t } = useT();
  void data;

  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 grid-pattern" />
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-240px] h-[780px] w-[1200px] -translate-x-1/2 rounded-full bg-brand/18 blur-[160px]" />
        <div className="absolute right-[-160px] top-[120px] h-[420px] w-[420px] rounded-full bg-violet/12 blur-[130px]" />
      </div>

      <div className="mx-auto max-w-[1400px] px-4 pb-16 pt-14 md:px-8 md:pb-24 md:pt-24">
        <div className="mx-auto max-w-5xl text-center">
          <h1 className="text-[48px] font-extrabold leading-[0.95] tracking-[-0.03em] md:text-[84px] lg:text-[104px]">
            <span className="block">{t.hero.headline_1}</span>
            <span className="block logo-gradient">{t.hero.headline_2}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-fg-muted md:text-lg">
            {t.hero.subtitle}
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="btn-primary animate-glow px-6 py-3.5 text-base font-semibold"
            >
              {t.hero.cta_primary}
            </Link>
            <a
              href="#foxy"
              className="btn-ghost px-6 py-3.5 text-base font-semibold"
            >
              {t.hero.cta_secondary}
            </a>
          </div>

          <div className="mt-6 flex justify-center">
            <StoreBadges size="sm" />
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            <AssetChip label="Crypto" live />
            <AssetChip label="Stocks" />
            <AssetChip label="Forex" />
            <AssetChip label="Commodities" />
          </div>
        </div>

        <div className="mx-auto mt-16 max-w-5xl">
          <div className="relative rounded-2xl border border-border bg-bg-card/60 p-[1px] backdrop-blur corner-ticks">
            <div className="grid grid-cols-2 divide-x divide-border rounded-[calc(1rem-1px)] bg-bg-card/80 md:grid-cols-4">
              <Kpi label={t.hero.kpi_volume} value="$1.59B" sub={t.hero.kpi_volume_sub} />
              <Kpi label={t.hero.kpi_downloads} value="107K+" sub={t.hero.kpi_downloads_sub} />
              <Kpi label={t.hero.kpi_mau} value="18.4K" sub={t.hero.kpi_mau_sub} />
              <Kpi
                label={t.hero.kpi_trustpilot}
                value="4.4 / 5"
                sub={t.hero.kpi_trustpilot_sub}
                tone="success"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AssetChip({ label, live }: { label: string; live?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider backdrop-blur ${
        live
          ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
          : 'border-border bg-bg-card/50 text-fg-muted'
      }`}
    >
      {live ? (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-fg-dim" />
      )}
      {label}
      {!live ? (
        <span className="text-[9px] opacity-70">soon</span>
      ) : null}
    </span>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  sub: string;
  tone?: 'neutral' | 'success';
}) {
  return (
    <div className="p-5 text-left md:p-6">
      <div className="mono-label !text-fg-dim">{label}</div>
      <div
        className={`stat-num mt-2 text-3xl font-bold tracking-tight md:text-4xl ${
          tone === 'success' ? 'text-emerald-300' : 'text-fg'
        }`}
      >
        {value}
      </div>
      <div className="mt-1 text-[11px] text-fg-muted">{sub}</div>
    </div>
  );
}

