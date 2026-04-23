'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import { SetupRow } from '@/components/setup-row';
import type { SetupCard } from '@/components/setup-card';

export default function TagPage() {
  const params = useParams<{ tag: string }>();
  const tag = decodeURIComponent(params?.tag ?? '');
  const [items, setItems] = useState<SetupCard[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!tag) return;
    let alive = true;
    api<{ items: SetupCard[] }>(`/feed/tag/${encodeURIComponent(tag)}?limit=80`)
      .then((r) => {
        if (!alive) return;
        setItems(r.items);
      })
      .catch((x) => {
        if (!alive) return;
        setErr(x instanceof ApiError ? `${x.status} ${x.message}` : (x as Error).message);
      });
    return () => {
      alive = false;
    };
  }, [tag]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <Link href="/app/feed" className="text-xs text-fg-muted hover:text-fg">
        ← Akış
      </Link>
      <h1 className="mt-2 text-base font-semibold text-fg">
        <span className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-sm ring-1 ring-white/10">
          #{tag}
        </span>
      </h1>
      <p className="mt-1 text-sm text-fg-muted">
        Bu etiketle paylaşılan setup'lar.
      </p>

      <div className="mt-5">
        {err ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center text-sm text-fg-muted">
            Yüklenemedi: {err}
          </div>
        ) : items == null ? (
          <SkeletonList />
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
            <div className="text-base font-medium text-fg">Setup yok</div>
            <div className="mt-1 text-sm text-fg-muted">Bu etikete henüz setup yazılmamış.</div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((s) => (
              <SetupRow key={s.id} setup={s} pulseKey={0} />
            ))}
          </div>
        )}
      </div>
    </div>
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
