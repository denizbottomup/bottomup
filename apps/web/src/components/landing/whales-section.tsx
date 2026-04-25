'use client';

import type { LandingPayload } from './landing-data';
import { formatUsd } from './landing-data';
import { useT } from '@/lib/i18n';

type Position = LandingPayload['pulse']['whale_positions'][number];

/**
 * "Whale Watch" — light-theme section that surfaces currently-open
 * Hyperliquid positions of $1M+ notional. Comes from CoinGlass via
 * MarketIntelService; payload lives on `pulse.whale_positions` so
 * the section renders without a separate fetch.
 *
 * Light theme deliberately to extend the dark/light alternation
 * (Pulse above is dark; this rest beat keeps the page rhythm and
 * makes the data table breathe).
 *
 * Why open positions and not the alerts feed: the state view has
 * way bigger numbers (think $77M BTC short with -$9M unrealized PnL
 * vs. a $1.4M open from 5 mins ago). For a marketing surface, "size"
 * beats "freshness" — and the live feel still comes from the mark-
 * price column ticking every minute when CG cache rolls.
 */
export function WhalesSection({
  positions,
}: {
  positions: Position[];
}) {
  const { t } = useT();

  // Hide the whole section if there's nothing to show — better than
  // surfacing an empty card grid that looks broken.
  if (positions.length === 0) return null;

  const top = positions.slice(0, 9);
  const totalNotional = positions.reduce(
    (acc, p) => acc + Math.abs(p.position_value_usd),
    0,
  );

  return (
    <section
      id="whales"
      className="relative border-y border-zinc-200 bg-zinc-50 text-zinc-900"
    >
      <div className="mx-auto max-w-[1400px] px-4 py-14 md:px-8 md:py-20">
        <header className="flex max-w-3xl flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <div className="text-[11px] uppercase tracking-[0.2em] text-brand">
              {t.whales.label}
            </div>
            <h2 className="mt-1 text-3xl font-extrabold tracking-[-0.02em] md:text-5xl">
              {t.whales.headline_1}{' '}
              <span className="logo-gradient pb-1">{t.whales.headline_2}</span>
            </h2>
            <p className="mt-3 text-sm text-zinc-600 md:text-base">
              {t.whales.subtitle}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-[11px] text-brand">
              {t.whales.threshold}
            </span>
            <div className="text-right text-[11px] text-zinc-500">
              <span className="font-mono font-semibold text-zinc-900">
                {positions.length}
              </span>{' '}
              wallets ·{' '}
              <span className="font-mono font-semibold text-zinc-900">
                {formatUsd(totalNotional)}
              </span>{' '}
              total
            </div>
          </div>
        </header>

        <div className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {top.map((p) => (
            <WhaleCard key={`${p.user}:${p.symbol}`} pos={p} />
          ))}
        </div>

        <p className="mt-8 text-center text-[11px] text-zinc-500">
          {t.whales.source}
        </p>
      </div>
    </section>
  );
}

function WhaleCard({ pos }: { pos: Position }) {
  const { t } = useT();
  const isLong = pos.side === 'long';
  const pnlPositive = pos.unrealized_pnl >= 0;

  return (
    <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_2px_12px_-6px_rgba(0,0,0,0.06)] transition hover:border-brand/30 hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.10)]">
      {/* Header — wallet, side pill, symbol */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-[11px] text-zinc-500">
            {truncateAddress(pos.user)}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-lg font-bold text-zinc-900">{pos.symbol}</span>
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                isLong
                  ? 'bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/30'
              }`}
            >
              {isLong ? t.whales.side_long : t.whales.side_short}
            </span>
            <span className="font-mono text-[10px] uppercase text-zinc-500">
              {pos.leverage}x · {pos.margin_mode}
            </span>
          </div>
        </div>
      </div>

      {/* Notional — the headline number */}
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
          {t.whales.notional}
        </span>
      </div>
      <div className="stat-num mt-1 text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
        {formatUsd(Math.abs(pos.position_value_usd))}
      </div>

      {/* Unrealized PnL — color-coded */}
      <div className="mt-3 flex items-center gap-2 text-[12px]">
        <span className="text-zinc-500">{t.whales.unrealized}</span>
        <span
          className={`stat-num font-semibold ${
            pnlPositive ? 'text-emerald-600' : 'text-rose-600'
          }`}
        >
          {pnlPositive ? '+' : ''}
          {formatUsd(pos.unrealized_pnl)}
        </span>
      </div>

      {/* Price levels */}
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-zinc-100 pt-3 text-[11px]">
        <Stat label={t.whales.entry} value={fmtPrice(pos.entry_price)} />
        <Stat label="Mark" value={fmtPrice(pos.mark_price)} />
        <Stat label={t.whales.liquidation} value={fmtPrice(pos.liq_price)} tone="warn" />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'warn';
}) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div
        className={`stat-num mt-0.5 font-mono font-semibold ${
          tone === 'warn' ? 'text-amber-600' : 'text-zinc-900'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

/** 0x0ddf9bae...8a902 — center-truncated wallet address. */
function truncateAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** Compact price formatter — keeps decimals only when small. */
function fmtPrice(n: number): string {
  if (!Number.isFinite(n) || n === 0) return '—';
  if (n >= 1000) return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (n >= 1) return `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  return `$${n.toFixed(4)}`;
}
