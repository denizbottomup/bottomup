'use client';

import Image from 'next/image';
import { useT } from '@/lib/i18n';
import type { LandingPayload } from './landing-data';
import { StoreBadges } from './store-badges';

/**
 * Light-theme hero. The rest of the landing is dark — the contrast
 * gives the section an editorial feel and lets the dark phone
 * screenshot pop against the white surround. The transition into the
 * (dark) PartnersSection that follows is a hard `border-b` so the
 * black/white edge reads as intentional rather than a missing
 * background.
 */
export function Hero({ data }: { data: LandingPayload | null }) {
  const { t } = useT();
  void data;

  return (
    <section className="relative overflow-hidden border-b border-zinc-200 bg-zinc-50 text-zinc-900">
      {/* Soft brand color accents — much subtler on white than the
          full-blast glows the dark sections use. */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-260px] h-[680px] w-[1100px] -translate-x-1/2 rounded-full bg-brand/[0.07] blur-[140px]" />
        <div className="absolute right-[-180px] top-[140px] h-[420px] w-[420px] rounded-full bg-violet/[0.06] blur-[120px]" />
      </div>

      <div className="mx-auto max-w-[1400px] px-4 pb-16 pt-14 md:px-8 md:pb-24 md:pt-24">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.15fr_minmax(280px,420px)] lg:gap-14">
          {/* Left column — text + CTAs */}
          <div className="text-center lg:text-left">
            <h1 className="text-[44px] font-extrabold leading-[0.95] tracking-[-0.03em] md:text-[72px] lg:text-[88px]">
              <span className="block">{t.hero.headline_1}</span>
              <span className="block logo-gradient">{t.hero.headline_2}</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base text-zinc-600 md:text-lg lg:mx-0">
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

          {/* Right column — phone mockup. The bezel is already dark,
              which now reads as a deliberate contrast object on the
              white surround instead of blending in. */}
          <PhoneMockup />
        </div>

        <div className="mx-auto mt-16 max-w-5xl">
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-[0_4px_24px_-12px_rgba(0,0,0,0.08)]">
            <div className="grid grid-cols-2 divide-x divide-zinc-200 md:grid-cols-4">
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
      {/* Ambient glow behind the phone — toned down for the white
          surround so it reads as a halo rather than a smudge. */}
      <div className="pointer-events-none absolute -inset-10 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[110%] w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/[0.10] blur-[90px]" />
        <div className="absolute left-1/2 top-1/3 h-[60%] w-[90%] -translate-x-1/2 rounded-full bg-violet/[0.08] blur-[80px]" />
      </div>
      <div className="relative rounded-[2.4rem] border border-zinc-900/10 bg-[#0a0a0c] p-[6px] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)] ring-1 ring-zinc-900/5">
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
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider ${
        live
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
          : 'border-zinc-300 bg-white text-zinc-500'
      }`}
    >
      {live ? (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
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
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </div>
      <div
        className={`stat-num mt-2 text-3xl font-bold tracking-tight md:text-4xl ${
          tone === 'success' ? 'text-emerald-600' : 'text-zinc-900'
        }`}
      >
        {value}
      </div>
      <div className="mt-1 text-[11px] text-zinc-500">{sub}</div>
    </div>
  );
}
