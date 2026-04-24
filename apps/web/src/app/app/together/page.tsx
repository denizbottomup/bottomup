'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';

interface TeamInfo {
  id: string | null;
  name: string | null;
  weekly_pnl: number | null;
  monthly_pnl: number | null;
  trader_count: number;
}

interface CopyTradeStats {
  total_realized: number;
  total_unrealized: number;
  active_count: number;
  closed_count: number;
  win_count: number;
  loss_count: number;
  roe_avg: number | null;
}

interface CopyTradeItem {
  id: string;
  setup_id: string | null;
  trader_id: string | null;
  trader_name: string | null;
  trader_image: string | null;
  coin_name: string | null;
  coin_image: string | null;
  position: 'long' | 'short' | null;
  category: 'spot' | 'futures' | null;
  state: string | null;
  realized_pnl: number | null;
  roe: number | null;
  pnl_percentage: number | null;
  position_size_usd: number | null;
  leverage: number | null;
  copied_at: string | null;
  activated_at: string | null;
  setup_status: string | null;
}

type Tab = 'active' | 'closed';

export default function TogetherPage() {
  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [stats, setStats] = useState<CopyTradeStats | null>(null);
  const [active, setActive] = useState<CopyTradeItem[] | null>(null);
  const [closed, setClosed] = useState<CopyTradeItem[] | null>(null);
  const [tab, setTab] = useState<Tab>('active');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      api<TeamInfo>('/copy_trade/team'),
      api<CopyTradeStats>('/copy_trade/team/stats'),
      api<{ items: CopyTradeItem[] }>('/copy_trade/setup?state=active&limit=100'),
      api<{ items: CopyTradeItem[] }>('/copy_trade/setup?state=closed&limit=100'),
    ])
      .then(([t, s, a, c]) => {
        if (!alive) return;
        setTeam(t);
        setStats(s);
        setActive(a.items);
        setClosed(c.items);
      })
      .catch((x) => {
        if (!alive) return;
        setErr(x instanceof ApiError ? `${x.status} ${x.message}` : (x as Error).message);
      });
    return () => {
      alive = false;
    };
  }, []);

  const items = tab === 'active' ? active : closed;
  const loading = team == null || stats == null || active == null || closed == null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <header className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-semibold text-fg">Kopya Trade</h1>
            <p className="mt-1 text-sm text-fg-muted">
              {team?.name ? `Takım: ${team.name}` : 'Takip ettiklerinin pozisyonlarını kopyala.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/app/together/team" className="text-xs text-fg-muted hover:text-fg">
              Takımı yönet
            </Link>
            <Link href="/app/analysts" className="text-xs text-brand hover:underline">
              Trader ekle →
            </Link>
          </div>
        </div>

        {stats ? (
          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
            <StatBox
              label="Açık PnL"
              value={formatUsd(stats.total_unrealized)}
              tone={stats.total_unrealized > 0 ? 'success' : stats.total_unrealized < 0 ? 'danger' : 'neutral'}
            />
            <StatBox
              label="Kapalı PnL"
              value={formatUsd(stats.total_realized)}
              tone={stats.total_realized > 0 ? 'success' : stats.total_realized < 0 ? 'danger' : 'neutral'}
            />
            <StatBox label="Açık" value={stats.active_count} />
            <StatBox label="Kapalı" value={stats.closed_count} />
            <StatBox
              label="Kazanç oranı"
              value={
                stats.win_count + stats.loss_count > 0
                  ? `${Math.round((stats.win_count / (stats.win_count + stats.loss_count)) * 100)}%`
                  : '—'
              }
              tone={stats.win_count >= stats.loss_count ? 'success' : 'danger'}
            />
            <StatBox
              label="Ort. ROE"
              value={stats.roe_avg != null ? `${stats.roe_avg.toFixed(1)}%` : '—'}
              tone={stats.roe_avg != null && stats.roe_avg > 0 ? 'success' : stats.roe_avg != null && stats.roe_avg < 0 ? 'danger' : 'neutral'}
            />
          </div>
        ) : null}
      </header>

      <div className="mt-5 flex items-center gap-2">
        <Tab active={tab === 'active'} onClick={() => setTab('active')} label="Açık" count={active?.length ?? null} />
        <Tab active={tab === 'closed'} onClick={() => setTab('closed')} label="Kapanmış" count={closed?.length ?? null} />
      </div>

      <div className="mt-3">
        {err ? (
          <EmptyState title="Yüklenemedi" hint={err} />
        ) : loading ? (
          <SkeletonList />
        ) : items && items.length > 0 ? (
          <div className="flex flex-col gap-2">
            {items.map((i) => (
              <CopyTradeRow key={i.id} i={i} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={tab === 'active' ? 'Açık kopya pozisyon yok' : 'Henüz kapanmış kopya yok'}
            hint="Analistler sekmesinden bir trader'ın setup'larını kopyalamaya başlayabilirsin."
          />
        )}
      </div>
    </div>
  );
}

function CopyTradeRow({ i }: { i: CopyTradeItem }) {
  const pnl = i.realized_pnl;
  const pnlTone = pnl != null && pnl > 0 ? 'text-emerald-300' : pnl != null && pnl < 0 ? 'text-rose-300' : 'text-fg';
  const state = i.state ?? '—';
  const stateLabel = stateLabelMap[state] ?? state;
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
      {/* Coin */}
      <CoinGlyph src={i.coin_image} code={(i.coin_name ?? '—').toUpperCase()} />
      {/* Middle */}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-semibold text-fg">
            {(i.coin_name ?? '—').toUpperCase()}
          </span>
          <DirectionPill position={i.position} />
          <StatePill state={state} label={stateLabel} />
          {i.leverage ? (
            <span className="rounded-md bg-brand/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand ring-1 ring-brand/30">
              {i.leverage}x
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 truncate text-[11px] text-fg-dim">
          {i.trader_name ? (
            <Link href={`/app/trader/${i.trader_id}`} className="hover:text-fg">
              {i.trader_name}
            </Link>
          ) : (
            'Trader'
          )}
          {' · '}
          {formatAgo(i.copied_at)}
          {i.position_size_usd ? ` · ${formatUsd(i.position_size_usd)} boyut` : ''}
        </div>
      </div>
      <div className={`text-right font-mono text-sm ${pnlTone}`}>
        {pnl != null ? (pnl > 0 ? '+' : '') + formatUsd(pnl) : '—'}
        {i.roe != null ? (
          <div className={`text-[10px] ${pnlTone}`}>
            ROE {i.roe > 0 ? '+' : ''}{i.roe.toFixed(2)}%
          </div>
        ) : null}
      </div>
      {i.setup_id ? (
        <Link
          href={`/app/setup/${i.setup_id}`}
          className="rounded-md bg-white/5 px-2 py-1 text-[11px] text-fg-muted ring-1 ring-white/10 transition hover:text-fg"
        >
          Setup →
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}

const stateLabelMap: Record<string, string> = {
  active: 'Açık',
  opened: 'Açık',
  partial: 'Kısmi',
  closed: 'Kapandı',
  stopped: 'Stop',
  success: 'Başarılı',
  failed: 'Başarısız',
};

function DirectionPill({ position }: { position: 'long' | 'short' | null }) {
  if (!position) return null;
  const long = position === 'long';
  return (
    <span
      className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${
        long
          ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/30'
          : 'bg-rose-400/10 text-rose-300 ring-rose-400/30'
      }`}
    >
      {long ? 'Long' : 'Short'}
    </span>
  );
}

function StatePill({ state, label }: { state: string; label: string }) {
  const tone =
    state === 'active' || state === 'opened' || state === 'partial'
      ? 'bg-blue-400/10 text-blue-300 ring-blue-400/30'
      : state === 'success'
        ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/30'
        : state === 'stopped' || state === 'failed'
          ? 'bg-rose-400/10 text-rose-300 ring-rose-400/30'
          : 'bg-white/5 text-fg-muted ring-white/10';
  return (
    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${tone}`}>
      {label}
    </span>
  );
}

function CoinGlyph({ src, code }: { src: string | null; code: string }) {
  const initial = code.slice(0, 3) || '?';
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="h-8 w-8 rounded-full object-cover ring-1 ring-white/10" />
  ) : (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 font-mono text-[10px] font-bold text-fg-muted">
      {initial}
    </div>
  );
}

function StatBox({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  tone?: 'neutral' | 'success' | 'danger';
}) {
  const toneClass = tone === 'success' ? 'text-emerald-300' : tone === 'danger' ? 'text-rose-300' : 'text-fg';
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-fg-dim">{label}</div>
      <div className={`mt-0.5 font-mono text-sm ${toneClass}`}>{value}</div>
    </div>
  );
}

function Tab({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number | null }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
        active ? 'bg-white/5 text-fg ring-1 ring-white/10' : 'text-fg-muted hover:text-fg'
      }`}
    >
      <span>{label}</span>
      {count != null ? (
        <span
          className={`ml-2 rounded-md px-1.5 py-0.5 font-mono text-[10px] ring-1 ${
            active ? 'bg-brand/15 text-brand ring-brand/30' : 'bg-white/5 text-fg-dim ring-white/10'
          }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

function SkeletonList() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-xl border border-white/5 bg-white/[0.02]" />
      ))}
    </div>
  );
}

function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
      <div className="text-base font-medium text-fg">{title}</div>
      {hint ? <div className="mt-1 text-sm text-fg-muted">{hint}</div> : null}
    </div>
  );
}

function formatUsd(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  const digits = abs >= 1000 ? 0 : 2;
  return `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: digits })}`;
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
