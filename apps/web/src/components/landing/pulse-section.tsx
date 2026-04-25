'use client';

import type { LandingPayload } from './landing-data';
import { formatUsd } from './landing-data';
import { useT, type Dict } from '@/lib/i18n';

export function PulseSection({ pulse }: { pulse: LandingPayload['pulse'] }) {
  const { t } = useT();
  return (
    <section id="pulse" className="border-y border-border bg-bg-card/30">
      <div className="mx-auto max-w-[1400px] px-4 py-14 md:px-8 md:py-20">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-brand">
              {t.pulse.label}
            </div>
            <h2 className="mt-1 text-3xl font-extrabold tracking-[-0.02em] md:text-5xl">
              {t.pulse.headline_1}{' '}
              <span className="logo-gradient">{t.pulse.headline_2}</span>{' '}
              {t.pulse.headline_3}
            </h2>
            <p className="mt-2 text-sm text-fg-muted md:max-w-2xl">
              {t.pulse.subtitle}
            </p>
          </div>
          <span className="rounded-full border border-border bg-bg-card px-3 py-1 text-[10px] text-fg-muted">
            {t.pulse.auto}
          </span>
        </header>

        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          <FearGreedCard pulse={pulse} tp={t.pulse} />
          <DominanceCard pulse={pulse} tp={t.pulse} />
          <FundingCard pulse={pulse} tp={t.pulse} />
          <LiquidationCard pulse={pulse} tp={t.pulse} />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <LongShortCard pulse={pulse} tp={t.pulse} />
          <OpenInterestCard pulse={pulse} tp={t.pulse} />
        </div>

        {pulse.liquidation.length > 0 || pulse.open_interest.length > 0 ? (
          <LiquidationTable pulse={pulse} tp={t.pulse} />
        ) : null}

        <WhaleStrip positions={pulse.whale_positions} />
      </div>
    </section>
  );
}

/**
 * Compact whale-watch strip — folded into the Pulse section instead
 * of getting its own standalone block. Shows the top 5 currently-open
 * Hyperliquid positions ($1M+) so the visitor sees that we surface
 * the same wallet-level data Foxy is reading from, without donating
 * a full screen of vertical real estate to it.
 */
function WhaleStrip({
  positions,
}: {
  positions: LandingPayload['pulse']['whale_positions'];
}) {
  const { t } = useT();
  if (positions.length === 0) return null;
  const top = positions.slice(0, 5);
  const totalNotional = positions.reduce(
    (acc, p) => acc + Math.abs(p.position_value_usd),
    0,
  );
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-fg-dim">
            {t.whales.label}
          </span>
          <span className="rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-[10px] text-brand">
            {t.whales.threshold}
          </span>
        </div>
        <span className="font-mono text-[10px] text-fg-dim">
          <span className="text-fg">{positions.length}</span> wallets ·{' '}
          <span className="text-fg">{formatUsd(totalNotional)}</span> open
        </span>
      </div>
      <div className="divide-y divide-white/5">
        {top.map((p) => (
          <WhaleRow key={`${p.user}:${p.symbol}`} pos={p} />
        ))}
      </div>
    </div>
  );
}

function WhaleRow({
  pos,
}: {
  pos: LandingPayload['pulse']['whale_positions'][number];
}) {
  const isLong = pos.side === 'long';
  const pnlPositive = pos.unrealized_pnl >= 0;
  const sideCls = isLong
    ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30'
    : 'bg-rose-500/10 text-rose-300 ring-rose-500/30';
  return (
    <div className="flex items-center gap-3 px-4 py-2 font-mono text-[11px]">
      <span className="hidden w-28 text-fg-dim sm:inline">
        {truncateAddress(pos.user)}
      </span>
      <span className="w-14 font-semibold text-fg">{pos.symbol}</span>
      <span
        className={`rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider ring-1 ${sideCls}`}
      >
        {isLong ? 'L' : 'S'}
      </span>
      <span className="text-fg-dim">{pos.leverage}x</span>
      <span className="ml-auto font-semibold text-fg">
        {formatUsd(Math.abs(pos.position_value_usd))}
      </span>
      <span
        className={`hidden w-24 text-right md:inline ${
          pnlPositive ? 'text-emerald-300' : 'text-rose-300'
        }`}
      >
        {pnlPositive ? '+' : ''}
        {formatUsd(pos.unrealized_pnl)}
      </span>
    </div>
  );
}

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

type PulseTp = Dict['pulse'];

function FearGreedCard({ pulse, tp }: { pulse: LandingPayload['pulse']; tp: PulseTp }) {
  const fg = pulse.fear_greed;
  const hist = pulse.fear_greed_history;
  const tone =
    fg == null
      ? 'text-fg-dim'
      : fg.value >= 70
        ? 'text-emerald-300'
        : fg.value >= 50
          ? 'text-lime-300'
          : fg.value >= 30
            ? 'text-amber-300'
            : 'text-rose-300';
  const spark = hist.length >= 2 ? sparkline(hist.map((h) => h.value)) : null;
  return (
    <div className="rounded-2xl border border-border bg-bg-card p-4">
      <div className="text-[10px] uppercase tracking-wider text-fg-dim">
        {tp.fg}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className={`text-3xl font-semibold md:text-4xl ${tone}`}>
          {fg?.value ?? '—'}
        </span>
        {fg ? <span className={`text-xs ${tone}`}>{fg.classification}</span> : null}
      </div>
      {spark ? (
        <svg viewBox="0 0 100 30" className="mt-3 h-8 w-full">
          <path
            d={spark}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className={tone}
          />
        </svg>
      ) : null}
    </div>
  );
}

function DominanceCard({ pulse, tp }: { pulse: LandingPayload['pulse']; tp: PulseTp }) {
  const dom = pulse.dominance;
  if (!dom) {
    return (
      <div className="rounded-2xl border border-border bg-bg-card p-4">
        <div className="text-[10px] uppercase tracking-wider text-fg-dim">
          {tp.dom}
        </div>
        <div className="mt-2 text-sm text-fg-dim">{tp.no_data}</div>
      </div>
    );
  }
  const btc = Math.round(dom.btc * 10) / 10;
  const eth = Math.round(dom.eth * 10) / 10;
  const others = Math.max(0, 100 - btc - eth);
  return (
    <div className="rounded-2xl border border-border bg-bg-card p-4">
      <div className="text-[10px] uppercase tracking-wider text-fg-dim">
        {tp.dom}
      </div>
      <div className="mt-1 text-3xl font-semibold md:text-4xl">
        {btc.toFixed(1)}
        <span className="text-base text-fg-muted">%</span>
      </div>
      <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-white/5">
        <div className="bg-amber-400" style={{ width: `${btc}%` }} />
        <div className="bg-indigo-400" style={{ width: `${eth}%` }} />
        <div className="bg-white/20" style={{ width: `${others}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-fg-dim">
        <span>ETH {eth.toFixed(1)}%</span>
        <span>Others {others.toFixed(1)}%</span>
      </div>
    </div>
  );
}

function FundingCard({ pulse, tp }: { pulse: LandingPayload['pulse']; tp: PulseTp }) {
  const rows = pulse.top_funding.slice(0, 4);
  return (
    <div className="rounded-2xl border border-border bg-bg-card p-4">
      <div className="text-[10px] uppercase tracking-wider text-fg-dim">
        {tp.funding}
      </div>
      <div className="mt-2 flex flex-col gap-1">
        {rows.length === 0 ? (
          <span className="text-xs text-fg-dim">{tp.no_data}</span>
        ) : (
          rows.map((r) => {
            const bps = r.funding_rate * 10000;
            const tone = bps >= 0 ? 'text-emerald-300' : 'text-rose-300';
            return (
              <div
                key={r.symbol}
                className="flex items-center justify-between font-mono text-[11px]"
              >
                <span className="text-fg-muted">
                  {r.symbol.replace('USDT', '')}
                </span>
                <span className={tone}>
                  {bps >= 0 ? '+' : ''}
                  {bps.toFixed(1)}bps
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function LiquidationCard({ pulse, tp }: { pulse: LandingPayload['pulse']; tp: PulseTp }) {
  const total = pulse.liquidation
    .slice(0, 5)
    .reduce((n, r) => n + r.total_24h_usd, 0);
  const totalLong = pulse.liquidation
    .slice(0, 5)
    .reduce((n, r) => n + r.long_24h_usd, 0);
  const pct = total > 0 ? (totalLong / total) * 100 : 50;
  return (
    <div className="rounded-2xl border border-border bg-bg-card p-4">
      <div className="text-[10px] uppercase tracking-wider text-fg-dim">
        {tp.liq_24h}
      </div>
      <div className="mt-1 text-3xl font-semibold md:text-4xl">
        {formatUsd(total)}
      </div>
      {total > 0 ? (
        <>
          <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-rose-400/20">
            <div className="bg-emerald-400" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-fg-dim">
            <span>{tp.table_long} {pct.toFixed(0)}%</span>
            <span>{tp.table_short} {(100 - pct).toFixed(0)}%</span>
          </div>
        </>
      ) : (
        <div className="mt-2 text-xs text-fg-dim">{tp.no_data}</div>
      )}
    </div>
  );
}

function LongShortCard({ pulse, tp }: { pulse: LandingPayload['pulse']; tp: PulseTp }) {
  const rows = pulse.top_long_short.slice(0, 4);
  return (
    <div className="rounded-2xl border border-border bg-bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider text-fg-dim">
          {tp.ls}
        </div>
        <span className="text-[10px] text-fg-dim">{tp.ls_sub}</span>
      </div>
      {rows.length === 0 ? (
        <div className="mt-2 text-xs text-fg-dim">{tp.no_data}</div>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          {rows.map((r) => {
            const longPct = Math.round(r.long_ratio * 100);
            return (
              <div key={r.symbol} className="space-y-0.5 text-[11px]">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-fg-muted">
                    {r.symbol.replace('USDT', '')}
                  </span>
                  <span className="text-fg-dim">
                    {longPct}% / {100 - longPct}%
                  </span>
                </div>
                <div className="flex h-1 overflow-hidden rounded-full bg-rose-400/20">
                  <div
                    className="bg-emerald-400"
                    style={{ width: `${longPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OpenInterestCard({ pulse, tp }: { pulse: LandingPayload['pulse']; tp: PulseTp }) {
  const rows = pulse.open_interest.slice(0, 3);
  return (
    <div className="rounded-2xl border border-border bg-bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider text-fg-dim">
          {tp.oi}
        </div>
        <span className="text-[10px] text-fg-dim">CoinGlass</span>
      </div>
      {rows.length === 0 ? (
        <div className="mt-2 text-xs text-fg-dim">{tp.no_data}</div>
      ) : (
        <div className="mt-3 flex flex-col gap-1.5 font-mono text-[12px]">
          {rows.map((r) => {
            const chg = r.oi_change_24h_pct;
            const tone =
              chg == null
                ? 'text-fg-dim'
                : chg >= 0
                  ? 'text-emerald-300'
                  : 'text-rose-300';
            return (
              <div key={r.symbol} className="flex items-center justify-between">
                <span className="text-fg-muted">{r.symbol}</span>
                <span className="text-fg">{formatUsd(r.oi_usd)}</span>
                <span className={`w-16 text-right ${tone}`}>
                  {chg == null
                    ? '—'
                    : `${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LiquidationTable({ pulse, tp }: { pulse: LandingPayload['pulse']; tp: PulseTp }) {
  const liq = pulse.liquidation.slice(0, 8);
  if (liq.length === 0) return null;
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="text-[10px] uppercase tracking-wider text-fg-dim">
          {tp.liq_table}
        </div>
        <span className="text-[10px] text-fg-dim">CoinGlass</span>
      </div>
      <table className="w-full text-sm">
        <thead className="text-[10px] uppercase tracking-wider text-fg-dim">
          <tr>
            <th className="px-4 py-2 text-left">{tp.table_coin}</th>
            <th className="px-4 py-2 text-right">{tp.table_long}</th>
            <th className="px-4 py-2 text-right">{tp.table_short}</th>
            <th className="px-4 py-2 text-right">{tp.table_total}</th>
            <th className="hidden px-4 py-2 text-right md:table-cell">{tp.table_split}</th>
          </tr>
        </thead>
        <tbody>
          {liq.map((r) => {
            const pct =
              r.total_24h_usd > 0
                ? (r.long_24h_usd / r.total_24h_usd) * 100
                : 50;
            return (
              <tr key={r.symbol} className="border-t border-white/5">
                <td className="px-4 py-2 font-mono font-semibold text-fg">
                  {r.symbol}
                </td>
                <td className="px-4 py-2 text-right font-mono text-emerald-300">
                  {formatUsd(r.long_24h_usd)}
                </td>
                <td className="px-4 py-2 text-right font-mono text-rose-300">
                  {formatUsd(r.short_24h_usd)}
                </td>
                <td className="px-4 py-2 text-right font-mono text-fg">
                  {formatUsd(r.total_24h_usd)}
                </td>
                <td className="hidden px-4 py-2 md:table-cell">
                  <div className="flex h-1 overflow-hidden rounded-full bg-rose-400/20">
                    <div
                      className="bg-emerald-400"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function sparkline(values: number[]): string {
  const w = 100;
  const h = 30;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = w / (values.length - 1);
  return values
    .map((v, i) => {
      const x = (i * step).toFixed(2);
      const y = (h - ((v - min) / range) * h).toFixed(2);
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    })
    .join(' ');
}
