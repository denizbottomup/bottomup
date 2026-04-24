'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { TradingViewChart } from '@/components/tradingview-chart';

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

interface LatestSetupRow {
  id: string;
  coin_name: string;
  status: string;
  position: string | null;
  trader_name: string | null;
}

interface HotCoin {
  code: string;
  name: string | null;
  active_setups: number;
  new_setups_24h: number;
}

export default function AppHome() {
  const [hot, setHot] = useState<HotCoin[] | null>(null);
  const [latest, setLatest] = useState<LatestSetupRow[] | null>(null);
  const [leader, setLeader] = useState<LeaderboardRow | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      api<{ items: HotCoin[] }>('/analytic/hot-coins?limit=6').catch(() => ({ items: [] })),
      api<{ items: LatestSetupRow[] }>('/analytic/futures-latest-setup?limit=5').catch(() => ({
        items: [],
      })),
      api<{ items: LeaderboardRow[] }>('/analytic/futures-leaderboard?limit=1').catch(() => ({
        items: [],
      })),
    ]).then(([h, l, ld]) => {
      if (!alive) return;
      setHot(h.items);
      setLatest(l.items);
      setLeader(ld.items[0] ?? null);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="flex h-full w-full flex-col">
      <div className="min-h-0 flex-1">
        <TradingViewChart symbol="BINANCE:BTCUSDT" interval="60" />
      </div>
      <section className="shrink-0 border-t border-white/10 bg-bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-6 py-2 text-xs">
          <MetricsBlock label="Sıcak coinler">
            {hot && hot.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {hot.map((c) => (
                  <Link
                    key={c.code}
                    href={`/app/coin/${c.code}`}
                    className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 font-mono text-[11px] text-fg-muted ring-1 ring-white/10 transition hover:text-fg"
                    title={`${c.active_setups} aktif · +${c.new_setups_24h} bugün`}
                  >
                    {c.code}
                    <span className="text-emerald-300">+{c.new_setups_24h}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <Placeholder />
            )}
          </MetricsBlock>

          <div className="hidden h-6 w-px bg-white/10 md:block" />

          <MetricsBlock label="Son emirler">
            {latest && latest.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {latest.map((s) => (
                  <Link
                    key={s.id}
                    href={`/app/setup/${s.id}`}
                    className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-fg-muted ring-1 ring-white/10 transition hover:text-fg"
                  >
                    <span
                      className={
                        s.position === 'long'
                          ? 'text-emerald-300'
                          : s.position === 'short'
                            ? 'text-rose-300'
                            : 'text-fg-dim'
                      }
                    >
                      {s.position === 'long' ? '↑' : s.position === 'short' ? '↓' : '·'}
                    </span>
                    <span className="font-mono">{s.coin_name}</span>
                    <span className="text-fg-dim">· {s.trader_name ?? '—'}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <Placeholder />
            )}
          </MetricsBlock>

          <div className="hidden h-6 w-px bg-white/10 md:block" />

          <MetricsBlock label="Ayın traderı">
            {leader ? (
              <Link
                href={`/app/trader/${leader.trader_id}`}
                className="flex items-center gap-2 rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-fg-muted ring-1 ring-white/10 transition hover:text-fg"
              >
                {leader.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={leader.image} alt="" className="h-4 w-4 rounded-full object-cover" />
                ) : null}
                <span>{displayName(leader)}</span>
                {leader.monthly_roi != null ? (
                  <span className="text-emerald-300">
                    +{leader.monthly_roi.toFixed(1)}%
                  </span>
                ) : null}
              </Link>
            ) : (
              <Placeholder />
            )}
          </MetricsBlock>

          <div className="ml-auto flex items-center gap-2">
            <Link href="/app/feed" className="text-brand hover:underline">
              Akış →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricsBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] uppercase tracking-wider text-fg-dim">{label}</span>
      {children}
    </div>
  );
}

function Placeholder() {
  return <span className="text-fg-dim">—</span>;
}

function displayName(l: LeaderboardRow): string {
  return (
    l.name ||
    [l.first_name, l.last_name].filter(Boolean).join(' ').trim() ||
    'Trader'
  );
}
