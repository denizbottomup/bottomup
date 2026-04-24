'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';

interface ArchiveRow {
  id: string;
  coin_name: string;
  status: string;
  position: string | null;
  category: string;
  entry_value: number;
  close_price: number | null;
  r_value: number | null;
  trader_id: string | null;
  trader_name: string | null;
  trader_image: string | null;
  coin_image: string | null;
  close_date: string | null;
}

type Tab = 'all' | 'closed' | 'open';

export default function ArchivePage() {
  const [items, setItems] = useState<ArchiveRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('all');

  useEffect(() => {
    let alive = true;
    api<{ items: ArchiveRow[] }>('/user/me/archive?limit=120')
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
        <BackLink />
        <p className="mt-4 text-sm text-rose-300">Arşiv yüklenemedi: {err}</p>
      </div>
    );
  }
  if (items == null) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-6">
        <BackLink />
        <div className="mt-4 flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-white/[0.02]" />
          ))}
        </div>
      </div>
    );
  }

  const closedStates = new Set(['closed', 'success', 'stopped', 'cancelled']);
  const filtered =
    tab === 'closed'
      ? items.filter((s) => closedStates.has(s.status))
      : tab === 'open'
        ? items.filter((s) => !closedStates.has(s.status))
        : items;

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <BackLink />
      <h1 className="mt-3 text-xl font-semibold text-fg">Arşivim</h1>
      <p className="mt-1 text-sm text-fg-muted">
        Alkışladığın veya watchlist'e eklediğin tüm setup'lar burada birikir.
      </p>

      <div className="mt-3 flex items-center gap-1">
        <TabBtn active={tab === 'all'} label="Hepsi" onClick={() => setTab('all')} />
        <TabBtn active={tab === 'open'} label="Açık" onClick={() => setTab('open')} />
        <TabBtn active={tab === 'closed'} label="Kapanmış" onClick={() => setTab('closed')} />
      </div>

      <div className="mt-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-10 text-center text-sm text-fg-dim">
            Bu filtrede kayıt yok.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((s) => (
              <Row key={s.id} s={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ s }: { s: ArchiveRow }) {
  const pos = s.position === 'long' ? 'Long' : s.position === 'short' ? 'Short' : '—';
  const posTone =
    s.position === 'long'
      ? 'text-emerald-300'
      : s.position === 'short'
        ? 'text-rose-300'
        : 'text-fg-dim';
  return (
    <Link
      href={`/app/setup/${s.id}`}
      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 transition hover:border-white/20"
    >
      {s.coin_image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={s.coin_image} alt="" className="h-8 w-8 rounded-full object-cover ring-1 ring-white/10" />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 font-mono text-xs text-fg-muted ring-1 ring-white/10">
          {s.coin_name.slice(0, 3)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold text-fg">{s.coin_name}</span>
          <span className={`text-[11px] font-medium ${posTone}`}>{pos}</span>
          <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-fg-dim ring-1 ring-white/10">
            {s.status}
          </span>
        </div>
        <div className="mt-0.5 text-[11px] text-fg-dim">
          {s.trader_name ?? '—'}
          {s.close_date ? ` · ${new Date(s.close_date).toLocaleDateString('tr-TR')}` : ''}
        </div>
      </div>
      {s.r_value != null ? (
        <span
          className={`rounded-md px-2 py-0.5 font-mono text-[11px] ring-1 ${
            s.r_value >= 0
              ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/30'
              : 'bg-rose-400/10 text-rose-300 ring-rose-400/30'
          }`}
        >
          R {s.r_value.toFixed(1)}
        </span>
      ) : null}
    </Link>
  );
}

function TabBtn({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
        active ? 'bg-white/5 text-fg ring-1 ring-white/10' : 'text-fg-muted hover:text-fg'
      }`}
    >
      {label}
    </button>
  );
}

function BackLink() {
  return (
    <Link href="/app/profile" className="text-xs text-fg-muted hover:text-fg">
      ← Profile dön
    </Link>
  );
}
