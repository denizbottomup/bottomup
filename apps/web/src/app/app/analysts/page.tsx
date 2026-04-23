'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';

interface TraderCard {
  id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  image: string | null;
  cover_image: string | null;
  content: string | null;
  is_trending: boolean;
  monthly_roi: string | null;
  followers: number;
  active_setups: number;
  viewer_following: boolean;
}

type Sort = 'trending' | 'followers' | 'new';
type Tab = 'all' | 'following';

export default function AnalystsPage() {
  const [items, setItems] = useState<TraderCard[] | null>(null);
  const [sort, setSort] = useState<Sort>('trending');
  const [tab, setTab] = useState<Tab>('all');
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setErr(null);
    try {
      const r = await api<{ items: TraderCard[] }>(
        `/traders?sort=${sort}&limit=60&only_followed=${tab === 'following'}`,
      );
      setItems(r.items);
    } catch (x) {
      const msg = x instanceof ApiError ? `${x.status} ${x.message}` : (x as Error).message;
      setErr(msg);
    }
  }, [sort, tab]);

  useEffect(() => {
    setItems(null);
    void load();
  }, [load]);

  const toggleFollow = useCallback(async (t: TraderCard) => {
    setPending((p) => ({ ...p, [t.id]: true }));
    try {
      await api<{ ok: true }>(`/user/traders/${t.id}`, {
        method: t.viewer_following ? 'DELETE' : 'PUT',
      });
      setItems((prev) =>
        prev
          ? prev.map((x) =>
              x.id === t.id
                ? {
                    ...x,
                    viewer_following: !x.viewer_following,
                    followers: x.followers + (x.viewer_following ? -1 : 1),
                  }
                : x,
            )
          : prev,
      );
    } catch {
      /* silent */
    } finally {
      setPending((p) => ({ ...p, [t.id]: false }));
    }
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-base font-semibold text-fg">Analistler</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1 ring-1 ring-white/10">
            <SortButton active={sort === 'trending'} onClick={() => setSort('trending')} label="Trend" />
            <SortButton active={sort === 'followers'} onClick={() => setSort('followers')} label="Popüler" />
            <SortButton active={sort === 'new'} onClick={() => setSort('new')} label="Yeni" />
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1 ring-1 ring-white/10">
            <SortButton active={tab === 'all'} onClick={() => setTab('all')} label="Tümü" />
            <SortButton active={tab === 'following'} onClick={() => setTab('following')} label="Takiptekiler" />
          </div>
        </div>
      </div>

      <div className="mt-5">
        {err ? (
          <EmptyState title="Yüklenemedi" hint={err} />
        ) : items == null ? (
          <SkeletonGrid />
        ) : items.length === 0 ? (
          <EmptyState
            title={tab === 'following' ? 'Henüz kimseyi takip etmiyorsun' : 'Analist bulunamadı'}
            hint={tab === 'following' ? 'Tümü sekmesinden başlayabilirsin.' : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((t) => (
              <TraderCardView
                key={t.id}
                t={t}
                pending={!!pending[t.id]}
                onToggle={() => void toggleFollow(t)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TraderCardView({
  t,
  pending,
  onToggle,
}: {
  t: TraderCard;
  pending: boolean;
  onToggle: () => void;
}) {
  const name =
    t.name || [t.first_name, t.last_name].filter(Boolean).join(' ').trim() || 'Trader';
  return (
    <div className="group overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent">
      <Link href={`/app/trader/${t.id}`} className="block">
        <div
          className="h-20 w-full"
          style={
            t.cover_image
              ? {
                  backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(11,13,16,0.85) 100%), url(${t.cover_image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : {
                  backgroundImage:
                    'linear-gradient(135deg, rgba(255,107,26,0.12), rgba(96,165,250,0.08))',
                }
          }
        />
      </Link>
      <div className="-mt-8 px-4 pb-4">
        <div className="flex items-end gap-3">
          <Link href={`/app/trader/${t.id}`}>
            {t.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={t.image}
                alt=""
                className="h-14 w-14 rounded-full border-4 border-bg object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-bg bg-white/5 text-base font-semibold text-fg ring-1 ring-white/10">
                {name[0]?.toUpperCase() ?? '?'}
              </div>
            )}
          </Link>
          <div className="min-w-0 flex-1 pb-1">
            <Link href={`/app/trader/${t.id}`} className="block">
              <div className="flex items-center gap-1.5">
                <div className="truncate font-medium text-fg">{name}</div>
                {t.is_trending ? (
                  <span className="rounded-md bg-brand/15 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand ring-1 ring-brand/30">
                    Trend
                  </span>
                ) : null}
              </div>
              {t.content ? (
                <div className="mt-0.5 truncate text-[11px] text-fg-dim">{t.content}</div>
              ) : null}
            </Link>
          </div>
          <button
            onClick={onToggle}
            disabled={pending}
            className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium ring-1 transition ${
              t.viewer_following
                ? 'bg-white/5 text-fg-muted ring-white/10 hover:bg-white/10'
                : 'bg-brand text-white ring-brand hover:bg-brand-dark'
            } disabled:opacity-60`}
          >
            {t.viewer_following ? 'Takipte' : 'Takip et'}
          </button>
        </div>

        <div className="mt-3 flex items-center gap-3 text-[11px] text-fg-muted">
          <span>
            <span className="font-mono text-fg">{t.followers.toLocaleString('tr-TR')}</span> takipçi
          </span>
          <span>·</span>
          <span>
            <span className="font-mono text-fg">{t.active_setups}</span> aktif
          </span>
          {t.monthly_roi ? (
            <>
              <span>·</span>
              <span className="font-mono text-emerald-300">{t.monthly_roi}</span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SortButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
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

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-48 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]" />
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
