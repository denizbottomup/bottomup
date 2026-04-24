'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';

interface FollowedTrader {
  id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  image: string | null;
  is_trending: boolean;
  monthly_roi: string | null;
  followers: number;
}

export default function FollowingPage() {
  const [items, setItems] = useState<FollowedTrader[] | null>(null);
  const [suggested, setSuggested] = useState<FollowedTrader[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setErr(null);
    try {
      const [f, s] = await Promise.all([
        api<{ items: FollowedTrader[] }>('/user/me/follows'),
        api<{ items: FollowedTrader[] }>('/user/me/suggestion?limit=12').catch(() => ({
          items: [],
        })),
      ]);
      setItems(f.items);
      setSuggested(s.items);
    } catch (x) {
      setErr(x instanceof ApiError ? `${x.status} ${x.message}` : (x as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const follow = useCallback(async (traderId: string) => {
    setPending((p) => ({ ...p, [traderId]: true }));
    try {
      await api<{ ok: true }>(`/user/traders/${traderId}`, { method: 'PUT' });
      await load();
    } finally {
      setPending((p) => ({ ...p, [traderId]: false }));
    }
  }, [load]);

  const unfollow = useCallback(
    async (traderId: string) => {
      setPending((p) => ({ ...p, [traderId]: true }));
      try {
        await api<{ ok: true }>(`/user/traders/${traderId}`, { method: 'DELETE' });
        await load();
      } finally {
        setPending((p) => ({ ...p, [traderId]: false }));
      }
    },
    [load],
  );

  if (err) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-6">
        <BackLink />
        <p className="mt-4 text-sm text-rose-300">Liste yüklenemedi: {err}</p>
      </div>
    );
  }
  if (items == null) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-6">
        <BackLink />
        <div className="mt-4 flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-white/[0.02]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <BackLink />
      <h1 className="mt-3 text-xl font-semibold text-fg">Takip ettiklerim</h1>

      <section className="mt-4">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-10 text-center text-sm text-fg-dim">
            Henüz kimseyi takip etmiyorsun. Aşağıdan önerilen trader'ları keşfedebilirsin.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((t) => (
              <TraderRow
                key={t.id}
                t={t}
                action={{
                  label: 'Takipte',
                  tone: 'muted',
                  busy: Boolean(pending[t.id]),
                  onClick: () => void unfollow(t.id),
                }}
              />
            ))}
          </div>
        )}
      </section>

      {suggested && suggested.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-fg-muted">
            Sana önerilen
          </h2>
          <div className="mt-2 flex flex-col gap-2">
            {suggested.map((t) => (
              <TraderRow
                key={t.id}
                t={t}
                action={{
                  label: 'Takip et',
                  tone: 'brand',
                  busy: Boolean(pending[t.id]),
                  onClick: () => void follow(t.id),
                }}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function TraderRow({
  t,
  action,
}: {
  t: FollowedTrader;
  action: {
    label: string;
    tone: 'brand' | 'muted';
    busy: boolean;
    onClick: () => void;
  };
}) {
  const display =
    t.name || [t.first_name, t.last_name].filter(Boolean).join(' ').trim() || 'Trader';
  const btn =
    action.tone === 'brand'
      ? 'bg-brand text-white ring-brand hover:bg-brand-dark'
      : 'bg-white/5 text-fg-muted ring-white/10 hover:bg-white/10';
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
      <Link href={`/app/trader/${t.id}`} className="shrink-0">
        {t.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={t.image} alt="" className="h-10 w-10 rounded-full object-cover ring-1 ring-white/10" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-sm font-semibold text-fg ring-1 ring-white/10">
            {display[0]?.toUpperCase() ?? '?'}
          </div>
        )}
      </Link>
      <Link href={`/app/trader/${t.id}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-fg">{display}</span>
          {t.is_trending ? (
            <span className="rounded-md bg-brand/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand ring-1 ring-brand/30">
              Öne çıkan
            </span>
          ) : null}
        </div>
        <div className="text-[11px] text-fg-dim">
          {t.followers} takipçi
          {t.monthly_roi ? ` · Aylık ROI ${t.monthly_roi}` : ''}
        </div>
      </Link>
      <button
        onClick={action.onClick}
        disabled={action.busy}
        className={`rounded-lg px-3 py-1.5 text-xs font-medium ring-1 transition ${btn} disabled:opacity-60`}
      >
        {action.busy ? '…' : action.label}
      </button>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/app/profile" className="text-xs text-fg-muted hover:text-fg">
      ← Profile dön
    </Link>
  );
}
