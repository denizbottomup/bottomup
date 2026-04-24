import type { LandingPayload } from './landing-data';
import { formatUsd } from './landing-data';

export function PulseSection({ pulse }: { pulse: LandingPayload['pulse'] }) {
  return (
    <section id="pulse" className="border-y border-border bg-bg-card/30">
      <div className="mx-auto max-w-[1400px] px-4 py-14 md:px-8 md:py-20">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-brand">
              Live market data
            </div>
            <h2 className="mt-1 text-2xl font-semibold md:text-3xl">
              Every number a crypto trader reads, in one place
            </h2>
            <p className="mt-2 text-sm text-fg-muted md:max-w-xl">
              CoinGlass, CoinGecko, and Binance futures — aggregated server-side
              and cached for 5 minutes so nothing lags. Fear & Greed,
              dominance, funding rates, long/short bias, liquidations, open
              interest — the full dashboard, no login required.
            </p>
          </div>
          <span className="rounded-full border border-border bg-bg-card px-3 py-1 text-[10px] text-fg-muted">
            Auto-refreshed · 5 min cache
          </span>
        </header>

        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          <FearGreedCard pulse={pulse} />
          <DominanceCard pulse={pulse} />
          <FundingCard pulse={pulse} />
          <LiquidationCard pulse={pulse} />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <LongShortCard pulse={pulse} />
          <OpenInterestCard pulse={pulse} />
        </div>

        {pulse.liquidation.length > 0 || pulse.open_interest.length > 0 ? (
          <LiquidationTable pulse={pulse} />
        ) : null}
      </div>
    </section>
  );
}

function FearGreedCard({ pulse }: { pulse: LandingPayload['pulse'] }) {
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
        Fear & Greed Index
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

function DominanceCard({ pulse }: { pulse: LandingPayload['pulse'] }) {
  const dom = pulse.dominance;
  if (!dom) {
    return (
      <div className="rounded-2xl border border-border bg-bg-card p-4">
        <div className="text-[10px] uppercase tracking-wider text-fg-dim">
          Dominance
        </div>
        <div className="mt-2 text-sm text-fg-dim">No data</div>
      </div>
    );
  }
  const btc = Math.round(dom.btc * 10) / 10;
  const eth = Math.round(dom.eth * 10) / 10;
  const others = Math.max(0, 100 - btc - eth);
  return (
    <div className="rounded-2xl border border-border bg-bg-card p-4">
      <div className="text-[10px] uppercase tracking-wider text-fg-dim">
        BTC Dominance
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

function FundingCard({ pulse }: { pulse: LandingPayload['pulse'] }) {
  const rows = pulse.top_funding.slice(0, 4);
  return (
    <div className="rounded-2xl border border-border bg-bg-card p-4">
      <div className="text-[10px] uppercase tracking-wider text-fg-dim">
        Top funding (abs)
      </div>
      <div className="mt-2 flex flex-col gap-1">
        {rows.length === 0 ? (
          <span className="text-xs text-fg-dim">No data</span>
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

function LiquidationCard({ pulse }: { pulse: LandingPayload['pulse'] }) {
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
        24h liquidations
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
            <span>Long {pct.toFixed(0)}%</span>
            <span>Short {(100 - pct).toFixed(0)}%</span>
          </div>
        </>
      ) : (
        <div className="mt-2 text-xs text-fg-dim">No data</div>
      )}
    </div>
  );
}

function LongShortCard({ pulse }: { pulse: LandingPayload['pulse'] }) {
  const rows = pulse.top_long_short.slice(0, 4);
  return (
    <div className="rounded-2xl border border-border bg-bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider text-fg-dim">
          Long / Short ratio
        </div>
        <span className="text-[10px] text-fg-dim">Binance · 1h</span>
      </div>
      {rows.length === 0 ? (
        <div className="mt-2 text-xs text-fg-dim">No data</div>
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

function OpenInterestCard({ pulse }: { pulse: LandingPayload['pulse'] }) {
  const rows = pulse.open_interest.slice(0, 3);
  return (
    <div className="rounded-2xl border border-border bg-bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider text-fg-dim">
          Open interest (24h)
        </div>
        <span className="text-[10px] text-fg-dim">CoinGlass</span>
      </div>
      {rows.length === 0 ? (
        <div className="mt-2 text-xs text-fg-dim">No data</div>
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

function LiquidationTable({ pulse }: { pulse: LandingPayload['pulse'] }) {
  const liq = pulse.liquidation.slice(0, 8);
  if (liq.length === 0) return null;
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="text-[10px] uppercase tracking-wider text-fg-dim">
          Liquidations by coin · last 24h
        </div>
        <span className="text-[10px] text-fg-dim">CoinGlass</span>
      </div>
      <table className="w-full text-sm">
        <thead className="text-[10px] uppercase tracking-wider text-fg-dim">
          <tr>
            <th className="px-4 py-2 text-left">Coin</th>
            <th className="px-4 py-2 text-right">Long</th>
            <th className="px-4 py-2 text-right">Short</th>
            <th className="px-4 py-2 text-right">Total</th>
            <th className="hidden px-4 py-2 text-right md:table-cell">Long/Short</th>
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
