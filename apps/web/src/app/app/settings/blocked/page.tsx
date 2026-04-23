'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';

interface Blocked {
  id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  image: string | null;
}

export default function BlockedPage() {
  const [items, setItems] = useState<Blocked[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    try {
      const r = await api<Blocked[]>('/user/me/blocks');
      setItems(r);
    } catch (x) {
      setErr(x instanceof ApiError ? `${x.status} ${x.message}` : (x as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const unblock = useCallback(async (id: string) => {
    setPending((p) => ({ ...p, [id]: true }));
    try {
      await api<{ ok: true }>(`/user/traders/${id}/block`, { method: 'DELETE' });
      setItems((prev) => prev?.filter((b) => b.id !== id) ?? prev);
    } catch {
      /* silent */
    } finally {
      setPending((p) => ({ ...p, [id]: false }));
    }
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <Link href="/app/settings" className="text-xs text-fg-muted hover:text-fg">
        ← Ayarlar
      </Link>
      <h1 className="mt-2 text-base font-semibold text-fg">Engellenenler</h1>

      <div className="mt-4">
        {err ? (
          <p className="text-xs text-rose-300">{err}</p>
        ) : items == null ? (
          <Skeleton />
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-14 text-center text-sm text-fg-muted">
            Kimseyi engellemedin.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((b) => {
              const name =
                b.name || [b.first_name, b.last_name].filter(Boolean).join(' ').trim() || 'Trader';
              return (
                <li
                  key={b.id}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2"
                >
                  <Avatar src={b.image} fallback={(name[0] ?? '?').toUpperCase()} />
                  <span className="flex-1 text-sm text-fg">{name}</span>
                  <button
                    onClick={() => void unblock(b.id)}
                    disabled={!!pending[b.id]}
                    className="rounded-md bg-white/5 px-3 py-1 text-xs text-fg-muted ring-1 ring-white/10 transition hover:text-fg disabled:opacity-60"
                  >
                    Engeli kaldır
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Avatar({ src, fallback }: { src: string | null; fallback: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="h-9 w-9 rounded-full object-cover ring-1 ring-white/10" />
  ) : (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-sm font-semibold text-fg ring-1 ring-white/10">
      {fallback}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-xl border border-white/5 bg-white/[0.02]" />
      ))}
    </div>
  );
}
