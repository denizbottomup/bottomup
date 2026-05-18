'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { SignalRow } from '@/components/signals/signal-row';
import { SignalsToastStack } from '@/components/signals/toast-stack';
import type {
  SignalEvent,
  SignalRow as Row,
  SignalsFeed,
} from '@/components/signals/types';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://bottomupapi-production.up.railway.app';

const POLL_MS = 30_000;

/**
 * /home/signals — cross-coin trader signal feed. The left rail of the
 * page holds the active book (incoming + live setups) and the right
 * rail shows recently-closed setups so the user can read live action
 * + history without switching tabs. Polling the backend every 30 s
 * diffs against the previous snapshot and emits in-page toasts on:
 *   • a setup that wasn't there before  → "Yeni LONG açıldı"
 *   • a status transition (entry/tp/sl) → "TP vuruldu" / "stop"
 *   • a level edit                       → "Setup güncellendi"
 */
export default function SignalsPage() {
  const { user, getIdToken } = useAuth();
  const [feed, setFeed] = useState<SignalsFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coinFilter, setCoinFilter] = useState<string>('all');
  const [sideFilter, setSideFilter] = useState<'all' | 'long' | 'short'>('all');
  const [events, setEvents] = useState<SignalEvent[]>([]);
  const lastByIdRef = useRef<Map<string, Row>>(new Map());
  const firstFetchRef = useRef(true);

  const fetchFeed = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) return;
      const r = await fetch(`${API_BASE}/me/signals/feed`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) {
        setError('Sinyaller yüklenemedi.');
        return;
      }
      const next = (await r.json()) as SignalsFeed;
      // Diff against the previous snapshot — but only AFTER the first
      // load, so the page doesn't fire a wall of "new" toasts on mount.
      if (!firstFetchRef.current) {
        const fresh = diffFeed(lastByIdRef.current, next);
        if (fresh.length > 0) {
          setEvents((prev) => mergeEvents(prev, fresh));
        }
      }
      lastByIdRef.current = indexById(next);
      firstFetchRef.current = false;
      setFeed(next);
    } catch (e) {
      setError((e as Error).message || 'Bilinmeyen hata.');
    } finally {
      setLoading(false);
    }
  }, [user, getIdToken]);

  useEffect(() => {
    void fetchFeed();
    const id = setInterval(() => void fetchFeed(), POLL_MS);
    return () => clearInterval(id);
  }, [fetchFeed]);

  const coins = useMemo(() => {
    if (!feed) return [];
    const set = new Set<string>();
    for (const r of feed.active) set.add(r.coin);
    return [...set].sort();
  }, [feed]);

  const visibleActive = useMemo(() => {
    if (!feed) return [];
    return feed.active.filter((r) => {
      if (coinFilter !== 'all' && r.coin !== coinFilter) return false;
      if (sideFilter !== 'all' && r.position !== sideFilter) return false;
      return true;
    });
  }, [feed, coinFilter, sideFilter]);

  const visibleRecent = useMemo(() => {
    if (!feed) return [];
    return feed.recent.filter((r) => {
      if (coinFilter !== 'all' && r.coin !== coinFilter) return false;
      if (sideFilter !== 'all' && r.position !== sideFilter) return false;
      return true;
    });
  }, [feed, coinFilter, sideFilter]);

  const dismiss = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <div className="mono-label !text-brand">Sinyaller</div>
            <h1 className="mt-1 text-xl font-bold text-fg md:text-2xl">
              BottomUP trader'larından canlı akış
            </h1>
            <p className="mt-1 text-sm text-fg-muted">
              30 saniyede bir güncellenir. Yeni açılan setup'lar ve
              TP/SL/edit olayları sağ üstte bildirim olarak görünür.
            </p>
          </div>
          <Filters
            coins={coins}
            coinFilter={coinFilter}
            setCoinFilter={setCoinFilter}
            sideFilter={sideFilter}
            setSideFilter={setSideFilter}
          />
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {loading && !feed ? (
          <SkeletonState />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void fetchFeed()} />
        ) : (
          <div className="grid h-full grid-cols-1 lg:grid-cols-[1fr,400px]">
            <Section
              title="Aktif kitap"
              subtitle={`${visibleActive.length} setup · trader'lar şu an pozisyonda`}
              empty="Filtreye uyan aktif sinyal yok."
              rows={visibleActive}
              variant="active"
            />
            <Section
              title="Son işlemler"
              subtitle={`Son ${feed?.window_hours ?? 48} saatte ${
                visibleRecent.length
              } kapanış`}
              empty="Bu pencerede kapanış yok."
              rows={visibleRecent}
              variant="recent"
            />
          </div>
        )}
      </main>

      <SignalsToastStack events={events} onDismiss={dismiss} />
    </div>
  );
}

function Filters({
  coins,
  coinFilter,
  setCoinFilter,
  sideFilter,
  setSideFilter,
}: {
  coins: string[];
  coinFilter: string;
  setCoinFilter: (s: string) => void;
  sideFilter: 'all' | 'long' | 'short';
  setSideFilter: (s: 'all' | 'long' | 'short') => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <select
        value={coinFilter}
        onChange={(e) => setCoinFilter(e.target.value)}
        className="rounded-lg border border-border bg-bg-card px-2 py-1.5 text-xs text-fg outline-none hover:border-white/25"
      >
        <option value="all">Tüm coinler</option>
        {coins.map((c) => (
          <option key={c} value={c}>
            {c.replace(/USDT$/i, '')}
          </option>
        ))}
      </select>
      <div className="flex rounded-lg border border-border bg-bg-card">
        {(['all', 'long', 'short'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSideFilter(s)}
            className={`px-2.5 py-1.5 text-xs transition first:rounded-l-lg last:rounded-r-lg ${
              sideFilter === s
                ? s === 'long'
                  ? 'bg-mint/15 text-mint-soft'
                  : s === 'short'
                    ? 'bg-rose-500/15 text-rose-200'
                    : 'bg-bg-elev text-fg'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            {s === 'all' ? 'tüm' : s}
          </button>
        ))}
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  empty,
  rows,
  variant,
}: {
  title: string;
  subtitle: string;
  empty: string;
  rows: Row[];
  variant: 'active' | 'recent';
}) {
  return (
    <section
      className={`flex h-full flex-col overflow-hidden ${
        variant === 'recent' ? 'border-l border-border' : ''
      }`}
    >
      <div className="border-b border-border bg-bg-card/40 px-4 py-2.5">
        <h2 className="text-sm font-semibold text-fg">{title}</h2>
        <p className="mt-0.5 text-[11px] text-fg-dim">{subtitle}</p>
      </div>
      {rows.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-fg-dim">{empty}</div>
      ) : (
        <ul className="flex-1 overflow-y-auto">
          {rows.map((r) => (
            <SignalRow
              key={r.id}
              row={r}
              relTo={variant === 'recent' ? r.closed_at : null}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function SkeletonState() {
  return (
    <div className="p-6 space-y-3">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="h-14 w-full animate-pulse rounded-xl bg-bg-card" />
      ))}
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="text-sm text-rose-200">{message}</div>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-full border border-border bg-bg-card px-4 py-1.5 text-xs text-fg-muted hover:border-white/25 hover:text-fg transition"
      >
        Tekrar dene
      </button>
    </div>
  );
}

/* ───────────── diff helpers ───────────── */

function indexById(feed: SignalsFeed): Map<string, Row> {
  const m = new Map<string, Row>();
  for (const r of feed.active) m.set(r.id, r);
  for (const r of feed.recent) m.set(r.id, r);
  return m;
}

function diffFeed(prev: Map<string, Row>, next: SignalsFeed): SignalEvent[] {
  const events: SignalEvent[] = [];
  const now = Date.now();
  for (const r of next.active) {
    const old = prev.get(r.id);
    if (!old) {
      events.push({
        id: `${r.id}:new:${now}`,
        kind: 'new',
        setup: r,
        at: now,
      });
      continue;
    }
    if (old.status !== r.status) {
      if (old.status === 'incoming' && r.status === 'active') {
        events.push({
          id: `${r.id}:entry:${now}`,
          kind: 'entry_hit',
          setup: r,
          at: now,
        });
      }
    }
    if (
      old.entry_value !== r.entry_value ||
      old.stop_value !== r.stop_value ||
      old.profit_taking_1 !== r.profit_taking_1
    ) {
      events.push({
        id: `${r.id}:edit:${now}`,
        kind: 'edit',
        setup: r,
        at: now,
      });
    }
  }
  for (const r of next.recent) {
    const old = prev.get(r.id);
    if (!old) continue; // first time seeing it but already closed — skip toast
    if (old.status !== r.status) {
      if (r.status === 'success') {
        events.push({
          id: `${r.id}:tp:${now}`,
          kind: 'tp_hit',
          setup: r,
          at: now,
        });
      } else if (r.status === 'stopped') {
        events.push({
          id: `${r.id}:sl:${now}`,
          kind: 'stopped',
          setup: r,
          at: now,
        });
      } else if (r.status === 'closed') {
        events.push({
          id: `${r.id}:close:${now}`,
          kind: 'closed',
          setup: r,
          at: now,
        });
      }
    }
  }
  return events;
}

function mergeEvents(prev: SignalEvent[], fresh: SignalEvent[]): SignalEvent[] {
  // Cap the live stack at 20 so a thundering herd doesn't blow up
  // memory; the toast-stack itself only renders the top 5.
  return [...fresh, ...prev].slice(0, 20);
}
