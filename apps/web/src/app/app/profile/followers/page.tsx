'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';

interface FollowerRow {
  id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  image: string | null;
}

export default function FollowersPage() {
  const [items, setItems] = useState<FollowerRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api<{ items: FollowerRow[] }>('/user/me/followers')
      .then((r) => alive && setItems(r.items))
      .catch((x) => {
        if (!alive) return;
        setErr(x instanceof ApiError ? `${x.status} ${x.message}` : (x as Error).message);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (err) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-6">
        <Link href="/app/profile" className="text-xs text-fg-muted hover:text-fg">
          ← Profile dön
        </Link>
        <p className="mt-4 text-sm text-rose-300">Takipçiler yüklenemedi: {err}</p>
      </div>
    );
  }
  if (items == null) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-6">
        <Link href="/app/profile" className="text-xs text-fg-muted hover:text-fg">
          ← Profile dön
        </Link>
        <div className="mt-4 flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-white/[0.02]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <Link href="/app/profile" className="text-xs text-fg-muted hover:text-fg">
        ← Profile dön
      </Link>
      <h1 className="mt-3 text-xl font-semibold text-fg">Takipçilerim</h1>
      <p className="mt-1 text-sm text-fg-muted">
        {items.length} kişi seni takip ediyor.
      </p>

      {items.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-10 text-center text-sm text-fg-dim">
          Henüz takipçin yok.
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {items.map((u) => {
            const display =
              u.name ||
              [u.first_name, u.last_name].filter(Boolean).join(' ').trim() ||
              '—';
            return (
              <div
                key={u.id}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3"
              >
                {u.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.image} alt="" className="h-9 w-9 rounded-full object-cover ring-1 ring-white/10" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-sm font-semibold text-fg ring-1 ring-white/10">
                    {display[0]?.toUpperCase() ?? '?'}
                  </div>
                )}
                <span className="text-sm text-fg truncate">{display}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
