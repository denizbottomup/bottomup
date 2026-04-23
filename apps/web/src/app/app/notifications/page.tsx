'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';

interface NotificationItem {
  id: string;
  is_read: boolean;
  type: number;
  message: string | null;
  updated_column: string | null;
  column_value: string | null;
  created_at: string | null;
  setup_id: string | null;
  setup_coin: string | null;
  trader_id: string | null;
  trader_name: string | null;
  trader_image: string | null;
}

interface NotificationsResponse {
  items: NotificationItem[];
  unread: number;
}

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api<NotificationsResponse>('/user/me/notifications?limit=150')
      .then((r) => {
        if (!alive) return;
        setItems(r.items);
        setUnread(r.unread);
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

  const markAllRead = useCallback(async () => {
    if (unread === 0) return;
    try {
      await api<{ ok: true }>('/user/me/notifications', { method: 'PATCH' });
      setItems((prev) => (prev ? prev.map((n) => ({ ...n, is_read: true })) : prev));
      setUnread(0);
      // Broadcast to layout so nav badge clears
      window.dispatchEvent(new CustomEvent('bup:notifications-read'));
    } catch {
      /* ignore */
    }
  }, [unread]);

  const markOneRead = useCallback(async (id: string) => {
    try {
      await api<{ ok: true }>(`/user/me/notifications/${id}`, { method: 'PATCH' });
      setItems((prev) =>
        prev ? prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)) : prev,
      );
      setUnread((u) => Math.max(0, u - 1));
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold text-fg">
          Bildirimler{' '}
          {unread > 0 ? (
            <span className="ml-2 rounded-md bg-brand/15 px-1.5 py-0.5 font-mono text-[11px] text-brand ring-1 ring-brand/30">
              {unread} yeni
            </span>
          ) : null}
        </h1>
        <button
          disabled={unread === 0}
          onClick={() => void markAllRead()}
          className="rounded-md bg-white/5 px-3 py-1.5 text-xs text-fg-muted ring-1 ring-white/10 transition hover:text-fg disabled:opacity-40"
        >
          Tümünü okundu işaretle
        </button>
      </div>

      <div className="mt-5">
        {err ? (
          <EmptyState title="Yüklenemedi" hint={err} />
        ) : items == null ? (
          <SkeletonList />
        ) : items.length === 0 ? (
          <EmptyState
            title="Bildirim yok"
            hint="Takip ettiğin trader'lar bir şey paylaştığında burada görürsün."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((n) => (
              <NotificationRow key={n.id} n={n} onMarkRead={markOneRead} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function NotificationRow({
  n,
  onMarkRead,
}: {
  n: NotificationItem;
  onMarkRead: (id: string) => void;
}) {
  const href = n.setup_id
    ? `/app/setup/${n.setup_id}`
    : n.trader_id
      ? `/app/trader/${n.trader_id}`
      : null;

  const onClick = (): void => {
    if (!n.is_read) onMarkRead(n.id);
  };

  const body = (
    <div
      className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-xl border p-3 transition ${
        n.is_read
          ? 'border-white/5 bg-white/[0.02] hover:border-white/10'
          : 'border-brand/30 bg-brand/5 hover:border-brand/50'
      }`}
    >
      <TraderAvatar src={n.trader_image} name={n.trader_name} />
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[11px] text-fg-dim">
          {n.trader_name ? <span className="font-medium text-fg-muted">{n.trader_name}</span> : null}
          {n.setup_coin ? (
            <span className="rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-fg-muted ring-1 ring-white/10">
              {n.setup_coin.toUpperCase()}
            </span>
          ) : null}
        </div>
        <div className="mt-1 text-sm leading-snug text-fg">
          {n.message ?? humanUpdate(n.updated_column, n.column_value) ?? 'Bildirim'}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 pl-2">
        <span className="font-mono text-[10px] text-fg-dim">{formatAgo(n.created_at)}</span>
        {!n.is_read ? <span className="h-1.5 w-1.5 rounded-full bg-brand" /> : null}
      </div>
    </div>
  );

  if (href) {
    return (
      <li>
        <Link href={href} onClick={onClick} className="block">
          {body}
        </Link>
      </li>
    );
  }
  return (
    <li onClick={onClick} className="cursor-default">
      {body}
    </li>
  );
}

function TraderAvatar({ src, name }: { src: string | null; name: string | null }) {
  const fallback = (name?.[0] ?? '?').toUpperCase();
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="h-9 w-9 rounded-full object-cover ring-1 ring-white/10" />
  ) : (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-sm font-semibold text-fg ring-1 ring-white/10">
      {fallback}
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 8 }).map((_, i) => (
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

function humanUpdate(column: string | null, value: string | null): string | null {
  if (!column) return null;
  const map: Record<string, string> = {
    status: 'Durum değişti',
    entry_value: 'Giriş güncellendi',
    stop_value: 'Stop güncellendi',
    profit_taking_1: 'TP1 güncellendi',
    profit_taking_2: 'TP2 güncellendi',
    profit_taking_3: 'TP3 güncellendi',
    is_tp1: 'TP1 vuruldu',
    is_tp2: 'TP2 vuruldu',
    is_tp3: 'TP3 vuruldu',
  };
  const label = map[column] ?? column;
  return value ? `${label}: ${value}` : label;
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
