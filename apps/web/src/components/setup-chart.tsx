'use client';

import { useEffect, useRef } from 'react';
import {
  createChart,
  CandlestickSeries,
  type IChartApi,
  type ISeriesApi,
  type Time,
  type UTCTimestamp,
  type CandlestickData,
  LineStyle,
} from 'lightweight-charts';

interface Props {
  symbol: string;                 // e.g. BTCUSDT
  interval?: string;              // Binance interval; default 1h
  entry: number;
  entryHigh?: number | null;      // range upper
  stop?: number | null;
  tp1?: number | null;
  tp2?: number | null;
  tp3?: number | null;
  position?: 'long' | 'short' | null;
  height?: number;
}

interface BinanceKline {
  0: number;                      // open time (ms)
  1: string;                      // open
  2: string;                      // high
  3: string;                      // low
  4: string;                      // close
}

export function SetupChart({
  symbol,
  interval = '1h',
  entry,
  entryHigh,
  stop,
  tp1,
  tp2,
  tp3,
  position,
  height = 280,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const chart = createChart(host, {
      autoSize: true,
      layout: {
        background: { color: 'transparent' },
        textColor: '#8B9097',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.06)' },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.06)',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: { mode: 1 },
    });
    chartRef.current = chart;

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#34d399',
      downColor: '#f87171',
      borderUpColor: '#34d399',
      borderDownColor: '#f87171',
      wickUpColor: '#34d399',
      wickDownColor: '#f87171',
    });
    seriesRef.current = series;

    const markerPrice = (
      price: number | null | undefined,
      color: string,
      title: string,
      dashed = false,
    ): void => {
      if (price == null || !Number.isFinite(price)) return;
      series.createPriceLine({
        price,
        color,
        lineWidth: 1,
        lineStyle: dashed ? LineStyle.Dashed : LineStyle.Solid,
        axisLabelVisible: true,
        title,
      });
    };

    markerPrice(entry, position === 'short' ? '#fb923c' : '#60a5fa', 'Giriş');
    if (entryHigh != null && entryHigh !== entry) {
      markerPrice(entryHigh, position === 'short' ? '#fb923c' : '#60a5fa', 'Giriş ↑', true);
    }
    markerPrice(stop, '#f87171', 'Stop');
    markerPrice(tp1, '#34d399', 'TP1');
    markerPrice(tp2, '#34d399', 'TP2', true);
    markerPrice(tp3, '#34d399', 'TP3', true);

    let cancelled = false;
    (async () => {
      try {
        const url = `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${interval}&limit=240`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`binance ${res.status}`);
        const raw = (await res.json()) as BinanceKline[];
        if (cancelled) return;
        const data: CandlestickData<Time>[] = raw.map((k) => ({
          time: (Math.floor(k[0] / 1000) as UTCTimestamp),
          open: Number(k[1]),
          high: Number(k[2]),
          low: Number(k[3]),
          close: Number(k[4]),
        }));
        series.setData(data);
        chart.timeScale().fitContent();
      } catch (err) {
        // Candle fetch failed — keep the price lines so the user still
        // sees entry/stop/TP levels in context of price-axis.
        // eslint-disable-next-line no-console
        console.warn('setup-chart klines fetch failed', err);
      }
    })();

    return () => {
      cancelled = true;
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [symbol, interval, entry, entryHigh, stop, tp1, tp2, tp3, position]);

  return <div ref={hostRef} style={{ height }} className="w-full" />;
}
