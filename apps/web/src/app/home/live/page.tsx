'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  subscribeLiveTrades,
  type Exchange,
  type LiveTrade,
} from '@/lib/live-trades';

const THRESHOLDS = [50_000, 100_000, 250_000, 500_000, 1_000_000] as const;
type Threshold = (typeof THRESHOLDS)[number];
const DEFAULT_THRESHOLD: Threshold = 100_000;

const MAX_ROWS = 80;

type Status = 'connecting' | 'open' | 'closed' | 'error';

export default function LivePage() {
  const [threshold, setThreshold] = useState<Threshold>(DEFAULT_THRESHOLD);
  const [trades, setTrades] = useState<LiveTrade[]>([]);
  const [status, setStatus] = useState<Record<Exchange, Status>>({
    binance: 'connecting',
    bybit: 'connecting',
    okx: 'connecting',
  });

  // Threshold + dedupe live in refs so the WS callback doesn't
  // re-subscribe every render. The callback is stable; the trades
  // array still re-renders via setTrades.
  const thresholdRef = useRef<Threshold>(DEFAULT_THRESHOLD);
  thresholdRef.current = threshold;

  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const handle = subscribeLiveTrades({
      onTrade: (t) => {
        if (t.usd < thresholdRef.current) return;
        // Dedupe across exchanges — Bybit sometimes ships the same
        // trade in both `snapshot` and `delta` waves. The id
        // includes the exchange already.
        if (seenRef.current.has(t.id)) return;
        seenRef.current.add(t.id);
        if (seenRef.current.size > 500) {
          // Trim the dedupe set so it doesn't grow without bound. We
          // keep ~250 most recent ids — much more than MAX_ROWS so a
          // stale duplicate ~30s in the past is still caught.
          const arr = Array.from(seenRef.current);
          seenRef.current = new Set(arr.slice(arr.length - 250));
        }
        setTrades((prev) => {
          const next = [t, ...prev];
          return next.length > MAX_ROWS ? next.slice(0, MAX_ROWS) : next;
        });
      },
      onStatus: (exchange, s) => {
        setStatus((prev) => ({ ...prev, [exchange]: s }));
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
              Major exchanges · USDT perp
            </h1>
            <div className="mt-1 text-[12px] text-fg-dim">
              Binance fstream · Bybit linear · OKX swap · 12 pair
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ExchangeBadge name="Binance" status={status.binance} />
            <ExchangeBadge name="Bybit" status={status.bybit} />
            <ExchangeBadge name="OKX" status={status.okx} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
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
          <span className="ml-auto text-[11px] text-fg-dim font-mono">
            son 60s · {formatUsdShort(totalUsdLastMin)} hacim
          </span>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-2 border-b border-border bg-bg-card/60 px-4 py-2 text-[10px] uppercase tracking-wider text-fg-dim md:px-8">
        <div className="col-span-1">Side</div>
        <div className="col-span-2">Size</div>
        <div className="col-span-1">Symbol</div>
        <div className="col-span-2 text-right">Amount</div>
        <div className="col-span-3 text-right">Price</div>
        <div className="col-span-2">Exchange</div>
        <div className="col-span-1 text-right">Time</div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {trades.length === 0 ? (
          <div className="flex h-[280px] items-center justify-center text-sm text-fg-muted">
            ${formatThresholdShort(threshold)}+ büyüklüğünde işlem
            bekleniyor… (Tezgah açık, balıklar büyüdükçe akacak)
          </div>
        ) : (
          trades.map((t) => <TradeRow key={t.id} t={t} />)
        )}
      </div>
    </div>
  );
}

function TradeRow({ t }: { t: LiveTrade }) {
  // Tier the flash + emphasis by USD size. Bigger fish, longer
  // flash + brighter inline highlight + bolder font.
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

  const amountFmt = formatAmount(t.amount);
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
      <div className="col-span-2 text-right text-fg">{amountFmt}</div>
      <div className={`col-span-3 text-right ${priceTone}`}>
        {formatPrice(t.price)}
      </div>
      <div className="col-span-2 text-fg-dim uppercase text-[10px]">
        {t.exchange}
      </div>
      <div className="col-span-1 text-right text-fg-dim">{time}</div>
    </div>
  );
}

function ExchangeBadge({ name, status }: { name: string; status: Status }) {
  const colour =
    status === 'open'
      ? 'bg-emerald-400'
      : status === 'connecting'
        ? 'bg-amber-300'
        : 'bg-rose-400';
  const label =
    status === 'open'
      ? 'live'
      : status === 'connecting'
        ? 'connecting…'
        : status === 'error'
          ? 'error'
          : 'closed';
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2 py-1 text-[10px] font-mono">
      <span className={`h-1.5 w-1.5 rounded-full ${colour}`} />
      <span className="text-fg">{name}</span>
      <span className="text-fg-dim">{label}</span>
    </span>
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
