'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  subscribeLiveTrades,
  type Exchange,
  type LiveTrade,
  type Market,
} from '@/lib/live-trades';

const THRESHOLDS = [50_000, 100_000, 250_000, 500_000, 1_000_000] as const;
type Threshold = (typeof THRESHOLDS)[number];
const DEFAULT_THRESHOLD: Threshold = 100_000;

const MAX_ROWS = 80;

type Status = 'connecting' | 'open' | 'closed' | 'error';

type MarketFilter = 'both' | Market;

const ALL_EXCHANGES: Exchange[] = ['binance', 'bybit', 'okx', 'coinbase'];

const EXCHANGE_LABEL: Record<Exchange, string> = {
  binance: 'Binance',
  bybit: 'Bybit',
  okx: 'OKX',
  coinbase: 'Coinbase',
};

/**
 * Coinbase doesn't list futures — every Coinbase row is spot. Hide
 * the chip when the market filter is set to futures-only so the
 * user isn't confused by an "off / no-data" pill they can't fix.
 */
function exchangeAvailableInMarket(ex: Exchange, m: MarketFilter): boolean {
  if (m === 'futures' && ex === 'coinbase') return false;
  return true;
}

export default function LivePage() {
  const [threshold, setThreshold] = useState<Threshold>(DEFAULT_THRESHOLD);
  const [trades, setTrades] = useState<LiveTrade[]>([]);
  const [marketFilter, setMarketFilter] = useState<MarketFilter>('both');
  const [enabledExchanges, setEnabledExchanges] = useState<Set<Exchange>>(
    new Set(ALL_EXCHANGES),
  );
  const [status, setStatus] = useState<Record<string, Status>>({});

  // Filter state lives in refs so the WS callback doesn't have to be
  // re-created on every change — that would tear down + reopen all
  // seven sockets every click.
  const thresholdRef = useRef<Threshold>(DEFAULT_THRESHOLD);
  thresholdRef.current = threshold;
  const marketRef = useRef<MarketFilter>('both');
  marketRef.current = marketFilter;
  const exchangesRef = useRef<Set<Exchange>>(enabledExchanges);
  exchangesRef.current = enabledExchanges;

  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const handle = subscribeLiveTrades({
      onTrade: (t) => {
        if (t.usd < thresholdRef.current) return;
        if (
          marketRef.current !== 'both' &&
          marketRef.current !== t.market
        ) {
          return;
        }
        if (!exchangesRef.current.has(t.exchange)) return;
        if (seenRef.current.has(t.id)) return;
        seenRef.current.add(t.id);
        if (seenRef.current.size > 800) {
          const arr = Array.from(seenRef.current);
          seenRef.current = new Set(arr.slice(arr.length - 400));
        }
        setTrades((prev) => {
          const next = [t, ...prev];
          return next.length > MAX_ROWS ? next.slice(0, MAX_ROWS) : next;
        });
      },
      onStatus: (feed, s) => {
        const key = `${feed.exchange}-${feed.market}`;
        setStatus((prev) => ({ ...prev, [key]: s }));
      },
    });
    return () => {
      handle.close();
    };
  }, []);

  const totalUsdLastMin = useMemo(() => {
    const cutoff = Date.now() - 60_000;
    return trades.filter((t) => t.ts >= cutoff).reduce((sum, t) => sum + t.usd, 0);
  }, [trades]);

  function toggleExchange(ex: Exchange) {
    setEnabledExchanges((prev) => {
      const next = new Set(prev);
      if (next.has(ex)) {
        // Don't let the user disable everything — the page would just
        // stand still. Keep at least one venue.
        if (next.size === 1) return prev;
        next.delete(ex);
      } else {
        next.add(ex);
      }
      return next;
    });
    // Drop any trades from the now-hidden exchange so the table
    // doesn't show stale rows that are no longer eligible.
    setTrades((prev) => prev.filter((t) => t.exchange !== ex || enabledExchanges.has(ex)));
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border px-4 py-4 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="mono-label !text-emerald-300 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Live trades
            </div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight md:text-3xl">
              Major exchanges · Spot + Perp
            </h1>
            <div className="mt-1 text-[12px] text-fg-dim">
              Binance · Bybit · OKX · Coinbase · 12 pair (spot) / 12 pair (perp)
            </div>
          </div>
          <span className="text-[11px] text-fg-dim font-mono">
            son 60s · {formatUsdShort(totalUsdLastMin)} hacim
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-fg-dim">
            Market
          </span>
          {(['both', 'spot', 'futures'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMarketFilter(m)}
              className={`rounded-full px-3 py-1 text-xs font-mono transition ${
                marketFilter === m
                  ? 'bg-fg text-black'
                  : 'border border-white/15 text-fg hover:border-white/35'
              }`}
            >
              {m === 'both' ? 'Tümü' : m === 'spot' ? 'Spot' : 'Futures'}
            </button>
          ))}

          <span className="ml-3 text-[11px] uppercase tracking-wider text-fg-dim">
            Exchange
          </span>
          {ALL_EXCHANGES.filter((ex) =>
            exchangeAvailableInMarket(ex, marketFilter),
          ).map((ex) => {
            const active = enabledExchanges.has(ex);
            // Look up status — for "futures only", show futures status;
            // for "spot only", show spot status; for "both", treat as
            // open if either is open. Coinbase has only spot.
            const feedStatuses: Status[] = (['spot', 'futures'] as const)
              .filter(
                (m) =>
                  marketFilter === 'both' ||
                  marketFilter === m,
              )
              .filter((m) => !(ex === 'coinbase' && m === 'futures'))
              .map((m) => status[`${ex}-${m}`] ?? 'connecting');
            const dot = feedStatuses.includes('open')
              ? 'bg-emerald-400'
              : feedStatuses.includes('connecting')
                ? 'bg-amber-300'
                : 'bg-rose-400';
            return (
              <button
                key={ex}
                onClick={() => toggleExchange(ex)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-mono transition ${
                  active
                    ? 'bg-white/[0.08] text-fg ring-1 ring-white/20'
                    : 'border border-white/10 text-fg-dim hover:text-fg hover:border-white/25'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                {EXCHANGE_LABEL[ex]}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-fg-dim">
            Min size
          </span>
          {THRESHOLDS.map((v) => {
            const active = v === threshold;
            return (
              <button
                key={v}
                onClick={() => setThreshold(v)}
                className={`rounded-full px-3 py-1 text-xs font-mono transition ${
                  active
                    ? 'bg-brand text-black'
                    : 'border border-white/15 text-fg hover:border-white/35'
                }`}
              >
                ${formatThresholdShort(v)}
              </button>
            );
          })}
        </div>
      </header>

      <div className="grid grid-cols-12 gap-2 border-b border-border bg-bg-card/60 px-4 py-2 text-[10px] uppercase tracking-wider text-fg-dim md:px-8">
        <div className="col-span-1">Side</div>
        <div className="col-span-2">Size</div>
        <div className="col-span-1">Symbol</div>
        <div className="col-span-2 text-right">Amount</div>
        <div className="col-span-2 text-right">Price</div>
        <div className="col-span-3">Venue</div>
        <div className="col-span-1 text-right">Time</div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {trades.length === 0 ? (
          <div className="flex h-[280px] items-center justify-center text-sm text-fg-muted">
            ${formatThresholdShort(threshold)}+ büyüklüğünde işlem
            bekleniyor…
          </div>
        ) : (
          trades.map((t) => <TradeRow key={t.id} t={t} />)
        )}
      </div>
    </div>
  );
}

function TradeRow({ t }: { t: LiveTrade }) {
  const tier: 's' | 'm' | 'l' | 'xl' =
    t.usd >= 1_000_000
      ? 'xl'
      : t.usd >= 500_000
        ? 'l'
        : t.usd >= 250_000
          ? 'm'
          : 's';

  const flashClass =
    t.side === 'buy'
      ? tier === 'xl' || tier === 'l'
        ? 'flash-buy-hard'
        : 'flash-buy'
      : tier === 'xl' || tier === 'l'
        ? 'flash-sell-hard'
        : 'flash-sell';

  const sideTone =
    t.side === 'buy'
      ? 'bg-emerald-400/15 text-emerald-300 ring-emerald-400/40'
      : 'bg-rose-400/15 text-rose-300 ring-rose-400/40';

  const priceTone = t.side === 'buy' ? 'text-emerald-300' : 'text-rose-300';

  const sizeBold =
    tier === 'xl'
      ? 'text-base font-extrabold'
      : tier === 'l'
        ? 'text-sm font-bold'
        : 'text-xs font-semibold';

  const time = new Date(t.ts).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div
      className={`grid grid-cols-12 items-center gap-2 px-4 py-2 font-mono text-[12px] border-b border-border/50 md:px-8 ${flashClass}`}
    >
      <div className="col-span-1">
        <span
          className={`inline-block rounded px-1.5 py-0.5 text-[10px] uppercase ring-1 ${sideTone}`}
        >
          {t.side === 'buy' ? '↑ BUY' : '↓ SELL'}
        </span>
      </div>
      <div className={`col-span-2 ${sizeBold} text-fg`}>
        {formatUsdShort(t.usd)}
      </div>
      <div className="col-span-1 font-semibold text-fg">{t.symbol}</div>
      <div className="col-span-2 text-right text-fg">{formatAmount(t.amount)}</div>
      <div className={`col-span-2 text-right ${priceTone}`}>
        {formatPrice(t.price)}
      </div>
      <div className="col-span-3 flex items-center gap-2 text-fg-dim text-[10px] uppercase">
        <span className="text-fg">{EXCHANGE_LABEL[t.exchange]}</span>
        <span
          className={`rounded px-1.5 py-0.5 ring-1 ${
            t.market === 'spot'
              ? 'bg-sky-400/10 text-sky-300 ring-sky-400/30'
              : 'bg-violet-400/10 text-violet-300 ring-violet-400/30'
          }`}
        >
          {t.market === 'spot' ? 'spot' : 'perp'}
        </span>
      </div>
      <div className="col-span-1 text-right text-fg-dim">{time}</div>
    </div>
  );
}

function formatThresholdShort(n: number): string {
  if (n >= 1_000_000) return `${n / 1_000_000}M`;
  if (n >= 1_000) return `${n / 1_000}K`;
  return String(n);
}

function formatUsdShort(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(abs / 1_000).toFixed(1)}K`;
  return `$${abs.toFixed(0)}`;
}

function formatPrice(n: number): string {
  if (n >= 1000) return n.toFixed(2);
  if (n >= 1) return n.toFixed(4);
  if (n >= 0.01) return n.toFixed(5);
  return n.toFixed(8);
}

function formatAmount(n: number): string {
  if (n >= 1000) return n.toFixed(0);
  if (n >= 1) return n.toFixed(3);
  if (n >= 0.001) return n.toFixed(5);
  return n.toFixed(8);
}
