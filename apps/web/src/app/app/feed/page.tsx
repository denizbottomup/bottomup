'use client';

import { useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import { SetupCardView, type SetupCard } from '@/components/setup-card';

type Tab = 'opportunities' | 'active';

interface FeedResponse {
  items: SetupCard[];
}

export default function FeedPage() {
  const [tab, setTab] = useState<Tab>('opportunities');
  const [opp, setOpp] = useState<SetupCard[] | null>(null);
  const [act, setAct] = useState<SetupCard[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setErr(null);
    Promise.all([
      api<FeedResponse>('/feed/opportunities'),
      api<FeedResponse>('/feed/active'),
    ])
      .then(([o, a]) => {
        if (!alive) return;
        setOpp(o.items);
        setAct(a.items);
      })
      .catch((x) => {
        if (!alive) return;
        const msg =
          x instanceof ApiError ? `${x.status} ${x.message}` : (x as Error).message;
        setErr(msg);
      });
    return () => {
      alive = false;
    };
  }, []);

  const loading = opp == null || act == null;
  const items = tab === 'opportunities' ? opp ?? [] : act ?? [];

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <div className="flex items-center gap-2">
        <TabButton
          active={tab === 'opportunities'}
          onClick={() => setTab('opportunities')}
          label="Fırsatlar"
          count={opp?.length ?? null}
        />
        <TabButton
          active={tab === 'active'}
          onClick={() => setTab('active')}
          label="Aktif"
          count={act?.length ?? null}
        />
      </div>

      <div className="mt-5">
        {err ? (
          <EmptyState
            title="Akış yüklenemedi"
            hint={err}
          />
        ) : loading ? (
          <SkeletonGrid />
        ) : items.length === 0 ? (
          <EmptyState
            title={
              tab === 'opportunities'
                ? 'Şimdilik yeni fırsat yok'
                : 'Açık pozisyon görünmüyor'
            }
            hint="Takip ettiğin trader'lar yeni bir emir paylaştığında burada görünecek."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((s) => (
              <SetupCardView key={s.id} setup={s} />
            ))}
          </div>
        )}
      </div>
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
  count: number | null;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative rounded-lg px-4 py-2 text-sm font-medium transition ${
        active
          ? 'bg-white/5 text-fg ring-1 ring-white/10'
          : 'text-fg-muted hover:text-fg'
      }`}
    >
      <span>{label}</span>
      {count != null ? (
        <span
          className={`ml-2 rounded-md px-1.5 py-0.5 font-mono text-[10px] ring-1 ${
            active
              ? 'bg-brand/15 text-brand ring-brand/30'
              : 'bg-white/5 text-fg-dim ring-white/10'
          }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-48 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]"
        />
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
