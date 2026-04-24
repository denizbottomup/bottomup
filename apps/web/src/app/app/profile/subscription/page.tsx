'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';

interface SubscriptionRow {
  id: string;
  market: string | null;
  transaction_id: string | null;
  start_date: string | null;
  expire_date: string | null;
  is_expired: boolean;
  is_cancelled: boolean;
  is_trial: boolean;
  auto_renew_status: boolean;
  price: number | null;
  currency: string | null;
  product_id: string | null;
  product_code: string | null;
  product_name: string | null;
  product_duration: number | null;
  trader_id: string | null;
  trader_name: string | null;
  trader_image: string | null;
}

export default function SubscriptionHistoryPage() {
  const [items, setItems] = useState<SubscriptionRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api<{ items: SubscriptionRow[] }>('/user/me/subscriptions')
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
  }, []);

  if (err) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-6">
        <BackLink />
        <p className="mt-4 text-sm text-rose-300">Abonelikler yüklenemedi: {err}</p>
      </div>
    );
  }
  if (items == null) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-6">
        <BackLink />
        <div className="mt-4 flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/[0.02]" />
          ))}
        </div>
      </div>
    );
  }

  const active = items.filter((s) => !s.is_expired && !s.is_cancelled);
  const past = items.filter((s) => s.is_expired || s.is_cancelled);

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <BackLink />
      <h1 className="mt-3 text-xl font-semibold text-fg">Aboneliklerim</h1>
      <p className="mt-1 text-sm text-fg-muted">
        Geçmiş ve aktif aboneliklerin burada listelenir.
      </p>

      <Section
        title="Aktif abonelikler"
        empty="Aktif aboneliğin yok."
        items={active}
      />
      <Section
        title="Geçmiş abonelikler"
        empty="Geçmiş abonelik görünmüyor."
        items={past}
        muted
      />

      {active.length > 0 ? (
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <h2 className="text-sm font-semibold text-fg">Aboneliği yönet</h2>
          <p className="mt-1 text-xs text-fg-muted">
            Aboneliğini satın aldığın mağaza üzerinden yönetmelisin. Web tarafından iptal edilemez.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href="https://apps.apple.com/account/subscriptions"
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-white/5 px-3 py-1.5 text-xs text-fg-muted ring-1 ring-white/10 hover:text-fg"
            >
              App Store · Aboneliklerim
            </a>
            <a
              href="https://play.google.com/store/account/subscriptions"
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-white/5 px-3 py-1.5 text-xs text-fg-muted ring-1 ring-white/10 hover:text-fg"
            >
              Google Play · Aboneliklerim
            </a>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Section({
  title,
  items,
  empty,
  muted,
}: {
  title: string;
  items: SubscriptionRow[];
  empty: string;
  muted?: boolean;
}) {
  return (
    <section className="mt-5">
      <h2 className="text-sm font-semibold text-fg-muted uppercase tracking-wider">
        {title}
      </h2>
      {items.length === 0 ? (
        <div className="mt-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-fg-dim">
          {empty}
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-2">
          {items.map((s) => (
            <SubRow key={s.id} s={s} muted={muted} />
          ))}
        </div>
      )}
    </section>
  );
}

function SubRow({ s, muted }: { s: SubscriptionRow; muted?: boolean }) {
  const status = s.is_cancelled
    ? { label: 'İptal', tone: 'rose' as const }
    : s.is_expired
      ? { label: 'Süresi doldu', tone: 'dim' as const }
      : s.is_trial
        ? { label: 'Deneme', tone: 'amber' as const }
        : { label: 'Aktif', tone: 'emerald' as const };

  const toneClass =
    status.tone === 'emerald'
      ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/30'
      : status.tone === 'amber'
        ? 'bg-amber-400/10 text-amber-300 ring-amber-400/30'
        : status.tone === 'rose'
          ? 'bg-rose-400/10 text-rose-300 ring-rose-400/30'
          : 'bg-white/5 text-fg-dim ring-white/10';

  const start = formatDate(s.start_date);
  const end = formatDate(s.expire_date);
  const price =
    s.price != null
      ? `${s.price.toFixed(2)}${s.currency ? ` ${s.currency}` : ''}`
      : null;

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.02] p-4 ${muted ? 'opacity-80' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-fg truncate">
              {s.product_name || s.product_code || '—'}
            </span>
            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${toneClass}`}>
              {status.label}
            </span>
            {s.market ? (
              <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-fg-dim ring-1 ring-white/10">
                {s.market}
              </span>
            ) : null}
          </div>
          <div className="mt-1 text-xs text-fg-muted">
            {start} → {end}
            {s.product_duration ? ` · ${s.product_duration} gün` : ''}
            {s.auto_renew_status ? ' · otomatik yenileme açık' : ''}
          </div>
          {s.trader_id && s.trader_name ? (
            <Link
              href={`/app/trader/${s.trader_id}`}
              className="mt-1 inline-flex items-center gap-1 text-xs text-brand hover:underline"
            >
              {s.trader_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.trader_image} alt="" className="h-4 w-4 rounded-full object-cover" />
              ) : null}
              {s.trader_name}
            </Link>
          ) : null}
        </div>
        {price ? (
          <div className="text-right text-sm text-fg whitespace-nowrap">
            {price}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('tr-TR', { year: 'numeric', month: 'short', day: 'numeric' });
}

function BackLink() {
  return (
    <Link href="/app/profile" className="text-xs text-fg-muted hover:text-fg">
      ← Profile dön
    </Link>
  );
}
