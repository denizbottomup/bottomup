'use client';

import { useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import { SetupRow } from '@/components/setup-row';
import type { SetupCard } from '@/components/setup-card';

interface WatchlistItemRaw {
  id: string;
  added_at: string | null;
  setup: {
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
    trader: {
      id: string;
      name: string | null;
      first_name: string | null;
      last_name: string | null;
      image: string | null;
    };
    coin: {
      code: string;
      display_name: string | null;
      image: string | null;
    };
  };
}

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItemRaw[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api<{ items: WatchlistItemRaw[] }>('/watch_list')
      .then((r) => {
        if (!alive) return;
        setItems(r.items);
      })
      .catch((x) => {
        if (!alive) return;
        const msg = x instanceof ApiError ? `${x.status} ${x.message}` : (x as Error).message;
        setErr(msg);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <h1 className="text-base font-semibold text-fg">Watchlist</h1>
      <p className="mt-1 text-sm text-fg-muted">
        Takip listene eklediğin setup'lar. Yıldız simgesinden ekleyip çıkarabilirsin.
      </p>

      <div className="mt-5">
        {err ? (
          <EmptyState title="Yüklenemedi" hint={err} />
        ) : items == null ? (
          <SkeletonList />
        ) : items.length === 0 ? (
          <EmptyState
            title="Henüz boş"
            hint="Bir setup'a girip ☆ Watchlist butonuna bastığında burada görünür."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((w) => (
              <SetupRow key={w.setup.id} setup={toCard(w.setup)} pulseKey={0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function toCard(s: WatchlistItemRaw['setup']): SetupCard {
  return {
    id: s.id,
    status: s.status,
    category: s.category,
    position: s.position,
    order_type: s.order_type,
    coin_name: s.coin_name,
    entry_value: s.entry_value,
    entry_value_end: s.entry_value_end,
    stop_value: s.stop_value,
    profit_taking_1: s.profit_taking_1,
    profit_taking_2: s.profit_taking_2,
    profit_taking_3: s.profit_taking_3,
    r_value: s.r_value,
    is_tp1: s.is_tp1,
    is_tp2: s.is_tp2,
    is_tp3: s.is_tp3,
    trader: s.trader,
    coin: s.coin,
  };
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

function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
      <div className="text-base font-medium text-fg">{title}</div>
      {hint ? <div className="mt-1 text-sm text-fg-muted">{hint}</div> : null}
    </div>
  );
}
