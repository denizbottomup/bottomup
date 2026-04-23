'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import { useTicker } from '@/lib/ticker';
import { TradingViewChart } from '@/components/tradingview-chart';
import { SetupRow } from '@/components/setup-row';
import type { SetupCard } from '@/components/setup-card';

export default function CoinDetailPage() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(params?.code ?? '').toUpperCase();
  const ticker = useTicker(code);
  const [setups, setSetups] = useState<SetupCard[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    let alive = true;
    api<{ items: SetupCard[] }>(`/feed/coin/${encodeURIComponent(code)}?limit=50`)
      .then((r) => {
        if (!alive) return;
        setSetups(r.items);
      })
      .catch((x) => {
        if (!alive) return;
        setErr(x instanceof ApiError ? `${x.status} ${x.message}` : (x as Error).message);
      });
    return () => {
      alive = false;
    };
  }, [code]);

  const price = ticker ? Number(ticker.close) : null;
  const changePct = ticker ? Number(ticker.change) : null;
  const tone = ticker?.color === 'g' ? 'text-emerald-300' : 'text-rose-300';

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <Link href="/app/feed" className="text-xs text-fg-muted hover:text-fg">
        ← Akış
      </Link>

      <header className="mt-2 flex flex-wrap items-baseline gap-3">
        <h1 className="font-mono text-3xl font-semibold text-fg">{code}</h1>
        {price != null ? (
          <>
            <span className={`font-mono text-2xl ${tone}`}>{formatNum(price)}</span>
            {changePct != null ? (
              <span className={`font-mono text-sm ${tone}`}>
                {(changePct >= 0 ? '+' : '') + changePct.toFixed(2)}%
              </span>
            ) : null}
          </>
        ) : (
          <span className="text-sm text-fg-dim">fiyat bekleniyor…</span>
        )}
      </header>

      {ticker ? (
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          <Stat label="Açılış" value={formatNum(Number(ticker.open))} />
          <Stat label="En yüksek" value={formatNum(Number(ticker.high))} />
          <Stat label="En düşük" value={formatNum(Number(ticker.low))} />
          <Stat
            label="24h değişim"
            value={(changePct! >= 0 ? '+' : '') + changePct!.toFixed(2) + '%'}
            tone={changePct! >= 0 ? 'success' : 'danger'}
          />
        </div>
      ) : null}

      <section className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-bg-card">
        <div className="h-[420px]">
          <TradingViewChart symbol={`BINANCE:${code}`} interval="60" />
        </div>
      </section>

      <section className="mt-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
          Bu coinle ilgili setup'lar
        </h2>
        <div className="mt-2">
          {err ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center text-sm text-rose-300">
              {err}
            </div>
          ) : setups == null ? (
            <SkeletonList />
          ) : setups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center text-sm text-fg-muted">
              Bu coin için açık setup yok.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {setups.map((s) => (
                <SetupRow key={s.id} setup={s} pulseKey={0} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'success' | 'danger';
}) {
  const toneClass =
    tone === 'success' ? 'text-emerald-300' : tone === 'danger' ? 'text-rose-300' : 'text-fg';
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-fg-dim">{label}</div>
      <div className={`mt-0.5 font-mono text-sm ${toneClass}`}>{value}</div>
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-xl border border-white/5 bg-white/[0.02]" />
      ))}
    </div>
  );
}

function formatNum(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  const digits = abs >= 1000 ? 2 : abs >= 1 ? 4 : 6;
  return n.toLocaleString('en-US', { maximumFractionDigits: digits });
}
