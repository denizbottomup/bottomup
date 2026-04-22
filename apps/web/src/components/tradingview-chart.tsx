'use client';

import { useEffect, useRef } from 'react';

// Advanced Chart widget — covers every TradingView-listed market (crypto,
// stocks, forex, indices, futures, commodities), and the built-in symbol
// search lets the user jump between them without us wiring anything.
// `allow_symbol_change: true` is what enables the header search box.

type TVWidgetOpts = Record<string, unknown>;

declare global {
  interface Window {
    TradingView?: { widget: new (opts: TVWidgetOpts) => unknown };
  }
}

const SRC = 'https://s3.tradingview.com/tv.js';

let loader: Promise<void> | null = null;
function loadTv(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.TradingView) return Promise.resolve();
  if (loader) return loader;
  loader = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('tv.js failed')), { once: true });
      return;
    }
    const s = document.createElement('script');
    s.src = SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('tv.js failed'));
    document.body.appendChild(s);
  });
  return loader;
}

export function TradingViewChart({
  symbol = 'BINANCE:BTCUSDT',
  interval = '60',
}: { symbol?: string; interval?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    const host = containerRef.current;
    if (!host) return;

    const id = `tv-${Math.random().toString(36).slice(2, 10)}`;
    const inner = document.createElement('div');
    inner.id = id;
    inner.style.height = '100%';
    inner.style.width = '100%';
    host.appendChild(inner);

    let cancelled = false;
    void loadTv().then(() => {
      if (cancelled || !window.TradingView) return;
      new window.TradingView.widget({
        autosize: true,
        symbol,
        interval,
        timezone: 'Etc/UTC',
        theme: 'dark',
        style: '1',
        locale: 'tr',
        toolbar_bg: '#0b0b0f',
        enable_publishing: false,
        allow_symbol_change: true,
        withdateranges: true,
        hide_side_toolbar: false,
        details: true,
        hotlist: true,
        calendar: false,
        container_id: id,
      });
      initialized.current = true;
    });

    return () => {
      cancelled = true;
      if (host.contains(inner)) host.removeChild(inner);
      initialized.current = false;
    };
  }, [symbol, interval]);

  return <div ref={containerRef} className="h-full w-full" />;
}
