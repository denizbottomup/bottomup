'use client';

import { useEffect, useState } from 'react';
import type { CoinMatch } from '@/lib/coin-extract';
import type { FoxyDepthBucket, FoxyDepthProfile } from './types';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://bottomupapi-production.up.railway.app';

/**
 * Depth profile — where resting buy/sell orders pile up around the
 * price, with disproportionate bands flagged as walls. The ladder
 * ("canlı tahta") shows the top of the book flowing; this shows the
 * STRUCTURE: which levels are defended, which cap the move. Polls the
 * public endpoint every ~3s.
 */
export function DepthWallsPanel({ coin }: { coin: CoinMatch }) {
  const [depth, setDepth] = useState<FoxyDepthProfile | null>(null);
  const [status, setStatus] = useState<'loading' | 'live' | 'error'>('loading');

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const loop = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/public/depth/${encodeURIComponent(coin.symbol)}`,
          { cache: 'no-store' },
        );
        if (res.ok) {
          const json = (await res.json()) as FoxyDepthProfile | null;
          if (alive && json) {
            setDepth(json);
            setStatus('live');
          }
        } else if (alive && !depthRefHasData(depth)) {
          setStatus('error');
        }
      } catch {
        if (alive && !depthRefHasData(depth)) setStatus('error');
      }
      if (alive) timer = setTimeout(() => void loop(), 3000);
    };
    void loop();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coin.symbol]);

  const maxUsd = depth
    ? Math.max(1, ...depth.bids.map((b) => b.usd), ...depth.asks.map((a) => a.usd))
    : 1;
  // Render asks farthest→nearest (so the mid sits between the sides),
  // bids nearest→farthest.
  const asksTopDown = depth ? [...depth.asks].reverse() : [];

  return (
    <section className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_2px_6px_rgba(16,24,40,.06),0_12px_32px_rgba(16,24,40,.08)]">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-[18px] py-3">
        <span className="text-[13px] font-extrabold tracking-tight text-slate-900">
          Alım / satım duvarları
        </span>
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10.5px] font-bold text-slate-500">
          ±%{depth ? depth.range_pct.toFixed(1) : '2.5'} ·{' '}
          {depth ? `${depth.sources.length} borsa` : '…'}
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-[10.5px] font-bold text-slate-400">
          <span className="relative flex size-1.5">
            {status === 'live' ? (
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            ) : null}
            <span
              className={`relative inline-flex size-1.5 rounded-full ${
                status === 'live'
                  ? 'bg-emerald-500'
                  : status === 'error'
                    ? 'bg-rose-400'
                    : 'bg-slate-300'
              }`}
            />
          </span>
          {status === 'live' ? 'canlı' : status === 'error' ? 'veri yok' : '…'}
        </span>
      </div>

      {depth ? (
        <>
          {/* Nearest-wall summary — the actionable line. */}
          <div className="flex flex-wrap gap-2 border-b border-slate-100 px-[18px] py-2.5">
            <WallChip
              label="En yakın alım duvarı"
              bucket={depth.support_wall}
              mid={depth.mid}
              tone="bid"
            />
            <WallChip
              label="En yakın satış duvarı"
              bucket={depth.resistance_wall}
              mid={depth.mid}
              tone="ask"
            />
          </div>

          <div className="px-[18px] py-3">
            {asksTopDown.map((b) => (
              <BucketRow key={`a${b.px_low}`} b={b} maxUsd={maxUsd} side="ask" />
            ))}
            <div className="my-1.5 flex items-center gap-3">
              <span className="text-[13px] font-extrabold text-slate-900">
                {fmtPx(depth.mid)}
              </span>
              <span className="h-px flex-1 bg-slate-200" />
              <span className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-400">
                şu anki fiyat
              </span>
            </div>
            {depth.bids.map((b) => (
              <BucketRow key={`b${b.px_low}`} b={b} maxUsd={maxUsd} side="bid" />
            ))}
          </div>

          <div className="border-t border-slate-100 px-[18px] py-2 text-[10.5px] font-semibold text-slate-400">
            Bekleyen emirler — {depth.sources.join(' + ')} defterlerinin
            toplamı. DUVAR = o banttaki para, tipik bandın en az 3 katı.
            Band genişliği borsaların gerçek defter derinliğine göre uyarlanır.
          </div>
        </>
      ) : (
        <div className="grid h-[200px] place-items-center text-[13px] font-medium text-slate-400">
          {status === 'error'
            ? 'Derinlik verisi şu an alınamadı.'
            : 'Derinlik yükleniyor…'}
        </div>
      )}
    </section>
  );
}

function depthRefHasData(d: FoxyDepthProfile | null): boolean {
  return d != null;
}

function WallChip({
  label,
  bucket,
  mid,
  tone,
}: {
  label: string;
  bucket: FoxyDepthBucket | null;
  mid: number;
  tone: 'bid' | 'ask';
}) {
  const cls =
    tone === 'bid'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
      : 'bg-rose-50 text-rose-700 border-rose-100';
  if (!bucket) {
    return (
      <span className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1 text-[11.5px] font-bold text-slate-400">
        {label}: yok (dağınık defter)
      </span>
    );
  }
  const distPct = mid > 0 ? ((bucket.px_mid - mid) / mid) * 100 : 0;
  return (
    <span className={`rounded-lg border px-2.5 py-1 text-[11.5px] font-bold ${cls}`}>
      {label}: {fmtPx(bucket.px_mid)} ({distPct >= 0 ? '+' : ''}
      {distPct.toFixed(2)}%) · {fmtUsdShort(bucket.usd)}
    </span>
  );
}

function BucketRow({
  b,
  maxUsd,
  side,
}: {
  b: FoxyDepthBucket;
  maxUsd: number;
  side: 'bid' | 'ask';
}) {
  const w = Math.max(1, Math.round((b.usd / maxUsd) * 100));
  const bar =
    side === 'ask'
      ? b.is_wall
        ? 'bg-rose-400'
        : 'bg-rose-100'
      : b.is_wall
        ? 'bg-emerald-400'
        : 'bg-emerald-100';
  return (
    <div className="flex h-[18px] items-center gap-2.5">
      <span
        className={`w-[74px] shrink-0 text-right text-[11px] font-bold tabular-nums ${
          b.is_wall ? 'text-slate-900' : 'text-slate-400'
        }`}
      >
        {fmtPx(side === 'ask' ? b.px_high : b.px_low)}
      </span>
      <div className="relative h-[11px] flex-1 overflow-hidden rounded-sm">
        <span
          className={`absolute inset-y-0 left-0 rounded-sm transition-[width] duration-700 ease-out ${bar}`}
          style={{ width: `${w}%` }}
        />
      </div>
      <span
        className={`w-[92px] shrink-0 text-right text-[10.5px] font-bold tabular-nums ${
          b.is_wall
            ? side === 'ask'
              ? 'text-rose-600'
              : 'text-emerald-600'
            : 'text-slate-300'
        }`}
      >
        {b.is_wall ? `DUVAR ${fmtUsdShort(b.usd)}` : fmtUsdShort(b.usd)}
      </span>
    </div>
  );
}

function fmtPx(n: number): string {
  const a = Math.abs(n);
  const d =
    a >= 1000 ? 0 : a >= 1 ? 2 : a > 0 ? Math.max(4, Math.ceil(-Math.log10(a)) + 3) : 2;
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}`;
}

function fmtUsdShort(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}
