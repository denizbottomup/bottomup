'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import { useTicker } from '@/lib/ticker';

interface LeaderboardRow {
  trader_id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  image: string | null;
  monthly_pnl: number | null;
  monthly_roi: number | null;
  win_rate: number | null;
  followers: number;
}

interface LatestSetup {
  id: string;
  coin_name: string;
  status: string;
  position: string | null;
  trader_id: string | null;
  trader_name: string | null;
  trader_image: string | null;
  coin_image: string | null;
  entry_value: number;
  stop_value: number | null;
  profit_taking_1: number | null;
  r_value: number | null;
  last_acted_at: string | null;
}

interface HotCoin {
  code: string;
  name: string | null;
  image: string | null;
  active_setups: number;
  new_setups_24h: number;
}

type Market = 'futures' | 'spot';
type Period = 'monthly' | 'alltime';

export default function AnalyticsPage() {
  const [market, setMarket] = useState<Market>('futures');
  const [period, setPeriod] = useState<Period>('monthly');
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[] | null>(null);
  const [latest, setLatest] = useState<LatestSetup[] | null>(null);
  const [hot, setHot] = useState<HotCoin[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setErr(null);
    setLeaderboard(null);
    setLatest(null);
    const lbPath =
      market === 'futures'
        ? period === 'alltime'
          ? 'futures-leaderboard-aggregated'
          : 'futures-leaderboard'
        : 'spot-leaderboard';
    const lsPath = market === 'futures' ? 'futures-latest-setup' : 'spot-latest-setup';
    Promise.all([
      api<{ items: LeaderboardRow[] }>(`/analytic/${lbPath}?limit=20`),
      api<{ items: LatestSetup[] }>(`/analytic/${lsPath}?limit=15`),
      hot == null ? api<{ items: HotCoin[] }>('/analytic/hot-coins?limit=12') : Promise.resolve({ items: hot }),
    ])
      .then(([lb, ls, hc]) => {
        if (!alive) return;
        setLeaderboard(lb.items);
        setLatest(ls.items);
        if (hot == null) setHot(hc.items);
      })
      .catch((x) => {
        if (!alive) return;
        setErr(x instanceof ApiError ? `${x.status} ${x.message}` : (x as Error).message);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market, period]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold text-fg">Analitik</h1>
        <div className="flex items-center gap-2">
          {market === 'futures' ? (
            <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1 ring-1 ring-white/10">
              <MarketBtn
                active={period === 'monthly'}
                onClick={() => setPeriod('monthly')}
                label="Aylık"
              />
              <MarketBtn
                active={period === 'alltime'}
                onClick={() => setPeriod('alltime')}
                label="Tüm zamanlar"
              />
            </div>
          ) : null}
          <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1 ring-1 ring-white/10">
            <MarketBtn active={market === 'futures'} onClick={() => setMarket('futures')} label="Futures" />
            <MarketBtn active={market === 'spot'} onClick={() => setMarket('spot')} label="Spot" />
          </div>
        </div>
      </div>

      {err ? <p className="mt-3 text-xs text-rose-300">{err}</p> : null}

      <section className="mt-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Hot Coin</h2>
        {hot == null ? (
          <HotCoinSkeleton />
        ) : (
          <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
            {hot.map((c) => (
              <HotCoinCard key={c.code} c={c} />
            ))}
          </div>
        )}
      </section>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.1fr]">
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
            {market === 'futures' ? 'Futures' : 'Spot'} Liderleri
          </h2>
          <div className="mt-2">
            {leaderboard == null ? (
              <SkeletonList rows={10} h={14} />
            ) : leaderboard.length === 0 ? (
              <Empty title="Henüz sıralama yok" />
            ) : (
              <ol className="flex flex-col gap-1">
                {leaderboard.map((r, i) => (
                  <LeaderboardRowView key={r.trader_id} r={r} rank={i + 1} />
                ))}
              </ol>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
            Son {market === 'futures' ? 'Futures' : 'Spot'} Setupları
          </h2>
          <div className="mt-2">
            {latest == null ? (
              <SkeletonList rows={8} h={12} />
            ) : latest.length === 0 ? (
              <Empty title="Setup yok" />
            ) : (
              <ol className="flex flex-col gap-1">
                {latest.map((s) => (
                  <LatestSetupRow key={s.id} s={s} />
                ))}
              </ol>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function MarketBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
        active ? 'bg-white/10 text-fg' : 'text-fg-muted hover:text-fg'
      }`}
    >
      {label}
    </button>
  );
}

function HotCoinCard({ c }: { c: HotCoin }) {
  const ticker = useTicker(c.code);
  return (
    <Link
      href={`/app/coin/${encodeURIComponent(c.code)}`}
      className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 transition hover:border-white/20"
    >
      <CoinGlyph src={c.image} code={c.code} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-mono text-sm font-semibold text-fg">{c.code.toUpperCase()}</div>
        <div className="text-[10px] text-fg-dim">
          {c.active_setups} aktif · {c.new_setups_24h} yeni
        </div>
      </div>
      {ticker ? (
        <div className={`text-right font-mono text-[11px] ${ticker.color === 'g' ? 'text-emerald-300' : 'text-rose-300'}`}>
          <div>{formatNum(Number(ticker.close))}</div>
          <div className="text-[9px]">{(Number(ticker.change) >= 0 ? '+' : '') + Number(ticker.change).toFixed(2)}%</div>
        </div>
      ) : null}
    </Link>
  );
}

function LeaderboardRowView({ r, rank }: { r: LeaderboardRow; rank: number }) {
  const name =
    r.name || [r.first_name, r.last_name].filter(Boolean).join(' ').trim() || 'Trader';
  const pnl = r.monthly_pnl;
  const pnlTone = pnl != null && pnl > 0 ? 'text-emerald-300' : pnl != null && pnl < 0 ? 'text-rose-300' : 'text-fg';
  return (
    <li>
      <Link
        href={`/app/trader/${r.trader_id}`}
        className="grid grid-cols-[24px_auto_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 transition hover:border-white/20"
      >
        <span className="font-mono text-xs text-fg-dim">{rank}.</span>
        <Avatar src={r.image} fallback={(name[0] ?? '?').toUpperCase()} />
        <span className="truncate text-sm font-medium text-fg">{name}</span>
        <span className={`font-mono text-sm ${pnlTone}`}>
          {pnl != null ? (pnl > 0 ? '+' : '') + formatUsd(pnl) : '—'}
        </span>
        <span className="text-[11px] text-fg-dim">
          {r.win_rate != null ? `${Math.round(r.win_rate * 100)}%` : '—'} kazanç
        </span>
      </Link>
    </li>
  );
}

function LatestSetupRow({ s }: { s: LatestSetup }) {
  const isLong = s.position === 'long';
  const isShort = s.position === 'short';
  return (
    <li>
      <Link
        href={`/app/setup/${s.id}`}
        className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 transition hover:border-white/20"
      >
        <CoinGlyph src={s.coin_image} code={s.coin_name} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-fg">{s.coin_name.toUpperCase()}</span>
            {s.position ? (
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${
                  isLong
                    ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/30'
                    : isShort
                      ? 'bg-rose-400/10 text-rose-300 ring-rose-400/30'
                      : 'bg-white/5 text-fg-muted ring-white/10'
                }`}
              >
                {s.position}
              </span>
            ) : null}
          </div>
          <div className="truncate text-[11px] text-fg-dim">
            {s.trader_name ?? 'Trader'} · {formatAgo(s.last_acted_at)}
          </div>
        </div>
        <div className="text-right font-mono text-[11px] text-fg-muted">
          {s.r_value != null ? `R ${s.r_value.toFixed(1)}` : ''}
        </div>
        <span className="text-fg-dim">→</span>
      </Link>
    </li>
  );
}

function Avatar({ src, fallback }: { src: string | null; fallback: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="h-7 w-7 rounded-full object-cover ring-1 ring-white/10" />
  ) : (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-[11px] font-semibold text-fg ring-1 ring-white/10">
      {fallback}
    </div>
  );
}

function CoinGlyph({ src, code }: { src: string | null; code: string }) {
  const initial = code.slice(0, 3).toUpperCase();
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="h-7 w-7 rounded-full object-cover ring-1 ring-white/10" />
  ) : (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 font-mono text-[9px] font-bold text-fg-muted">
      {initial}
    </div>
  );
}

function HotCoinSkeleton() {
  return (
    <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl border border-white/5 bg-white/[0.02]" />
      ))}
    </div>
  );
}

function SkeletonList({ rows, h }: { rows: number; h: number }) {
  return (
    <div className="flex flex-col gap-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`h-${h} animate-pulse rounded-xl border border-white/5 bg-white/[0.02]`} style={{ height: h * 4 }} />
      ))}
    </div>
  );
}

function Empty({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center text-sm text-fg-muted">
      {title}
    </div>
  );
}

function formatUsd(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  const digits = abs >= 1000 ? 0 : 2;
  return `$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: digits })}`;
}

function formatNum(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  const digits = abs >= 1000 ? 2 : abs >= 1 ? 4 : 6;
  return n.toLocaleString('en-US', { maximumFractionDigits: digits });
}

function formatAgo(iso: string | null): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const diffS = Math.max(1, Math.round((Date.now() - t) / 1000));
  if (diffS < 60) return `${diffS}s`;
  const m = Math.round(diffS / 60);
  if (m < 60) return `${m}dk`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}sa`;
  const d = Math.round(h / 24);
  return `${d}g`;
}
