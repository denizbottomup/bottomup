'use client';

import type { CoinMatch } from '@/lib/coin-extract';

/**
 * TradingView "advanced chart" embed via the public widget URL — no
 * API key, no script tag, dark theme pinned. We re-key the iframe on
 * the symbol change so the chart actually swaps when the user runs a
 * second query, instead of TV remembering the previous symbol.
 */
export function FoxyTradingViewCard({ coin }: { coin: CoinMatch }) {
  const src = `https://www.tradingview.com/widgetembed/?symbol=${encodeURIComponent(
    coin.tvTicker,
  )}&interval=60&theme=dark&style=1&timezone=Etc%2FUTC&hide_side_toolbar=0&allow_symbol_change=1&saveimage=0`;

  return (
    <section className="rounded-2xl border border-border bg-bg-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="mono-label !text-fg-dim">
          TradingView · {coin.symbol}/USDT
        </div>
        <a
          href={`https://www.tradingview.com/symbols/${coin.tvTicker.replace(
            ':',
            '-',
          )}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-fg-muted hover:text-fg transition"
        >
          TradingView'da aç ↗
        </a>
      </div>
      <iframe
        key={coin.tvTicker}
        src={src}
        title={`${coin.symbol} TradingView`}
        className="block h-[480px] w-full"
        loading="lazy"
        allow="fullscreen"
      />
    </section>
  );
}
