/**
 * Multi-exchange live trades stream — Binance, Bybit, OKX, Coinbase.
 * Both spot and USDT-margined perpetual feeds, normalised into one
 * shape. Used by /home/live to render a flashing tape with
 * per-exchange and per-market filtering.
 *
 * No backend needed: each exchange exposes a free public WebSocket
 * that accepts browser connections. We keep one socket per
 * (exchange × market) and normalise their payloads into LiveTrade.
 * A small reconnect helper retries with linear backoff on close.
 */

export type Side = 'buy' | 'sell';

export type Exchange = 'binance' | 'bybit' | 'okx' | 'coinbase';

export type Market = 'spot' | 'futures';

/** Stable feed identity — one supervised socket per pair of these. */
export interface FeedKey {
  exchange: Exchange;
  market: Market;
}

export interface LiveTrade {
  /** Stable id across reconnects (`{exchange}-{market}-{tradeId}`). */
  id: string;
  exchange: Exchange;
  market: Market;
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
 * Top symbols available across most major exchanges. Each opener
 * prunes this list down to whatever its venue actually lists (e.g.
 * Coinbase has no BNB/TRX/TON, so they're skipped there).
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

/** Coinbase doesn't list BNB / TRX / TON; subscribe to the rest. */
const COINBASE_SYMBOLS: readonly Sym[] = [
  'BTC',
  'ETH',
  'SOL',
  'XRP',
  'DOGE',
  'ADA',
  'AVAX',
  'LINK',
  'LTC',
];

interface SubscribeOpts {
  onTrade: (trade: LiveTrade) => void;
  onStatus: (
    feed: FeedKey,
    status: 'connecting' | 'open' | 'closed' | 'error',
  ) => void;
}

interface Handle {
  close: () => void;
}

/**
 * Open every (exchange, market) feed. Returns a handle that closes
 * them all when called (used in a React useEffect cleanup).
 */
export function subscribeLiveTrades({ onTrade, onStatus }: SubscribeOpts): Handle {
  const closers = [
    openBinance(onTrade, onStatus, 'futures'),
    openBinance(onTrade, onStatus, 'spot'),
    openBybit(onTrade, onStatus, 'futures'),
    openBybit(onTrade, onStatus, 'spot'),
    openOkx(onTrade, onStatus, 'futures'),
    openOkx(onTrade, onStatus, 'spot'),
    openCoinbase(onTrade, onStatus),
  ];
  return {
    close: () => {
      for (const c of closers) c();
    },
  };
}

// ─────────────────────────────────────────────────────────────────
// Binance — aggTrade. fstream for USDT-M futures, stream for spot.
// `m: false` → buyer is taker → BUY.
// ─────────────────────────────────────────────────────────────────
function openBinance(
  onTrade: (t: LiveTrade) => void,
  onStatus: SubscribeOpts['onStatus'],
  market: Market,
): () => void {
  const streams = SUPPORTED_SYMBOLS.map((s) => `${s.toLowerCase()}usdt@aggTrade`).join('/');
  const host =
    market === 'futures'
      ? 'fstream.binance.com'
      : 'stream.binance.com:9443';
  const url = `wss://${host}/stream?streams=${streams}`;
  return runSocket({ exchange: 'binance', market }, url, {
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
        id: `binance-${market}-${pair}-${d.a}`,
        exchange: 'binance',
        market,
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
// Bybit — v5 public. /linear for USDT perpetual, /spot for spot.
// `S: "Buy"|"Sell"` is the taker side.
// ─────────────────────────────────────────────────────────────────
function openBybit(
  onTrade: (t: LiveTrade) => void,
  onStatus: SubscribeOpts['onStatus'],
  market: Market,
): () => void {
  const url =
    market === 'futures'
      ? 'wss://stream.bybit.com/v5/public/linear'
      : 'wss://stream.bybit.com/v5/public/spot';
  const args = SUPPORTED_SYMBOLS.map((s) => `publicTrade.${s}USDT`);
  return runSocket({ exchange: 'bybit', market }, url, {
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
          id: `bybit-${market}-${d.i ?? `${pair}-${d.T}`}`,
          exchange: 'bybit',
          market,
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
// OKX — v5 public. Same WS for both markets, instId differs:
// `BTC-USDT-SWAP` (perp) vs `BTC-USDT` (spot).
// ─────────────────────────────────────────────────────────────────
function openOkx(
  onTrade: (t: LiveTrade) => void,
  onStatus: SubscribeOpts['onStatus'],
  market: Market,
): () => void {
  const url = 'wss://ws.okx.com:8443/ws/v5/public';
  const args = SUPPORTED_SYMBOLS.map((s) => ({
    channel: 'trades',
    instId: market === 'futures' ? `${s}-USDT-SWAP` : `${s}-USDT`,
  }));
  return runSocket({ exchange: 'okx', market }, url, {
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
        // Mismatch guard: a single OKX socket *could* deliver both
        // markets if subscriptions ever overlap — only emit rows that
        // match this opener's market so callers still see the right
        // tag.
        const isSwap = inst.endsWith('-SWAP');
        if ((market === 'futures') !== isSwap) continue;
        const symbol = inst
          .replace(/-USDT-SWAP$/i, '')
          .replace(/-USDT$/i, '');
        if (!isSupported(symbol)) continue;
        const price = Number(d.px);
        // OKX swap `sz` is contract count, not coin amount. For
        // USDT-M perps the contract face value is 1 coin for major
        // USDT pairs, so amount === sz. Spot `sz` is always the
        // coin amount directly.
        const amount = Number(d.sz);
        if (!Number.isFinite(price) || !Number.isFinite(amount)) continue;
        onTrade({
          id: `okx-${market}-${d.tradeId}`,
          exchange: 'okx',
          market,
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

// ─────────────────────────────────────────────────────────────────
// Coinbase Exchange — public matches channel. Spot only (USD-quoted).
// `side: "buy"|"sell"` is the taker side already.
// ─────────────────────────────────────────────────────────────────
function openCoinbase(
  onTrade: (t: LiveTrade) => void,
  onStatus: SubscribeOpts['onStatus'],
): () => void {
  const url = 'wss://ws-feed.exchange.coinbase.com';
  const product_ids = COINBASE_SYMBOLS.map((s) => `${s}-USD`);
  return runSocket({ exchange: 'coinbase', market: 'spot' }, url, {
    onStatus,
    onOpen: (ws) => {
      ws.send(
        JSON.stringify({
          type: 'subscribe',
          product_ids,
          channels: [{ name: 'matches' }],
        }),
      );
    },
    onMessage: (raw) => {
      const env = JSON.parse(raw) as {
        type?: string;
        side?: 'buy' | 'sell';
        size?: string;
        price?: string;
        product_id?: string;
        time?: string;
        trade_id?: number | string;
      };
      // Coinbase emits `match` for live trades and `last_match` once
      // on subscribe (the immediately-previous trade). Treat both
      // identically — the dedupe set in the page guards against
      // double-counting on reconnect.
      if (env.type !== 'match' && env.type !== 'last_match') return;
      const product = String(env.product_id ?? '');
      const symbol = product.replace(/-USD$/i, '');
      if (!isSupported(symbol)) return;
      const price = Number(env.price);
      const amount = Number(env.size);
      if (!Number.isFinite(price) || !Number.isFinite(amount)) return;
      const ts = env.time ? Date.parse(env.time) : Date.now();
      onTrade({
        id: `coinbase-spot-${env.trade_id}`,
        exchange: 'coinbase',
        market: 'spot',
        symbol,
        pair: product,
        side: env.side === 'sell' ? 'sell' : 'buy',
        price,
        amount,
        usd: price * amount,
        ts,
      });
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
function runSocket(feed: FeedKey, url: string, opts: RunSocketOpts): () => void {
  let attempt = 0;
  let stopped = false;
  let ws: WebSocket | null = null;
  let pingTimer: ReturnType<typeof setInterval> | null = null;

  const open = () => {
    if (stopped) return;
    opts.onStatus(feed, 'connecting');
    try {
      ws = new WebSocket(url);
    } catch {
      opts.onStatus(feed, 'error');
      schedule();
      return;
    }
    ws.onopen = () => {
      attempt = 0;
      opts.onStatus(feed, 'open');
      // Bybit + OKX both close idle connections at ~30s. Send a
      // text-frame ping every 20s to keep them warm. Binance and
      // Coinbase ignore client text frames here, so this is harmless.
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
      opts.onStatus(feed, 'error');
    };
    ws.onclose = () => {
      if (pingTimer) {
        clearInterval(pingTimer);
        pingTimer = null;
      }
      opts.onStatus(feed, 'closed');
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
