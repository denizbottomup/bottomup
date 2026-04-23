'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import { SetupRow } from '@/components/setup-row';
import type { SetupCard } from '@/components/setup-card';

interface TraderProfile {
  id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  image: string | null;
  cover_image: string | null;
  content: string | null;
  instagram: string | null;
  telegram: string | null;
  twitter: string | null;
  is_trader: boolean;
  is_trending: boolean;
  monthly_roi: string | null;
  rate: number | null;
  rank_score: number | null;
  stats: {
    followers: number;
    active_setups: number;
    closed_setups: number;
    total_claps: number;
    pnl_total: number | null;
    pnl_avg_rate: number | null;
    win_rate: number | null;
  };
  viewer: {
    is_following: boolean;
    is_blocked: boolean;
    notify_enabled: boolean;
    is_self: boolean;
  };
}

interface TraderSetupRaw {
  id: string;
  status: SetupCard['status'];
  category: SetupCard['category'];
  position: SetupCard['position'];
  order_type: string;
  coin_name: string;
  entry_value: number;
  entry_value_end: number | null;
  stop_value: number | null;
  profit_taking_1: number | null;
  profit_taking_2: number | null;
  profit_taking_3: number | null;
  r_value: number | null;
  is_tp1: boolean | null;
  is_tp2: boolean | null;
  is_tp3: boolean | null;
  coin_image: string | null;
  coin_display_name: string | null;
}

type Tab = 'active' | 'closed';

export default function TraderProfilePage() {
  const params = useParams<{ traderId: string }>();
  const traderId = params?.traderId;

  const [profile, setProfile] = useState<TraderProfile | null>(null);
  const [setups, setSetups] = useState<SetupCard[] | null>(null);
  const [tab, setTab] = useState<Tab>('active');
  const [err, setErr] = useState<string | null>(null);
  const [followPending, setFollowPending] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!traderId) return;
    setErr(null);
    try {
      const p = await api<TraderProfile>(`/trader/${traderId}`);
      setProfile(p);
    } catch (x) {
      const msg = x instanceof ApiError ? `${x.status} ${x.message}` : (x as Error).message;
      setErr(msg);
    }
  }, [traderId]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (!traderId) return;
    let alive = true;
    setSetups(null);
    const statusParam = tab === 'active' ? 'active,incoming' : 'success,closed,stopped';
    api<{ items: TraderSetupRaw[] }>(`/trader/${traderId}/setups?status=${statusParam}&limit=60`)
      .then((r) => {
        if (!alive) return;
        setSetups(r.items.map((s) => toCard(s, profile)));
      })
      .catch((x) => {
        if (!alive) return;
        const msg = x instanceof ApiError ? `${x.status} ${x.message}` : (x as Error).message;
        setErr(msg);
      });
    return () => {
      alive = false;
    };
  }, [traderId, tab, profile]);

  const onToggleFollow = useCallback(async () => {
    if (!profile || profile.viewer.is_self) return;
    setFollowPending(true);
    try {
      await api<{ ok: true }>(`/user/traders/${profile.id}`, {
        method: profile.viewer.is_following ? 'DELETE' : 'PUT',
      });
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              viewer: { ...prev.viewer, is_following: !prev.viewer.is_following },
              stats: {
                ...prev.stats,
                followers: prev.stats.followers + (prev.viewer.is_following ? -1 : 1),
              },
            }
          : prev,
      );
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setFollowPending(false);
    }
  }, [profile]);

  if (err) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-6">
        <p className="text-sm text-rose-300">Profil yüklenemedi: {err}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-6">
        <div className="h-40 animate-pulse rounded-2xl bg-white/[0.02]" />
      </div>
    );
  }

  const traderName =
    profile.name ||
    [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() ||
    'Trader';

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <Link
        href="/app/feed"
        className="mb-4 inline-flex items-center gap-1 text-xs text-fg-muted transition hover:text-fg"
      >
        ← Akış
      </Link>

      <header className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent">
        <div
          className="h-32 w-full"
          style={
            profile.cover_image
              ? {
                  backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(11,13,16,0.9) 100%), url(${profile.cover_image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : { backgroundImage: 'linear-gradient(135deg, rgba(255,107,26,0.12), rgba(96,165,250,0.08))' }
          }
        />
        <div className="-mt-10 flex flex-col items-start gap-4 px-5 pb-5 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-4">
            <Avatar src={profile.image} fallback={traderName[0]?.toUpperCase() ?? '?'} />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-fg">{traderName}</h1>
                {profile.is_trending ? (
                  <span className="rounded-md bg-brand/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand ring-1 ring-brand/30">
                    Öne çıkan
                  </span>
                ) : null}
              </div>
              {profile.content ? (
                <p className="mt-1 max-w-xl text-sm text-fg-muted">{profile.content}</p>
              ) : null}
              <SocialLinks p={profile} />
            </div>
          </div>

          {!profile.viewer.is_self ? (
            <button
              onClick={() => void onToggleFollow()}
              disabled={followPending}
              className={`rounded-lg px-4 py-2 text-sm font-medium ring-1 transition ${
                profile.viewer.is_following
                  ? 'bg-white/5 text-fg-muted ring-white/10 hover:bg-white/10'
                  : 'bg-brand text-white ring-brand hover:bg-brand-dark'
              } disabled:opacity-60`}
            >
              {followPending
                ? '…'
                : profile.viewer.is_following
                  ? 'Takiptesin'
                  : 'Takip et'}
            </button>
          ) : null}
        </div>
      </header>

      <StatsRow stats={profile.stats} monthlyRoi={profile.monthly_roi} />

      <div className="mt-6 flex items-center gap-2">
        <TabButton active={tab === 'active'} onClick={() => setTab('active')} label="Açık + Fırsat" count={profile.stats.active_setups} />
        <TabButton active={tab === 'closed'} onClick={() => setTab('closed')} label="Kapanmış" count={profile.stats.closed_setups} />
      </div>

      <div className="mt-3">
        {setups == null ? (
          <SkeletonList />
        ) : setups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center text-sm text-fg-muted">
            Bu sekmede setup yok.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {setups.map((s) => (
              <SetupRow key={s.id} setup={s} pulseKey={0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function toCard(raw: TraderSetupRaw, profile: TraderProfile | null): SetupCard {
  return {
    id: raw.id,
    status: raw.status,
    category: raw.category,
    position: raw.position,
    order_type: raw.order_type,
    coin_name: raw.coin_name,
    entry_value: raw.entry_value,
    entry_value_end: raw.entry_value_end,
    stop_value: raw.stop_value,
    profit_taking_1: raw.profit_taking_1,
    profit_taking_2: raw.profit_taking_2,
    profit_taking_3: raw.profit_taking_3,
    r_value: raw.r_value,
    is_tp1: raw.is_tp1,
    is_tp2: raw.is_tp2,
    is_tp3: raw.is_tp3,
    trader: {
      id: profile?.id ?? '',
      name: profile?.name ?? null,
      first_name: profile?.first_name ?? null,
      last_name: profile?.last_name ?? null,
      image: profile?.image ?? null,
    },
    coin: {
      code: raw.coin_name,
      display_name: raw.coin_display_name,
      image: raw.coin_image,
    },
  };
}

function Avatar({ src, fallback }: { src: string | null; fallback: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className="h-20 w-20 rounded-full border-4 border-bg object-cover ring-1 ring-white/10"
    />
  ) : (
    <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-bg bg-white/5 text-2xl font-semibold text-fg ring-1 ring-white/10">
      {fallback}
    </div>
  );
}

function SocialLinks({ p }: { p: TraderProfile }) {
  const any = p.instagram || p.telegram || p.twitter;
  if (!any) return null;
  return (
    <div className="mt-2 flex items-center gap-3 text-[11px] text-fg-dim">
      {p.twitter ? (
        <a href={`https://x.com/${stripAt(p.twitter)}`} target="_blank" rel="noreferrer" className="hover:text-fg">
          @{stripAt(p.twitter)} · X
        </a>
      ) : null}
      {p.telegram ? (
        <a href={`https://t.me/${stripAt(p.telegram)}`} target="_blank" rel="noreferrer" className="hover:text-fg">
          @{stripAt(p.telegram)} · Telegram
        </a>
      ) : null}
      {p.instagram ? (
        <a href={`https://instagram.com/${stripAt(p.instagram)}`} target="_blank" rel="noreferrer" className="hover:text-fg">
          @{stripAt(p.instagram)} · Instagram
        </a>
      ) : null}
    </div>
  );
}

function StatsRow({ stats, monthlyRoi }: { stats: TraderProfile['stats']; monthlyRoi: string | null }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6">
      <Stat label="Takipçi" value={stats.followers.toLocaleString('tr-TR')} />
      <Stat label="Aktif" value={stats.active_setups} />
      <Stat label="Kapanmış" value={stats.closed_setups} />
      <Stat
        label="Kazanma"
        value={stats.win_rate != null ? `${Math.round(stats.win_rate * 100)}%` : '—'}
        tone={stats.win_rate != null && stats.win_rate >= 0.55 ? 'success' : 'neutral'}
      />
      <Stat
        label="Ort. PnL"
        value={stats.pnl_avg_rate != null ? `${stats.pnl_avg_rate.toFixed(1)}%` : '—'}
        tone={stats.pnl_avg_rate != null && stats.pnl_avg_rate > 0 ? 'success' : stats.pnl_avg_rate != null && stats.pnl_avg_rate < 0 ? 'danger' : 'neutral'}
      />
      <Stat label="Aylık ROI" value={monthlyRoi ?? '—'} />
    </div>
  );
}

function Stat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  tone?: 'neutral' | 'success' | 'danger';
}) {
  const toneClass =
    tone === 'success' ? 'text-emerald-300' : tone === 'danger' ? 'text-rose-300' : 'text-fg';
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-fg-dim">{label}</div>
      <div className={`mt-0.5 font-mono text-sm ${toneClass}`}>{value}</div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
        active ? 'bg-white/5 text-fg ring-1 ring-white/10' : 'text-fg-muted hover:text-fg'
      }`}
    >
      <span>{label}</span>
      <span
        className={`ml-2 rounded-md px-1.5 py-0.5 font-mono text-[10px] ring-1 ${
          active ? 'bg-brand/15 text-brand ring-brand/30' : 'bg-white/5 text-fg-dim ring-white/10'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function SkeletonList() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-xl border border-white/5 bg-white/[0.02]" />
      ))}
    </div>
  );
}

function stripAt(s: string): string {
  return s.trim().replace(/^@+/, '');
}
