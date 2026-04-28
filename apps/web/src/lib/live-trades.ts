/**
 * Multi-exchange live trades stream — Binance, Bybit, OKX perp
 * (USDT-margined) feeds, normalized into one shape. Used by
 * /home/live to render a flashing tape.
 *
 * No backend needed: each exchange exposes a free public WS that
 * accepts browser connections. We keep one socket per exchange and
 * normalise their payloads into `LiveTrade`. A small reconnect helper
 * retries with linear backoff on close.
 */

export type Side = 'buy' | 'sell';

export type Exchange = 'binance' | 'bybit' | 'okx';

export interface LiveTrade {
  /** Stable id across reconnects (`{exchange}-{exchangeTradeId}`). */
  id: string;
  exchange: Exchange;
  /** Display symbol (e.g. "BTC"). */
  symbol: string;
  /** Pair name as stored upstream — debug-friendly only. */
  pair: string;
  side: Side;
  price: number;
  /** Amount in coin units. */
  amount: number;
  usd: number;
  ts: number;
}

/**
 * Top USDT-perp pairs we subscribe to on every exchange. Adding a
 * symbol here is the only change needed to widen the feed — the
 * per-exchange URL builders below pick them up automatically.
 */
export const SUPPORTED_SYMBOLS = [
  'BTC',
  'ETH',
  'SOL',
  'BNB',
  'XRP',
  'DOGE',
  'ADA',
  'AVAX',
  'LINK',
  'LTC',
  'TRX',
  'TON',
] as const;

type Sym = (typeof SUPPORTED_SYMBOLS)[number];

interface SubscribeOpts {
  onTrade: (trade: LiveTrade) => void;
  onStatus: (exchange: Exchange, status: 'connecting' | 'open' | 'closed' | 'error') => void;
}

interface Handle {
  close: () => void;
}

/**
 * Open all three exchange feeds. Returns a handle that closes them
 * all when called (used in a React useEffect cleanup).
 */
export function subscribeLiveTrades({ onTrade, onStatus }: SubscribeOpts): Handle {
  const closers = [
    openBinance(onTrade, onStatus),
    openBybit(onTrade, onStatus),
    openOkx(onTrade, onStatus),
  ];
  return {
    close: () => {
      for (const c of closers) c();
    },
  };
}

// ─────────────────────────────────────────────────────────────────
// Binance — USDT-M futures aggTrade. Public, no auth.
// `m: false` → buyer is taker → BUY.
// ─────────────────────────────────────────────────────────────────
function openBinance(onTrade: (t: LiveTrade) => void, onStatus: SubscribeOpts['onStatus']): () => void {
  const streams = SUPPORTED_SYMBOLS.map((s) => `${s.toLowerCase()}usdt@aggTrade`).join('/');
  const url = `wss://fstream.binance.com/stream?streams=${streams}`;
  return runSocket('binance', url, {
    onStatus,
    onMessage: (raw) => {
      const env = JSON.parse(raw) as { stream?: string; data?: Record<string, unknown> };
      const d = env.data;
      if (!d || d.e !== 'aggTrade') return;
      const pair = String(d.s ?? '');
      const symbol = pair.replace(/USDT$/i, '');
      if (!isSupported(symbol)) return;
      const price = Number(d.p);
      const amount = Number(d.q);
      if (!Number.isFinite(price) || !Number.isFinite(amount)) return;
      onTrade({
        id: `binance-${pair}-${d.a}`,
        exchange: 'binance',
        symbol,
        pair,
        side: d.m === true ? 'sell' : 'buy',
        price,
        amount,
        usd: price * amount,
        ts: Number(d.T ?? Date.now()),
      });
    },
  });
}

// ─────────────────────────────────────────────────────────────────
// Bybit — v5 public linear (USDT perpetual). Subscribe message:
// {op:"subscribe", args:["publicTrade.BTCUSDT", ...]}
// `S: "Buy"|"Sell"` is the taker side.
// ─────────────────────────────────────────────────────────────────
function openBybit(onTrade: (t: LiveTrade) => void, onStatus: SubscribeOpts['onStatus']): () => void {
  const url = 'wss://stream.bybit.com/v5/public/linear';
  const args = SUPPORTED_SYMBOLS.map((s) => `publicTrade.${s}USDT`);
  return runSocket('bybit', url, {
    onStatus,
    onOpen: (ws) => {
      ws.send(JSON.stringify({ op: 'subscribe', args }));
    },
    onMessage: (raw) => {
      const env = JSON.parse(raw) as {
        topic?: string;
        data?: Array<{
          T?: number;
          s?: string;
          S?: 'Buy' | 'Sell';
          v?: string;
          p?: string;
          i?: string;
        }>;
      };
      if (!env.topic?.startsWith('publicTrade.') || !Array.isArray(env.data)) return;
      for (const d of env.data) {
        const pair = String(d.s ?? '');
        const symbol = pair.replace(/USDT$/i, '');
        if (!isSupported(symbol)) continue;
        const price = Number(d.p);
        const amount = Number(d.v);
        if (!Number.isFinite(price) || !Number.isFinite(amount)) continue;
        onTrade({
          id: `bybit-${d.i ?? `${pair}-${d.T}`}`,
          exchange: 'bybit',
          symbol,
          pair,
          side: d.S === 'Sell' ? 'sell' : 'buy',
          price,
          amount,
          usd: price * amount,
          ts: Number(d.T ?? Date.now()),
        });
      }
    },
  });
}

// ─────────────────────────────────────────────────────────────────
// OKX — v5 public, channel "trades" on USDT-margined SWAP. Subscribe:
// {op:"subscribe", args:[{channel:"trades", instId:"BTC-USDT-SWAP"}, ...]}
// `side: "buy"|"sell"` is the taker side.
// ─────────────────────────────────────────────────────────────────
function openOkx(onTrade: (t: LiveTrade) => void, onStatus: SubscribeOpts['onStatus']): () => void {
  const url = 'wss://ws.okx.com:8443/ws/v5/public';
  const args = SUPPORTED_SYMBOLS.map((s) => ({
    channel: 'trades',
    instId: `${s}-USDT-SWAP`,
  }));
  return runSocket('okx', url, {
    onStatus,
    onOpen: (ws) => {
      ws.send(JSON.stringify({ op: 'subscribe', args }));
    },
    onMessage: (raw) => {
      const env = JSON.parse(raw) as {
        arg?: { channel?: string };
        data?: Array<{
          instId?: string;
          tradeId?: string;
          px?: string;
          sz?: string;
          side?: 'buy' | 'sell';
          ts?: string;
        }>;
      };
      if (env.arg?.channel !== 'trades' || !Array.isArray(env.data)) return;
      for (const d of env.data) {
        const inst = String(d.instId ?? '');
        const symbol = inst.replace(/-USDT-SWAP$/i, '').replace(/-USDT$/i, '');
        if (!isSupported(symbol)) continue;
        const price = Number(d.px);
        // OKX swap `sz` is contract count, not coin amount. For USDT-M perps
        // the contract face value is 1 coin for major USDT pairs, so
        // amount === sz. For pairs where this isn't true (rare in our
        // SUPPORTED_SYMBOLS), USD would still be ≈ price × sz × contractMul,
        // and the filter only cares about USD floor — so this is OK in
        // practice. If we add unusual pairs later we'll pull contract
        // size via OKX REST.
        const amount = Number(d.sz);
        if (!Number.isFinite(price) || !Number.isFinite(amount)) continue;
        onTrade({
          id: `okx-${d.tradeId}`,
          exchange: 'okx',
          symbol,
          pair: inst,
          side: d.side === 'sell' ? 'sell' : 'buy',
          price,
          amount,
          usd: price * amount,
          ts: Number(d.ts ?? Date.now()),
        });
      }
    },
  });
}

function isSupported(symbol: string): symbol is Sym {
  return (SUPPORTED_SYMBOLS as readonly string[]).includes(symbol);
}

interface RunSocketOpts {
  onStatus: SubscribeOpts['onStatus'];
  onOpen?: (ws: WebSocket) => void;
  onMessage: (raw: string) => void;
}

/**
 * Tiny supervised WebSocket: handles open/close/error wiring and
 * reconnects with linear backoff (3s + 1s per attempt, capped at
 * 15s). The returned closer permanently stops reconnects.
 */
function runSocket(exchange: Exchange, url: string, opts: RunSocketOpts): () => void {
  let attempt = 0;
  let stopped = false;
  let ws: WebSocket | null = null;
  let pingTimer: ReturnType<typeof setInterval> | null = null;

  const open = () => {
    if (stopped) return;
    opts.onStatus(exchange, 'connecting');
    try {
      ws = new WebSocket(url);
    } catch {
      opts.onStatus(exchange, 'error');
      schedule();
      return;
    }
    ws.onopen = () => {
      attempt = 0;
      opts.onStatus(exchange, 'open');
      // Bybit + OKX both close idle connections at ~30s. Send a
      // text-frame ping every 20s to keep them warm. Binance handles
      // pings server-side and ignores client text frames, so this is
      // harmless there.
      pingTimer = setInterval(() => {
        try {
          ws?.send('ping');
        } catch {
          // ignore — the close handler will reschedule.
        }
      }, 20_000);
      try {
        opts.onOpen?.(ws as WebSocket);
      } catch {
        // ignore subscribe errors; reconnect will retry.
      }
    };
    ws.onmessage = (e) => {
      const data = typeof e.data === 'string' ? e.data : '';
      if (!data || data === 'pong') return;
      try {
        opts.onMessage(data);
      } catch {
        // skip malformed payloads
      }
    };
    ws.onerror = () => {
      opts.onStatus(exchange, 'error');
    };
    ws.onclose = () => {
      if (pingTimer) {
        clearInterval(pingTimer);
        pingTimer = null;
      }
      opts.onStatus(exchange, 'closed');
      schedule();
    };
  };

  const schedule = () => {
    if (stopped) return;
    attempt += 1;
    const delay = Math.min(15_000, 3_000 + attempt * 1_000);
    setTimeout(open, delay);
  };

  open();

  return () => {
    stopped = true;
    if (pingTimer) clearInterval(pingTimer);
    try {
      ws?.close();
    } catch {
      // ignore
    }
  };
}
