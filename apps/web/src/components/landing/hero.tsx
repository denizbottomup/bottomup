'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
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

/**
 * Each entry becomes one phone-frame slide. Order tells a product
 * story: market overview → what traders are doing → who they are →
 * how the user gets alerted → AI assist → news + macro context.
 *
 * Drop additional images into /public/screens/ and append them here —
 * the carousel only shows controls when there are 2+ slides.
 */
const HERO_SCREENS: ReadonlyArray<{ src: string; alt: string }> = [
  {
    src: '/screens/hero-app.png',
    alt: 'BottomUP iOS — live market dashboard with Foxy AI',
  },
  {
    src: '/screens/setups.png',
    alt: 'BottomUP iOS — live trader setups with entry, stop, take-profit',
  },
  {
    src: '/screens/traders.png',
    alt: 'BottomUP iOS — traders leaderboard with PNL and win-rate metrics',
  },
  {
    src: '/screens/notifications.png',
    alt: 'BottomUP iOS — real-time notifications feed of trader actions',
  },
  {
    src: '/screens/bup-ai.png',
    alt: 'BottomUP iOS — Bup.AI assistant building a balanced trade team',
  },
  {
    src: '/screens/news.png',
    alt: 'BottomUP iOS — sentiment-tagged crypto news feed',
  },
  {
    src: '/screens/calendar.png',
    alt: 'BottomUP iOS — macro economic calendar with impact ratings',
  },
];

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
            {/* leading-[1.02] is just generous enough to fit Inter's
                descenders ("y" in "Money", "p" in "App") inside the
                line box; the gradient span gets pb-2 as belt-and-
                suspenders so background-clip:text never crops them. */}
            <h1 className="text-[44px] font-extrabold leading-[1.02] tracking-[-0.03em] md:text-[72px] lg:text-[88px]">
              <span className="block">{t.hero.headline_1}</span>
              <span className="block logo-gradient pb-2">{t.hero.headline_2}</span>
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

          {/* Right column — phone-mockup carousel. Bezel is already
              dark, which reads as a deliberate contrast object on
              the white surround. */}
          <PhoneCarousel screens={HERO_SCREENS} />
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
 * Horizontally scroll-snapped phone carousel.
 *
 * - Native scroll-snap handles touch swipes on mobile (no JS gesture
 *   logic, which means it works inside the viewport without
 *   wrestling page scroll).
 * - On desktop, click the dots to jump; arrows show on hover when
 *   there are 2+ slides.
 * - With a single slide the rendered output is visually identical to
 *   a static phone mockup — no dots, no arrows, no scrolling.
 * - Ambient glow lives outside the scroll container so it doesn't
 *   get clipped when the user swipes.
 */
function PhoneCarousel({
  screens,
}: {
  screens: ReadonlyArray<{ src: string; alt: string }>;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const multi = screens.length > 1;

  useEffect(() => {
    if (!multi) return;
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = (): void => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const idx = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
        setActive((prev) => (prev === idx ? prev : idx));
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('scroll', onScroll);
    };
  }, [multi]);

  const goTo = (i: number): void => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <div className="group relative mx-auto w-full max-w-[300px] sm:max-w-[320px]">
      {/* Ambient glow — outside the scroll container so it stays put
          while the phones swipe past. */}
      <div className="pointer-events-none absolute -inset-10 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[110%] w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/[0.10] blur-[90px]" />
        <div className="absolute left-1/2 top-1/3 h-[60%] w-[90%] -translate-x-1/2 rounded-full bg-violet/[0.08] blur-[80px]" />
      </div>

      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-roledescription="carousel"
      >
        {screens.map((s, i) => (
          <div
            key={s.src}
            className="w-full shrink-0 snap-center"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${screens.length}`}
          >
            <PhoneFrame src={s.src} alt={s.alt} priority={i === 0} />
          </div>
        ))}
      </div>

      {multi ? (
        <>
          {/* Prev / next arrows — desktop only, shown on hover so the
              static mobile look stays clean. */}
          <button
            type="button"
            onClick={() => goTo(Math.max(0, active - 1))}
            disabled={active === 0}
            className="absolute left-[-18px] top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-md opacity-0 transition group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-0 lg:flex"
            aria-label="Previous screen"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <polyline points="15 6 9 12 15 18" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => goTo(Math.min(screens.length - 1, active + 1))}
            disabled={active === screens.length - 1}
            className="absolute right-[-18px] top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-md opacity-0 transition group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-0 lg:flex"
            aria-label="Next screen"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <polyline points="9 6 15 12 9 18" />
            </svg>
          </button>

          {/* Dot indicators — clickable, with the active one extended
              into a pill so position is visible at a glance. */}
          <div className="mt-5 flex items-center justify-center gap-1.5">
            {screens.map((s, i) => (
              <button
                key={s.src}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to screen ${i + 1}`}
                aria-current={i === active}
                className={`h-1.5 rounded-full transition-all ${
                  i === active ? 'w-6 bg-zinc-900' : 'w-1.5 bg-zinc-300 hover:bg-zinc-400'
                }`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

/** Bezel + screenshot. Hosts no glow; the carousel does that. */
function PhoneFrame({
  src,
  alt,
  priority = false,
}: {
  src: string;
  alt: string;
  priority?: boolean;
}) {
  return (
    <div className="relative rounded-[2.4rem] border border-zinc-900/10 bg-[#0a0a0c] p-[6px] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)] ring-1 ring-zinc-900/5">
      <Image
        src={src}
        alt={alt}
        width={1260}
        height={2736}
        priority={priority}
        sizes="(max-width: 640px) 280px, 320px"
        className="block h-auto w-full rounded-[2rem]"
      />
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
