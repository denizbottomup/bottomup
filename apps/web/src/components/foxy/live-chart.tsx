'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CandlestickSeries,
  ColorType,
  LineStyle,
  createChart,
  type IChartApi,
  type IPriceLine,
  type IPrimitivePaneRenderer,
  type IPrimitivePaneView,
  type ISeriesApi,
  type ISeriesPrimitive,
  type SeriesAttachedParameter,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { CoinMatch } from '@/lib/coin-extract';
import type { FoxyScalpSignal, FoxyZone } from './types';

/**
 * Series primitive that shades the confluence zones as horizontal
 * bands behind the candles — demand green, supply red. lightweight-
 * charts has no built-in rectangles, so we draw straight onto the
 * pane canvas at the series' price coordinates.
 */
class ZoneBandsPrimitive implements ISeriesPrimitive<Time> {
  private zones: FoxyZone[] = [];
  private param: SeriesAttachedParameter<Time> | null = null;

  attached(param: SeriesAttachedParameter<Time>): void {
    this.param = param;
  }

  detached(): void {
    this.param = null;
  }

  setZones(zones: FoxyZone[]): void {
    this.zones = zones;
    this.param?.requestUpdate();
  }

  paneViews(): readonly IPrimitivePaneView[] {
    const param = this.param;
    const zones = this.zones;
    const view: IPrimitivePaneView = {
      zOrder: () => 'bottom',
      renderer: (): IPrimitivePaneRenderer => ({
        draw: (target) => {
          if (!param) return;
          target.useMediaCoordinateSpace(({ context, mediaSize }) => {
            for (const z of zones) {
              const yTop = param.series.priceToCoordinate(z.high);
              const yBot = param.series.priceToCoordinate(z.low);
              if (yTop == null || yBot == null) continue;
              const top = Math.min(yTop, yBot);
              const h = Math.max(1, Math.abs(yBot - yTop));
              const demand = z.side === 'demand';
              context.fillStyle = demand
                ? 'rgba(16, 185, 129, 0.09)'
                : 'rgba(244, 63, 94, 0.09)';
              context.fillRect(0, top, mediaSize.width, h);
              context.fillStyle = demand
                ? 'rgba(16, 185, 129, 0.35)'
                : 'rgba(244, 63, 94, 0.35)';
              context.fillRect(0, top, mediaSize.width, 1);
              context.fillRect(0, top + h - 1, mediaSize.width, 1);
            }
          });
        },
      }),
    };
    return [view];
  }
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://bottomupapi-production.up.railway.app';

interface Candle {
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

const BARS = [
  { key: '1m', label: '1d' },
  { key: '5m', label: '5d' },
  { key: '15m', label: '15d' },
  { key: '1H', label: '1s' },
  { key: '4H', label: '4s' },
] as const;

/**
 * Live candlestick chart for the decision board. Candles come from the
 * same public OKX feed the scalp engine computes its levels from, so
 * the chart and the signal card always describe one market — and the
 * signal's entry/stop/TP levels are drawn straight onto the chart as
 * price lines. Polls ~2s; the last bar ticks live.
 */
export function LiveChartPanel({
  coin,
  signal,
  zones = null,
}: {
  coin: CoinMatch;
  signal: FoxyScalpSignal | null;
  zones?: FoxyZone[] | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const bandsRef = useRef<ZoneBandsPrimitive | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const lastTsRef = useRef<number>(0);
  const [bar, setBar] = useState<string>('5m');
  const [status, setStatus] = useState<'loading' | 'live' | 'error'>('loading');

  // Create the chart once per mount — light fintech surface to match
  // the board (white card, slate grid, emerald/rose candles).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#94a3b8',
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: '#f1f5f9' },
        horzLines: { color: '#f1f5f9' },
      },
      rightPriceScale: { borderColor: '#e2e8f0' },
      timeScale: {
        borderColor: '#e2e8f0',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        horzLine: { labelBackgroundColor: '#0f172a' },
        vertLine: { labelBackgroundColor: '#0f172a' },
      },
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#f43f5e',
      borderUpColor: '#10b981',
      borderDownColor: '#f43f5e',
      wickUpColor: '#34d399',
      wickDownColor: '#fb7185',
    });
    const bands = new ZoneBandsPrimitive();
    series.attachPrimitive(bands);
    chartRef.current = chart;
    seriesRef.current = series;
    bandsRef.current = bands;
    return () => {
      priceLinesRef.current = [];
      seriesRef.current = null;
      chartRef.current = null;
      bandsRef.current = null;
      chart.remove();
    };
  }, []);

  // Shade the confluence zones behind the candles. Cap at the 2
  // strongest per side — more reads as wallpaper, not information.
  useEffect(() => {
    const bands = bandsRef.current;
    if (!bands) return;
    const zs = zones ?? [];
    const top = (side: 'demand' | 'supply') =>
      zs
        .filter((z) => z.side === side)
        .sort((a, b) => b.score - a.score)
        .slice(0, 2);
    bands.setZones([...top('demand'), ...top('supply')]);
  }, [zones]);

  // Feed candles: full setData on coin/bar change, then live ticks via
  // update() so the viewer's zoom/scroll isn't reset every poll.
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    lastTsRef.current = 0;
    setStatus('loading');

    const toPoint = (c: Candle) => ({
      time: (c.ts / 1000) as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    });

    const loop = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/public/candles/${encodeURIComponent(coin.symbol)}?bar=${encodeURIComponent(bar)}&limit=180`,
          { cache: 'no-store' },
        );
        if (res.ok) {
          const json = (await res.json()) as { candles?: Candle[] } | null;
          const rows = json?.candles ?? [];
          const series = seriesRef.current;
          if (alive && series && rows.length > 0) {
            if (lastTsRef.current === 0) {
              // First frame for this coin/bar — full history + fit.
              series.setData(rows.map(toPoint));
              chartRef.current?.timeScale().fitContent();
            } else {
              // Live tick: update the current bar and append any new
              // ones. update() handles both (same-time = replace,
              // newer-time = append).
              for (const c of rows) {
                if (c.ts >= lastTsRef.current) series.update(toPoint(c));
              }
            }
            lastTsRef.current = rows[rows.length - 1]!.ts;
            setStatus('live');
          }
        } else if (alive && lastTsRef.current === 0) {
          setStatus('error');
        }
      } catch {
        if (alive && lastTsRef.current === 0) setStatus('error');
      }
      if (alive) timer = setTimeout(() => void loop(), 2000);
    };
    void loop();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [coin.symbol, bar]);

  // Draw the scalp signal's levels as price lines on the chart.
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    for (const line of priceLinesRef.current) series.removePriceLine(line);
    priceLinesRef.current = [];
    if (!signal || signal.direction === 'NONE') return;
    const mk = (
      price: number,
      color: string,
      title: string,
      style: LineStyle,
    ) =>
      series.createPriceLine({
        price,
        color,
        lineWidth: 1,
        lineStyle: style,
        axisLabelVisible: true,
        title,
      });
    const lines: IPriceLine[] = [];
    if (signal.entry != null)
      lines.push(mk(signal.entry, '#0f172a', 'Giriş', LineStyle.Solid));
    if (signal.stop != null)
      lines.push(mk(signal.stop, '#f43f5e', 'Stop', LineStyle.Dashed));
    signal.targets.forEach((t, i) => {
      lines.push(mk(t.price, '#10b981', `TP${i + 1}`, LineStyle.Dashed));
    });
    priceLinesRef.current = lines;
  }, [signal]);

  return (
    <section className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_2px_6px_rgba(16,24,40,.06),0_12px_32px_rgba(16,24,40,.08)]">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-[18px] py-3">
        <span className="text-[13px] font-extrabold tracking-tight text-slate-900">
          Canlı grafik · {coin.symbol}
        </span>
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10.5px] font-bold text-slate-500">
          OKX
        </span>
        <div className="ml-auto flex items-center gap-1">
          {BARS.map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={() => setBar(b.key)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold transition-colors ${
                bar === b.key
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
              }`}
            >
              {b.label}
            </button>
          ))}
          <span className="ml-2 flex items-center gap-1.5 text-[10.5px] font-bold text-slate-400">
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
      </div>
      <div ref={containerRef} className="h-[340px] w-full" />
      {signal && signal.direction !== 'NONE' ? (
        <div className="border-t border-slate-100 px-[18px] py-2 text-[10.5px] font-semibold text-slate-400">
          Çizgiler Foxy scalp sinyalinin seviyeleri — siyah giriş, kırmızı stop,
          yeşil hedefler
        </div>
      ) : null}
    </section>
  );
}
