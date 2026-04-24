'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface FearGreedPoint {
  value: number;
  classification: string;
  ts: number;
}

interface DominanceSnapshot {
  btc: number;
  eth: number;
  usdt: number | null;
  total_market_cap_usd: number;
  total_volume_usd: number;
  active_cryptos: number;
}

interface FundingRateRow {
  symbol: string;
  funding_rate: number;
  mark_price: number;
  next_funding_ts: number;
}

interface LongShortRow {
  symbol: string;
  long_ratio: number;
  short_ratio: number;
}

interface LiquidationRow {
  symbol: string;
  long_24h_usd: number;
  short_24h_usd: number;
  total_24h_usd: number;
}

interface OpenInterestRow {
  symbol: string;
  oi_usd: number;
  oi_change_24h_pct: number | null;
}

interface Pulse {
  fear_greed: FearGreedPoint | null;
  fear_greed_history: FearGreedPoint[];
  dominance: DominanceSnapshot | null;
  top_funding: FundingRateRow[];
  top_long_short: LongShortRow[];
  liquidation: LiquidationRow[];
  open_interest: OpenInterestRow[];
}

export function MarketPulse() {
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api<Pulse>('/analytic/pulse')
      .then((r) => alive && setPulse(r))
      .catch((x) => {
        if (!alive) return;
        setErr((x as Error).message);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (err) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-xs text-fg-dim">
        Pazar pulsu alınamadı: {err}
      </div>
    );
  }
  if (!pulse) {
    return (
      <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/[0.02]" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <FearGreedCard point={pulse.fear_greed} history={pulse.fear_greed_history} />
        <DominanceCard dom={pulse.dominance} />
        <FundingCard rows={pulse.top_funding} />
        <LongShortCard rows={pulse.top_long_short} />
      </div>
      {(pulse.liquidation?.length ?? 0) > 0 || (pulse.open_interest?.length ?? 0) > 0 ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <LiquidationCard rows={pulse.liquidation ?? []} />
          <OpenInterestCard rows={pulse.open_interest ?? []} />
        </div>
      ) : null}
    </div>
  );
}

function LiquidationCard({ rows }: { rows: LiquidationRow[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="text-[10px] uppercase tracking-wider text-fg-dim">
        Son 24s likidasyon
      </div>
      {rows.length === 0 ? (
        <div className="mt-2 text-xs text-fg-dim">Veri yok</div>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {rows.slice(0, 6).map((r) => {
            const total = r.long_24h_usd + r.short_24h_usd;
            const longPct = total > 0 ? Math.round((r.long_24h_usd / total) * 100) : 50;
            return (
              <div key={r.symbol} className="space-y-0.5 text-[11px]">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-fg-muted">{r.symbol}</span>
                  <span className="text-fg-dim">{formatUsd(total)}</span>
                </div>
                <div className="flex h-1 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="bg-emerald-400"
                    style={{ width: `${longPct}%` }}
                    title={`Long ${formatUsd(r.long_24h_usd)}`}
                  />
                  <div
                    className="bg-rose-400"
                    style={{ width: `${100 - longPct}%` }}
                    title={`Short ${formatUsd(r.short_24h_usd)}`}
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

function OpenInterestCard({ rows }: { rows: OpenInterestRow[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="text-[10px] uppercase tracking-wider text-fg-dim">
        Açık Pozisyon (24s değişim)
      </div>
      {rows.length === 0 ? (
        <div className="mt-2 text-xs text-fg-dim">Veri yok</div>
      ) : (
        <div className="mt-3 flex flex-col gap-1.5">
          {rows.map((r) => {
            const chg = r.oi_change_24h_pct;
            const tone =
              chg == null
                ? 'text-fg-dim'
                : chg >= 0
                  ? 'text-emerald-300'
                  : 'text-rose-300';
            return (
              <div
                key={r.symbol}
                className="flex items-center justify-between font-mono text-[11px]"
              >
                <span className="text-fg-muted">{r.symbol}</span>
                <span className="text-fg">{formatUsd(r.oi_usd)}</span>
                <span className={`w-12 text-right ${tone}`}>
                  {chg == null ? '—' : `${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FearGreedCard({
  point,
  history,
}: {
  point: FearGreedPoint | null;
  history: FearGreedPoint[];
}) {
  const tone =
    point == null
      ? 'text-fg-dim'
      : point.value >= 70
        ? 'text-emerald-300'
        : point.value >= 50
          ? 'text-lime-300'
          : point.value >= 30
            ? 'text-amber-300'
            : 'text-rose-300';

  const spark = history.length >= 2 ? sparklinePath(history.map((h) => h.value)) : null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="text-[10px] uppercase tracking-wider text-fg-dim">
        Fear & Greed
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className={`text-3xl font-semibold ${tone}`}>
          {point ? point.value : '—'}
        </span>
        {point ? (
          <span className={`text-xs ${tone}`}>{turkishFng(point.classification)}</span>
        ) : null}
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

function DominanceCard({ dom }: { dom: DominanceSnapshot | null }) {
  if (!dom) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <div className="text-[10px] uppercase tracking-wider text-fg-dim">Dominance</div>
        <div className="mt-1 text-xs text-fg-dim">Veri yok</div>
      </div>
    );
  }
  const btc = Math.round(dom.btc * 10) / 10;
  const eth = Math.round(dom.eth * 10) / 10;
  const others = Math.max(0, 100 - btc - eth);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="text-[10px] uppercase tracking-wider text-fg-dim">
        Market Cap Dağılımı
      </div>
      <div className="mt-1 text-3xl font-semibold text-fg">
        {btc.toFixed(1)}
        <span className="text-sm text-fg-muted">% BTC</span>
      </div>
      <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-white/5">
        <div className="bg-amber-400" style={{ width: `${btc}%` }} />
        <div className="bg-indigo-400" style={{ width: `${eth}%` }} />
        <div className="bg-white/20" style={{ width: `${others}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-fg-dim">
        <span>ETH {eth.toFixed(1)}%</span>
        <span>Diğer {others.toFixed(1)}%</span>
      </div>
      <div className="mt-2 text-[10px] text-fg-dim">
        Toplam {formatUsd(dom.total_market_cap_usd)}
      </div>
    </div>
  );
}

function FundingCard({ rows }: { rows: FundingRateRow[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="text-[10px] uppercase tracking-wider text-fg-dim">
        En Yüksek Funding
      </div>
      <div className="mt-2 flex flex-col gap-1">
        {rows.length === 0 ? (
          <span className="text-xs text-fg-dim">Veri yok</span>
        ) : (
          rows.slice(0, 5).map((r) => {
            const bps = r.funding_rate * 10000;
            const tone =
              bps >= 0 ? 'text-emerald-300' : 'text-rose-300';
            return (
              <div
                key={r.symbol}
                className="flex items-center justify-between font-mono text-[11px]"
              >
                <span className="text-fg-muted">{r.symbol.replace('USDT', '')}</span>
                <span className={tone}>
                  {bps >= 0 ? '+' : ''}
                  {bps.toFixed(2)} bps
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function LongShortCard({ rows }: { rows: LongShortRow[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="text-[10px] uppercase tracking-wider text-fg-dim">
        Long / Short
      </div>
      <div className="mt-2 flex flex-col gap-1.5">
        {rows.length === 0 ? (
          <span className="text-xs text-fg-dim">Veri yok</span>
        ) : (
          rows.slice(0, 5).map((r) => {
            const longPct = Math.round(r.long_ratio * 100);
            const shortPct = Math.round(r.short_ratio * 100);
            return (
              <div key={r.symbol} className="space-y-0.5 text-[11px]">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-fg-muted">
                    {r.symbol.replace('USDT', '')}
                  </span>
                  <span className="text-fg-dim">
                    {longPct}% / {shortPct}%
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
          })
        )}
      </div>
    </div>
  );
}

function sparklinePath(values: number[]): string {
  if (values.length < 2) return '';
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

function turkishFng(cls: string): string {
  const map: Record<string, string> = {
    'Extreme Fear': 'Aşırı korku',
    Fear: 'Korku',
    Neutral: 'Nötr',
    Greed: 'Açgözlülük',
    'Extreme Greed': 'Aşırı açgözlülük',
  };
  return map[cls] ?? cls;
}

function formatUsd(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toFixed(0)}`;
}
