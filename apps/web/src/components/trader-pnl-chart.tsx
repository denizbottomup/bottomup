'use client';

import { useEffect, useRef } from 'react';
import {
  AreaSeries,
  createChart,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type AreaData,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';

export interface PnlPoint {
  date: string;       // YYYY-MM-DD
  cumulative: number;
  pnl: number;
  trades: number;
}

/**
 * Cumulative PnL area chart for a trader's profile page. Uses the same
 * lightweight-charts stack as SetupChart so there's only one charting
 * library in the bundle. We draw an area series to visually emphasise
 * "is this trader in profit over time", plus a faint zero-line overlay
 * so losing streaks are obvious.
 */
export function TraderPnlChart({
  points,
  height = 220,
}: {
  points: PnlPoint[];
  height?: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);

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
        timeVisible: false,
        secondsVisible: false,
      },
      crosshair: { mode: 1 },
    });
    chartRef.current = chart;

    const last = points[points.length - 1]?.cumulative ?? 0;
    const colour = last >= 0 ? '#34d399' : '#f87171';

    const series = chart.addSeries(AreaSeries, {
      lineColor: colour,
      topColor: `${colour}55`,
      bottomColor: `${colour}05`,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
    });
    seriesRef.current = series;

    const data: AreaData<Time>[] = points.map((p) => ({
      time: (Math.floor(new Date(`${p.date}T12:00:00Z`).getTime() / 1000) as UTCTimestamp),
      value: p.cumulative,
    }));
    series.setData(data);

    series.createPriceLine({
      price: 0,
      color: 'rgba(255,255,255,0.15)',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: false,
      title: '',
    });
    chart.timeScale().fitContent();

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [points]);

  if (points.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex w-full items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] text-xs text-fg-dim"
      >
        PnL verisi yok
      </div>
    );
  }

  return <div ref={hostRef} style={{ height }} className="w-full" />;
}
