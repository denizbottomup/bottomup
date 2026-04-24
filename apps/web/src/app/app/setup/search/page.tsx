'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import type { SetupCard } from '@/components/setup-card';
import { SetupRow } from '@/components/setup-row';

type Status = 'all' | 'incoming' | 'active' | 'closed';
type Category = 'all' | 'spot' | 'futures';

interface SearchResponse {
  items: SetupCard[];
  total: number;
}

export default function SetupSearchPage() {
  const [query, setQuery] = useState('');
  const [coin, setCoin] = useState('');
  const [tag, setTag] = useState('');
  const [status, setStatus] = useState<Status>('all');
  const [category, setCategory] = useState<Category>('all');
  const [onlyFollowed, setOnlyFollowed] = useState(false);
  const [items, setItems] = useState<SetupCard[] | null>(null);
  const [total, setTotal] = useState(0);
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    setPending(true);
    setErr(null);
    try {
      const body: Record<string, unknown> = {
        query: query.trim() || undefined,
        coin_name: coin.trim().toUpperCase() || undefined,
        tag: tag.trim() || undefined,
        category: category === 'all' ? undefined : category,
        status:
          status === 'all'
            ? undefined
            : status === 'closed'
              ? ['closed', 'success', 'stopped', 'cancelled']
              : [status],
        only_followed: onlyFollowed || undefined,
        limit: 40,
      };
      const res = await api<SearchResponse>('/setup/search', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (x) {
      setErr(x instanceof ApiError ? `${x.status} ${x.message}` : (x as Error).message);
    } finally {
      setPending(false);
    }
  };

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-fg">Setup arama</h1>
        <Link href="/app/feed" className="text-xs text-fg-muted hover:text-fg">
          ← Akış
        </Link>
      </div>

      <form
        className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Anahtar kelime / not"
          className="md:col-span-2 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-fg placeholder:text-fg-dim focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
        <input
          value={coin}
          onChange={(e) => setCoin(e.target.value)}
          placeholder="Coin (örn. BTC)"
          className="rounded-lg border border-border bg-bg-card px-3 py-2 font-mono text-sm text-fg placeholder:text-fg-dim focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
        <input
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="#etiket"
          className="rounded-lg border border-border bg-bg-card px-3 py-2 font-mono text-sm text-fg placeholder:text-fg-dim focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
          className="rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-fg focus:border-brand focus:outline-none"
        >
          <option value="all">Tüm marketler</option>
          <option value="futures">Futures</option>
          <option value="spot">Spot</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as Status)}
          className="rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-fg focus:border-brand focus:outline-none"
        >
          <option value="all">Tüm durumlar</option>
          <option value="incoming">Bekleyen</option>
          <option value="active">Aktif</option>
          <option value="closed">Kapanmış</option>
        </select>
        <label className="flex items-center gap-2 rounded-lg border border-border bg-bg-card px-3 py-2 text-xs text-fg-muted">
          <input
            type="checkbox"
            checked={onlyFollowed}
            onChange={(e) => setOnlyFollowed(e.target.checked)}
          />
          Sadece takip ettiklerim
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white ring-1 ring-brand hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? 'Aranıyor…' : 'Ara'}
        </button>
      </form>

      {err ? <p className="mt-3 text-xs text-rose-300">{err}</p> : null}

      <div className="mt-5">
        {items == null ? null : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-10 text-center text-sm text-fg-dim">
            Kriterlere uyan setup bulunamadı.
          </div>
        ) : (
          <>
            <div className="mb-2 text-[11px] text-fg-dim">
              {total} sonuç · ilk {items.length} gösteriliyor
            </div>
            <div className="flex flex-col gap-2">
              {items.map((s) => (
                <SetupRow key={s.id} setup={s} pulseKey={0} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
