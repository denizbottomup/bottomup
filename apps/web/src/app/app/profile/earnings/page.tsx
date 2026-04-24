'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';

interface EarningRow {
  id: string;
  amount: number | null;
  paid_amount_credits: number | null;
  is_paid: boolean;
  is_cancelled: boolean;
  is_trial: boolean;
  trader_earn_date: string | null;
  paid_date: string | null;
  installments: number;
  installment: number;
  subscription_id: string | null;
  product_name: string | null;
  product_code: string | null;
}

interface EarningsPayload {
  items: EarningRow[];
  summary: {
    total_earned: number;
    total_paid: number;
    total_pending: number;
    trial_pending: number;
    monthly: Array<{ ym: string; amount: number; paid: number; count: number }>;
  };
}

export default function TraderEarningsPage() {
  const [data, setData] = useState<EarningsPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    let alive = true;
    api<EarningsPayload>('/user/me/trader-earnings')
      .then((r) => {
        if (!alive) return;
        setData(r);
      })
      .catch((x) => {
        if (!alive) return;
        if (x instanceof ApiError && x.status === 403) {
          setForbidden(true);
          return;
        }
        setErr(x instanceof ApiError ? `${x.status} ${x.message}` : (x as Error).message);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (forbidden) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-6">
        <BackLink />
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-16 text-center">
          <div className="text-base font-medium text-fg">Trader yetkisi gerekli</div>
          <p className="mt-2 text-sm text-fg-muted">
            Trader referans kazançları sadece onaylı trader hesaplarında görünür.
          </p>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-6">
        <BackLink />
        <p className="mt-4 text-sm text-rose-300">Kazançlar yüklenemedi: {err}</p>
      </div>
    );
  }

  if (data == null) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-6">
        <BackLink />
        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/[0.02]" />
          ))}
        </div>
      </div>
    );
  }

  const { summary, items } = data;

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <BackLink />
      <h1 className="mt-3 text-xl font-semibold text-fg">Trader kazançlarım</h1>
      <p className="mt-1 text-sm text-fg-muted">
        Davet ettiğin kullanıcıların abonelik ücretlerinden aldığın pay burada listelenir.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="Toplam" value={summary.total_earned} tone="brand" />
        <Stat label="Ödenen" value={summary.total_paid} tone="emerald" />
        <Stat label="Bekliyor" value={summary.total_pending} tone="amber" />
        <Stat label="Deneme (hak ediş)" value={summary.trial_pending} tone="dim" />
      </div>

      {summary.monthly.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-fg-muted">
            Aylık dağılım
          </h2>
          <div className="mt-2 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-fg-dim">
                <tr>
                  <th className="px-3 py-2 text-left">Ay</th>
                  <th className="px-3 py-2 text-right">Toplam</th>
                  <th className="px-3 py-2 text-right">Ödenen</th>
                  <th className="px-3 py-2 text-right">Kayıt</th>
                </tr>
              </thead>
              <tbody>
                {summary.monthly.map((m) => (
                  <tr key={m.ym} className="border-t border-white/5">
                    <td className="px-3 py-2 font-mono text-fg-muted">{m.ym}</td>
                    <td className="px-3 py-2 text-right text-fg">${m.amount.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right text-emerald-300">${m.paid.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right text-fg-dim">{m.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-fg-muted">
          Tüm kayıtlar
        </h2>
        {items.length === 0 ? (
          <div className="mt-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-fg-dim">
            Henüz kazanç kaydın yok.
          </div>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            {items.map((e) => (
              <EarningRowCard key={e.id} e={e} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function EarningRowCard({ e }: { e: EarningRow }) {
  const status = e.is_paid
    ? { label: 'Ödendi', tone: 'emerald' as const }
    : e.is_trial
      ? { label: 'Deneme', tone: 'amber' as const }
      : { label: 'Bekliyor', tone: 'dim' as const };

  const toneClass =
    status.tone === 'emerald'
      ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/30'
      : status.tone === 'amber'
        ? 'bg-amber-400/10 text-amber-300 ring-amber-400/30'
        : 'bg-white/5 text-fg-dim ring-white/10';

  const earnDate = formatDate(e.trader_earn_date);
  const paidDate = e.is_paid ? formatDate(e.paid_date) : null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-fg truncate">
              {e.product_name || e.product_code || 'Abonelik'}
            </span>
            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${toneClass}`}>
              {status.label}
            </span>
            {e.installments > 1 ? (
              <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-fg-dim ring-1 ring-white/10">
                {e.installment}/{e.installments}
              </span>
            ) : null}
          </div>
          <div className="mt-1 text-xs text-fg-muted">
            Hak ediş: {earnDate}
            {paidDate ? ` · Ödendi: ${paidDate}` : ''}
          </div>
        </div>
        <div className="text-right whitespace-nowrap">
          <div className="text-sm font-semibold text-fg">
            ${(e.amount ?? 0).toFixed(2)}
          </div>
          {e.paid_amount_credits != null && e.paid_amount_credits !== e.amount ? (
            <div className="text-[11px] text-fg-dim">
              kredi: {e.paid_amount_credits.toFixed(2)}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'brand' | 'emerald' | 'amber' | 'dim';
}) {
  const toneClass =
    tone === 'emerald'
      ? 'text-emerald-300'
      : tone === 'amber'
        ? 'text-amber-300'
        : tone === 'brand'
          ? 'text-brand'
          : 'text-fg-dim';
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
      <div className="text-[11px] uppercase tracking-wider text-fg-dim">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${toneClass}`}>${value.toFixed(2)}</div>
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
