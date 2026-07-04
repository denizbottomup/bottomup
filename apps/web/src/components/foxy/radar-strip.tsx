'use client';

import { useEffect, useState } from 'react';
import type { FoxyRadar, FoxyRadarItem } from './types';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://bottomupapi-production.up.railway.app';

/**
 * Fırsat Radarı — the push half of the product. The ETH post-mortem
 * showed our engines flag moves ~25 minutes early, but a pull-only
 * product surfaces a signal ONLY if someone queries the right coin at
 * the right minute. This strip shows fresh 5m signal flips and volume
 * breakouts across the highest-volume coins, unprompted; clicking a
 * card runs the full Foxy analysis for that coin. Polls ~60s.
 */
export function RadarStrip({ onPick }: { onPick: (coin: string) => void }) {
  const [radar, setRadar] = useState<FoxyRadar | null>(null);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const loop = async () => {
      try {
        const res = await fetch(`${API_BASE}/public/radar`, { cache: 'no-store' });
        if (res.ok) {
          const json = (await res.json()) as FoxyRadar | null;
          if (alive && json) setRadar(json);
        }
      } catch {
        // keep the last good scan
      }
      if (alive) timer = setTimeout(() => void loop(), 60000);
    };
    void loop();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const items = radar?.items ?? [];

  return (
    <section className="w-full max-w-[680px]">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="text-[11px] font-extrabold uppercase tracking-[0.09em] text-slate-500">
          🎯 Fırsat radarı
        </span>
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-400">
          en hacimli {radar ? radar.universe.length : '…'} coin · 5dk sinyalleri
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
          </span>
          canlı
        </span>
      </div>

      {items.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {items.slice(0, 6).map((it) => (
            <RadarCard key={`${it.coin}-${it.kind}`} it={it} onPick={onPick} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-[12.5px] font-medium text-slate-400">
          {radar
            ? 'Şu an taze bir dönüş/kırılım yok — radar her dakika tarıyor.'
            : 'Radar taranıyor…'}
        </div>
      )}
    </section>
  );
}

function RadarCard({
  it,
  onPick,
}: {
  it: FoxyRadarItem;
  onPick: (coin: string) => void;
}) {
  const long = it.direction === 'LONG';
  const breakout = it.kind === 'breakout';
  return (
    <button
      type="button"
      onClick={() => onPick(it.coin)}
      className={`group flex items-center gap-3 rounded-xl border bg-white px-3.5 py-2.5 text-left shadow-[0_1px_3px_rgba(16,24,40,.06)] transition-all hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(16,24,40,.10)] ${
        breakout ? (long ? 'border-emerald-300' : 'border-rose-300') : 'border-slate-200'
      }`}
    >
      <span
        className={`rounded-md px-2 py-1 text-[10.5px] font-extrabold ${
          long ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
        }`}
      >
        {it.direction}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-extrabold text-slate-900">
          {it.coin}
          <span
            className={`ml-2 text-[11.5px] font-bold ${
              it.change_15m_pct >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {it.change_15m_pct >= 0 ? '+' : ''}
            {it.change_15m_pct.toFixed(2)}% <span className="text-slate-300">15dk</span>
          </span>
        </span>
        <span className="block truncate text-[11px] font-semibold text-slate-400">
          {breakout
            ? `🔥 hacimli kırılım — ort. hacmin ${it.vol_mult?.toFixed(1) ?? '?'} katı`
            : it.bars_ago === 0
              ? 'sinyal az önce döndü'
              : `sinyal ${it.bars_ago * 5} dk önce döndü`}
        </span>
      </span>
      <span className="text-[12px] font-bold text-slate-300 transition-colors group-hover:text-slate-500">
        analiz →
      </span>
    </button>
  );
}
