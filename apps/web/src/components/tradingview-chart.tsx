'use client';

import { useEffect, useRef } from 'react';

// Advanced Chart embed (external-embedding script).
// Documented at https://www.tradingview.com/widget-docs/widgets/charts/advanced-chart/
//
// The older `tv.js` globals-based path occasionally lands an empty iframe
// on some domains (the iframe mounts but the chart surface never paints);
// the script-tag embed below is the officially recommended one and loads
// the widget from its config via a sibling <script> read by TradingView's
// loader. That loader takes care of its own mount and visibility lifecycle.

const SCRIPT_SRC = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';

export function TradingViewChart({
  symbol = 'BINANCE:BTCUSDT',
  interval = '60',
}: { symbol?: string; interval?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.innerHTML = '';

    const widget = document.createElement('div');
    widget.className = 'tradingview-widget-container__widget';
    widget.style.height = '100%';
    widget.style.width = '100%';
    host.appendChild(widget);

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = SCRIPT_SRC;
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval,
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'tr',
      allow_symbol_change: true,
      support_host: 'https://www.tradingview.com',
    });
    host.appendChild(script);

    return () => {
      host.innerHTML = '';
    };
  }, [symbol, interval]);

  return (
    <div className="tradingview-widget-container h-full w-full" ref={hostRef} />
  );
}
