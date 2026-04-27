'use client';

import { useEffect, useState } from 'react';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://bottomupapi-production.up.railway.app';

interface TraderDetail {
  trader: {
    id: string;
    name: string | null;
    first_name: string | null;
    last_name: string | null;
    image: string | null;
    bio: string | null;
    followers: number;
  };
  stats: {
    trades: number;
    wins: number;
    losses: number;
    win_rate: number | null;
    total_pnl: number;
    total_r: number;
    best_trade_pnl: number;
    worst_trade_pnl: number;
    virtual_balance_usd: number;
    virtual_return_pct: number;
  };
  all_time: {
    trades: number;
    wins: number;
    losses: number;
    win_rate: number | null;
    total_pnl: number;
    total_r: number;
    virtual_balance_usd: number;
    virtual_return_pct: number;
  };
  equity_curve: Array<{ t: number; balance: number }>;
  monthly: Array<{ month: string; net_r: number; trades: number }>;
  coins: Array<{
    coin: string;
    trades: number;
    wins: number;
    win_rate: number;
    net_r: number;
    net_pnl: number;
  }>;
  long_short: {
    long: { trades: number; wins: number; net_r: number; net_pnl: number };
    short: { trades: number; wins: number; net_r: number; net_pnl: number };
  };
  recent: Array<{
    id: string;
    coin: string;
    position: 'long' | 'short' | null;
    status: string;
    close_date: string | null;
    pnl: number;
    r: number;
  }>;
}

export function TraderDetailModal({
  analyst,
  displayName,
  onClose,
}: {
  analyst: string;
  displayName: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<TraderDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE}/public/trader/${encodeURIComponent(analyst)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json: TraderDetail) => {
        if (alive) setData(json);
      })
      .catch((x: Error) => {
        if (alive) setErr(x.message);
      });
    return () => {
      alive = false;
    };
  }, [analyst]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-md md:items-center md:p-6"
      onClick={onClose}
    >
      {/* Modal is the scroll container, NOT the backdrop. Outer div
          stays viewport-pinned via `fixed inset-0`; the URL bar can
          shrink/grow underneath without ever stranding the close
          button above the visible area. `100dvh` honors the mobile
          dynamic-viewport so the modal resizes when Safari/Chrome
          show or hide their address bar. */}
      <div
        className="relative flex w-full max-w-4xl flex-col bg-bg-card shadow-2xl max-h-[100dvh] md:max-h-[90vh] md:rounded-2xl md:border md:border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header — always visible at the top of the modal
            regardless of scroll position. Solves the "X button
            disappears under the URL bar after scrolling on the
            second card" report. */}
        <div className="sticky top-0 z-30 flex items-center justify-end border-b border-border bg-bg-card/95 px-3 py-2.5 backdrop-blur">
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-lg text-fg ring-1 ring-white/10 hover:bg-black/80"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain">
          {err ? (
            <div className="p-8 text-center text-sm text-rose-300">
              Couldn't load trader: {err}
            </div>
          ) : !data ? (
            <div className="flex items-center justify-center p-20 text-sm text-fg-dim">
              Loading…
            </div>
          ) : (
            <DetailBody data={data} displayName={displayName} />
          )}
        </div>
      </div>
    </div>
  );
}

function DetailBody({
  data,
  displayName,
}: {
  data: TraderDetail;
  displayName: string;
}) {
  const positive = data.stats.virtual_return_pct >= 0;
  const returnTone = positive ? 'text-emerald-300' : 'text-rose-300';
  const pnlTone = data.stats.total_pnl >= 0 ? 'text-emerald-300' : 'text-rose-300';
  const winRate =
    data.stats.win_rate == null ? null : Math.round(data.stats.win_rate * 100);

  return (
    <>
      <header className="relative overflow-hidden border-b border-border px-6 pb-5 pt-7 md:px-8 md:pt-8">
        <div className="pointer-events-none absolute inset-0 -z-10 grid-pattern opacity-40" />
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div
            className={`absolute left-1/2 top-[-80px] h-[240px] w-[560px] -translate-x-1/2 rounded-full blur-[90px] ${
              positive ? 'bg-emerald-400/10' : 'bg-rose-400/10'
            }`}
          />
        </div>

        <div className="flex flex-wrap items-start gap-4">
          {data.trader.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.trader.image}
              alt=""
              className="h-14 w-14 rounded-full object-cover ring-2 ring-white/10"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-xl font-bold text-fg ring-2 ring-white/10">
              {displayName[0]?.toUpperCase() ?? '?'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="mono-label !text-fg-dim">Trader</div>
            <h2 className="mt-0.5 text-2xl font-extrabold tracking-tight md:text-3xl">
              {displayName}
            </h2>
            {data.trader.bio ? (
              <div className="mt-1 text-xs text-fg-dim">
                {truncate(data.trader.bio, 100)}
              </div>
            ) : null}
          </div>

          <div className="text-right">
            <div className="mono-label !text-fg-dim">Last 30 days</div>
            <div className={`stat-num mt-0.5 text-3xl font-extrabold md:text-4xl ${returnTone}`}>
              ${data.stats.virtual_balance_usd.toLocaleString('en-US', {
                maximumFractionDigits: 0,
              })}
            </div>
            <div className={`stat-num mt-0.5 text-xs font-semibold ${returnTone}`}>
              {positive ? '▲ +' : '▼ '}
              {data.stats.virtual_return_pct.toFixed(2)}% from $10,000
            </div>
            {data.all_time && data.all_time.trades > 0 ? (
              <div className="mt-2 text-[10px] text-fg-dim stat-num">
                All-time: ${data.all_time.virtual_balance_usd.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                {' · '}
                <span className={data.all_time.virtual_return_pct >= 0 ? 'text-emerald-400/80' : 'text-rose-400/80'}>
                  {data.all_time.virtual_return_pct >= 0 ? '+' : ''}
                  {data.all_time.virtual_return_pct.toFixed(2)}%
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="px-6 py-6 md:px-8">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi
            label="Trades"
            value={data.stats.trades.toString()}
            sub={`${data.stats.wins}W · ${data.stats.losses}L`}
          />
          <Kpi
            label="Win rate"
            value={winRate == null ? '—' : `${winRate}%`}
            tone={winRate != null && winRate >= 50 ? 'success' : 'neutral'}
          />
          <Kpi
            label="Total R"
            value={`${data.stats.total_r >= 0 ? '+' : ''}${data.stats.total_r.toFixed(2)}R`}
            tone={data.stats.total_r >= 0 ? 'success' : 'danger'}
          />
          <Kpi
            label="Total PnL"
            value={formatUsd(data.stats.total_pnl)}
            tone={data.stats.total_pnl >= 0 ? 'success' : 'danger'}
          />
        </div>

        <section className="mt-6 rounded-2xl border border-border bg-bg p-5">
          <div className="flex items-center justify-between">
            <div className="mono-label">Virtual balance · last 30 days</div>
            <span className={`stat-num text-xs font-semibold ${pnlTone}`}>
              {data.stats.total_pnl >= 0 ? '+' : ''}
              {formatUsd(data.stats.total_pnl)} net
            </span>
          </div>
          {data.equity_curve.length === 0 ? (
            <div className="mt-3 flex h-40 items-center justify-center text-xs text-fg-dim">
              No closed trades in the last 30 days.
            </div>
          ) : (
            <EquityChart curve={data.equity_curve} positive={positive} />
          )}
          <div className="mt-2 flex items-center justify-between text-[11px] text-fg-dim">
            <span>$10,000 starting balance · 30-day window</span>
            <span className="stat-num">
              Best {formatUsd(data.stats.best_trade_pnl)} · Worst{' '}
              {formatUsd(data.stats.worst_trade_pnl)}
            </span>
          </div>
        </section>

        {data.monthly.length > 0 ? (
          <section className="mt-4 rounded-2xl border border-border bg-bg p-5">
            <div className="mono-label">Monthly R</div>
            <MonthlyChart monthly={data.monthly} />
          </section>
        ) : null}

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <section className="rounded-2xl border border-border bg-bg p-5">
            <div className="mono-label">Long vs Short</div>
            <div className="mt-3 space-y-3">
              <SideBar
                label="Long"
                side={data.long_short.long}
                tone="emerald"
              />
              <SideBar
                label="Short"
                side={data.long_short.short}
                tone="rose"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-bg p-5">
            <div className="mono-label">Top coins by R</div>
            {data.coins.length === 0 ? (
              <div className="mt-3 text-xs text-fg-dim">No coin data.</div>
            ) : (
              <div className="mt-3 space-y-1.5">
                {data.coins.slice(0, 6).map((c) => (
                  <CoinRow key={c.coin} c={c} />
                ))}
              </div>
            )}
          </section>
        </div>

        {data.recent.length > 0 ? (
          <section className="mt-4 rounded-2xl border border-border bg-bg p-5">
            <div className="mono-label">Last {data.recent.length} trades</div>
            <div className="mt-3 space-y-1.5">
              {data.recent.map((t) => (
                <RecentRow key={t.id} t={t} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </>
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
  sub?: string;
  tone?: 'neutral' | 'success' | 'danger';
}) {
  const cls =
    tone === 'success'
      ? 'text-emerald-300'
      : tone === 'danger'
        ? 'text-rose-300'
        : 'text-fg';
  return (
    <div className="rounded-2xl border border-border bg-bg p-4">
      <div className="mono-label !text-fg-dim">{label}</div>
      <div className={`stat-num mt-1 text-xl font-bold md:text-2xl ${cls}`}>
        {value}
      </div>
      {sub ? <div className="mt-0.5 text-[11px] text-fg-muted">{sub}</div> : null}
    </div>
  );
}

function EquityChart({
  curve,
  positive,
}: {
  curve: TraderDetail['equity_curve'];
  positive: boolean;
}) {
  if (curve.length < 2) {
    return (
      <div className="mt-3 flex h-40 items-center justify-center text-xs text-fg-dim">
        Not enough data.
      </div>
    );
  }
  // Sort chronologically — the API doesn't guarantee ascending `t`,
  // and rendering in array order produced charts that ran backwards
  // (oldest balance on the right, newest on the left).
  const sorted = [...curve].sort((a, b) => a.t - b.t);
  const w = 1000;
  const h = 220;
  const pad = { l: 8, r: 8, t: 12, b: 12 };
  const minV = Math.min(10000, ...sorted.map((c) => c.balance));
  const maxV = Math.max(10000, ...sorted.map((c) => c.balance));
  const range = maxV - minV || 1;
  const xs = (i: number) =>
    pad.l + (i / (sorted.length - 1)) * (w - pad.l - pad.r);
  const ys = (v: number) =>
    pad.t + (h - pad.t - pad.b) * (1 - (v - minV) / range);
  const line = sorted
    .map((c, i) => `${i === 0 ? 'M' : 'L'}${xs(i).toFixed(1)},${ys(c.balance).toFixed(1)}`)
    .join(' ');
  const area = `${line} L${xs(sorted.length - 1).toFixed(1)},${(h - pad.b).toFixed(1)} L${xs(0).toFixed(1)},${(h - pad.b).toFixed(1)} Z`;
  const zeroY = ys(10000);
  const gradientId = `eq-grad-${positive ? 'up' : 'dn'}`;
  const strokeColor = positive ? '#2BC18B' : '#F87171';

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 h-40 w-full">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.30" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line
        x1={pad.l}
        x2={w - pad.r}
        y1={zeroY}
        y2={zeroY}
        stroke="rgba(255,255,255,0.15)"
        strokeDasharray="4 4"
      />
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke={strokeColor} strokeWidth="2.2" />
    </svg>
  );
}

function MonthlyChart({ monthly }: { monthly: TraderDetail['monthly'] }) {
  if (monthly.length === 0) return null;
  const absMax = Math.max(1, ...monthly.map((m) => Math.abs(m.net_r)));
  return (
    <div className="mt-3 flex items-end gap-1.5">
      {monthly.map((m) => {
        const h = Math.max(4, Math.abs(m.net_r / absMax) * 110);
        const positive = m.net_r >= 0;
        return (
          <div
            key={m.month}
            className="flex flex-1 flex-col items-center gap-1"
            title={`${m.month}: ${m.net_r >= 0 ? '+' : ''}${m.net_r.toFixed(2)}R · ${m.trades} trades`}
          >
            <div
              className={`w-full rounded-md ${
                positive ? 'bg-emerald-400/70' : 'bg-rose-400/70'
              }`}
              style={{ height: `${h}px` }}
            />
            <div className="text-[9px] text-fg-dim stat-num">
              {m.month.slice(2)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SideBar({
  label,
  side,
  tone,
}: {
  label: string;
  side: TraderDetail['long_short']['long'];
  tone: 'emerald' | 'rose';
}) {
  const winPct = side.trades > 0 ? (side.wins / side.trades) * 100 : 0;
  const toneCls =
    tone === 'emerald'
      ? 'bg-emerald-400/70'
      : 'bg-rose-400/70';
  const labelCls = tone === 'emerald' ? 'text-emerald-300' : 'text-rose-300';
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className={`font-semibold ${labelCls}`}>{label}</span>
        <span className="stat-num text-fg-muted">
          {side.trades} trades · {winPct.toFixed(0)}% WR
        </span>
      </div>
      <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-white/5">
        <div className={toneCls} style={{ width: `${winPct}%` }} />
      </div>
      <div className="mt-1 flex items-center justify-between font-mono text-[11px]">
        <span className={side.net_r >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
          {side.net_r >= 0 ? '+' : ''}
          {side.net_r.toFixed(2)}R
        </span>
        <span className={side.net_pnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
          {side.net_pnl >= 0 ? '+' : ''}
          {formatUsd(side.net_pnl)}
        </span>
      </div>
    </div>
  );
}

function CoinRow({ c }: { c: TraderDetail['coins'][0] }) {
  const rTone = c.net_r >= 0 ? 'text-emerald-300' : 'text-rose-300';
  return (
    <div className="flex items-center gap-3 rounded-lg bg-white/[0.02] px-3 py-2 font-mono text-[11px]">
      <span className="w-16 font-semibold text-fg">{c.coin.replace('USDT', '')}</span>
      <span className="text-fg-dim">{c.trades}t</span>
      <span className="text-fg-muted">{c.win_rate.toFixed(0)}% WR</span>
      <span className={`ml-auto ${rTone}`}>
        {c.net_r >= 0 ? '+' : ''}
        {c.net_r.toFixed(2)}R
      </span>
      <span className={`w-24 text-right ${rTone}`}>
        {c.net_pnl >= 0 ? '+' : ''}
        {formatUsd(c.net_pnl)}
      </span>
    </div>
  );
}

function RecentRow({ t }: { t: TraderDetail['recent'][0] }) {
  const posTone =
    t.position === 'long'
      ? 'text-emerald-300'
      : t.position === 'short'
        ? 'text-rose-300'
        : 'text-fg-dim';
  const pnlTone = t.pnl >= 0 ? 'text-emerald-300' : 'text-rose-300';
  const statusTone =
    t.status === 'success'
      ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/30'
      : 'bg-rose-400/10 text-rose-300 ring-rose-400/30';
  return (
    <div className="flex items-center gap-3 rounded-lg bg-white/[0.02] px-3 py-2 font-mono text-[11px]">
      <span className="w-16 font-semibold text-fg">{t.coin.replace('USDT', '')}</span>
      <span className={`w-10 ${posTone}`}>
        {t.position === 'long' ? '↑ L' : t.position === 'short' ? '↓ S' : '—'}
      </span>
      <span
        className={`rounded px-1.5 py-0.5 text-[9px] uppercase ring-1 ${statusTone}`}
      >
        {t.status}
      </span>
      <span className={`ml-auto w-16 text-right ${pnlTone}`}>
        {t.r >= 0 ? '+' : ''}
        {t.r.toFixed(2)}R
      </span>
      <span className={`w-24 text-right ${pnlTone}`}>
        {t.pnl >= 0 ? '+' : ''}
        {formatUsd(t.pnl)}
      </span>
      <span className="w-16 text-right text-fg-dim">
        {t.close_date
          ? new Date(t.close_date).toLocaleDateString('en-US', {
              day: 'numeric',
              month: 'short',
            })
          : '—'}
      </span>
    </div>
  );
}

function formatUsd(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) {
    return `${n < 0 ? '-' : ''}$${(abs / 1000).toFixed(2)}K`;
  }
  return `${n < 0 ? '-' : ''}$${abs.toFixed(2)}`;
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return `${s.slice(0, n - 1).trim()}…`;
}

