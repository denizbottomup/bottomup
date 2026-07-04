'use client';

import { useEffect, useState } from 'react';
import type { CoinMatch } from '@/lib/coin-extract';
import type { FoxyConfluence, FoxyZone } from './types';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://bottomupapi-production.up.railway.app';

/**
 * "En doğru bölgeler" — multi-timeframe confluence map. Order blocks,
 * unfilled FVGs and EMA20/50/200 from 1W/1D/4H/15m/5m, overlaid with
 * the live depth walls, clustered into scored buy/sell bands. Supply
 * zones render above the price line, demand below — top-down like a
 * chart. Polls ~30s (inputs move on candle scale).
 */
export function ZonesPanel({ coin }: { coin: CoinMatch }) {
  const [data, setData] = useState<FoxyConfluence | null>(null);
  const [status, setStatus] = useState<'loading' | 'live' | 'error'>('loading');

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const loop = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/public/zones/${encodeURIComponent(coin.symbol)}`,
          { cache: 'no-store' },
        );
        if (res.ok) {
          const json = (await res.json()) as FoxyConfluence | null;
          if (alive && json) {
            setData(json);
            setStatus('live');
          }
        } else if (alive) {
          setStatus((s) => (s === 'live' ? s : 'error'));
        }
      } catch {
        if (alive) setStatus((s) => (s === 'live' ? s : 'error'));
      }
      if (alive) timer = setTimeout(() => void loop(), 30000);
    };
    void loop();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [coin.symbol]);

  const supply = data
    ? data.zones.filter((z) => z.side === 'supply').sort((a, b) => b.mid - a.mid)
    : [];
  const demand = data
    ? data.zones.filter((z) => z.side === 'demand').sort((a, b) => b.mid - a.mid)
    : [];

  return (
    <section className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_2px_6px_rgba(16,24,40,.06),0_12px_32px_rgba(16,24,40,.08)]">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-[18px] py-3">
        <span className="text-[13px] font-extrabold tracking-tight text-slate-900">
          En doğru alım / satım bölgeleri
        </span>
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10.5px] font-bold text-slate-500">
          1W · 1D · 4H · 15d · 5d + duvarlar
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

      {data ? (
        <>
          <div className="flex flex-col gap-2 px-[18px] py-3.5">
            {supply.length > 0 ? (
              supply.map((z) => <ZoneRow key={`s${z.low}`} z={z} />)
            ) : (
              <div className="rounded-xl bg-slate-50 px-4 py-2.5 text-[12px] font-medium text-slate-400">
                Üstte güçlü bir satış bölgesi görünmüyor (±%12 bandında).
              </div>
            )}

            <div className="my-1 flex items-center gap-3">
              <span className="text-[13px] font-extrabold text-slate-900">
                {fmtPx(data.price)}
              </span>
              <span className="h-px flex-1 bg-slate-200" />
              <span className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-400">
                şu anki fiyat
              </span>
            </div>

            {demand.length > 0 ? (
              demand.map((z) => <ZoneRow key={`d${z.low}`} z={z} />)
            ) : (
              <div className="rounded-xl bg-slate-50 px-4 py-2.5 text-[12px] font-medium text-slate-400">
                Altta güçlü bir alım bölgesi görünmüyor (±%12 bandında).
              </div>
            )}
          </div>
          <div className="border-t border-slate-100 px-[18px] py-2 text-[10.5px] font-semibold leading-relaxed text-slate-400">
            Bölge = en az iki bağımsız kanıtın çakıştığı fiyat bandı: emir
            bloğu (OB), doldurulmamış fiyat boşluğu (FVG), EMA 20/50/200 ve
            defterdeki duvarlar. Yüksek zaman dilimi daha ağır basar. Yatırım
            tavsiyesi değil.
          </div>
        </>
      ) : (
        <div className="grid h-[160px] place-items-center text-[13px] font-medium text-slate-400">
          {status === 'error'
            ? 'Bölge analizi şu an alınamadı.'
            : 'Beş zaman dilimi taranıyor…'}
        </div>
      )}
    </section>
  );
}

function ZoneRow({ z }: { z: FoxyZone }) {
  const demand = z.side === 'demand';
  const tone = demand
    ? 'border-emerald-100 bg-emerald-50/60'
    : 'border-rose-100 bg-rose-50/60';
  const tag = demand ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white';
  const power = z.score >= 12 ? 'ÇOK GÜÇLÜ' : z.score >= 7 ? 'GÜÇLÜ' : 'ORTA';
  return (
    <div className={`rounded-xl border px-4 py-2.5 ${tone}`}>
      <div className="flex flex-wrap items-center gap-2.5">
        <span className={`rounded-md px-2 py-0.5 text-[10.5px] font-extrabold ${tag}`}>
          {demand ? 'ALIM' : 'SATIŞ'}
        </span>
        <span className="text-[14.5px] font-extrabold tabular-nums text-slate-900">
          {fmtPx(z.low)} – {fmtPx(z.high)}
        </span>
        <span className="text-[11.5px] font-bold text-slate-400">
          {z.dist_pct >= 0 ? '+' : ''}
          {z.dist_pct.toFixed(2)}%
        </span>
        <span className="ml-auto text-[10.5px] font-extrabold uppercase tracking-[0.04em] text-slate-500">
          {power} · {z.factors.length} kanıt
        </span>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {z.factors.slice(0, 6).map((f, i) => (
          <span
            key={i}
            className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
              f.kind === 'wall'
                ? 'bg-slate-900 text-white'
                : f.kind === 'order_block'
                  ? 'bg-white text-slate-700 ring-1 ring-slate-200'
                  : 'bg-white/70 text-slate-500 ring-1 ring-slate-150'
            }`}
          >
            {f.detail}
          </span>
        ))}
        {z.factors.length > 6 ? (
          <span className="rounded-md bg-white/70 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">
            +{z.factors.length - 6}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function fmtPx(n: number): string {
  const a = Math.abs(n);
  const d =
    a >= 1000 ? 0 : a >= 1 ? 2 : a > 0 ? Math.max(4, Math.ceil(-Math.log10(a)) + 3) : 2;
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}`;
}
