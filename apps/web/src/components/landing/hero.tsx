'use client';

import Image from 'next/image';
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
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.15fr_minmax(280px,420px)] lg:gap-14">
          {/* Left column — text + CTAs */}
          <div className="text-center lg:text-left">
            <h1 className="text-[44px] font-extrabold leading-[0.95] tracking-[-0.03em] md:text-[72px] lg:text-[88px]">
              <span className="block">{t.hero.headline_1}</span>
              <span className="block logo-gradient">{t.hero.headline_2}</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base text-fg-muted md:text-lg lg:mx-0">
              {t.hero.subtitle}
            </p>

            <div className="mt-9 flex justify-center lg:justify-start">
              <StoreBadges size="sm" />
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
              <AssetChip label="Crypto" live />
              <AssetChip label="Stocks" />
              <AssetChip label="Forex" />
              <AssetChip label="Commodities" />
            </div>
          </div>

          {/* Right column — phone mockup */}
          <PhoneMockup />
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

/**
 * Phone-shaped frame around the live app screenshot. The image
 * already includes the iOS status bar and Dynamic Island, so this
 * component only adds the bezel + ambient glow — no fake notch on top.
 */
function PhoneMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[300px] sm:max-w-[320px]">
      {/* Ambient glow behind the phone */}
      <div className="pointer-events-none absolute -inset-10 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[110%] w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/20 blur-[90px]" />
        <div className="absolute left-1/2 top-1/3 h-[60%] w-[90%] -translate-x-1/2 rounded-full bg-violet/15 blur-[80px]" />
      </div>
      <div className="relative rounded-[2.4rem] border border-white/10 bg-[#0a0a0c] p-[6px] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] ring-1 ring-white/5">
        <Image
          src="/screens/hero-app.png"
          alt="BottomUP iOS — live market dashboard with Foxy AI"
          width={1260}
          height={2736}
          priority
          sizes="(max-width: 640px) 280px, 320px"
          className="block h-auto w-full rounded-[2rem]"
        />
      </div>
    </div>
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

