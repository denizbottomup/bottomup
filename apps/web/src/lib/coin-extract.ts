/**
 * Best-effort coin extraction from a free-form Foxy prompt.
 *
 * Phase 1 uses a static lookup table — covers the top symbols we
 * already track in BottomUp setups + the most common Turkish/English
 * spellings we see in marketing analytics.
 *
 * Returns the canonical TradingView ticker (e.g. `BINANCE:ETHUSDT`)
 * along with the bare symbol (`ETH`) and the slug Arkham/CoinGecko
 * use as their pricing id (`ethereum`). Returns null when nothing
 * matches; the caller can decide whether to fall back to BTC, surface
 * a "didn't catch that" message, or hand the prompt to Claude.
 *
 * Future: replace the table with a Claude-backed intent extractor
 * once the Foxy AI summary endpoint lands. Until then this keeps the
 * happy path zero-latency.
 */

export interface CoinMatch {
  symbol: string; // 'ETH'
  slug: string; // 'ethereum' (Arkham + CoinGecko pricing id)
  tvTicker: string; // 'BINANCE:ETHUSDT'
  display: string; // 'Ethereum'
}

interface Entry extends CoinMatch {
  /** Lowercased keywords that should resolve to this coin. */
  aliases: string[];
}

const TABLE: Entry[] = [
  {
    symbol: 'BTC',
    slug: 'bitcoin',
    tvTicker: 'BINANCE:BTCUSDT',
    display: 'Bitcoin',
    aliases: ['btc', 'bitcoin', 'btcusdt', 'btc-usdt'],
  },
  {
    symbol: 'ETH',
    slug: 'ethereum',
    tvTicker: 'BINANCE:ETHUSDT',
    display: 'Ethereum',
    aliases: ['eth', 'ethereum', 'eter', 'ether', 'ethusdt', 'eth-usdt'],
  },
  {
    symbol: 'SOL',
    slug: 'solana',
    tvTicker: 'BINANCE:SOLUSDT',
    display: 'Solana',
    aliases: ['sol', 'solana', 'solusdt'],
  },
  {
    symbol: 'BNB',
    slug: 'binancecoin',
    tvTicker: 'BINANCE:BNBUSDT',
    display: 'BNB',
    aliases: ['bnb', 'binance coin', 'bnbusdt'],
  },
  {
    symbol: 'XRP',
    slug: 'ripple',
    tvTicker: 'BINANCE:XRPUSDT',
    display: 'XRP',
    aliases: ['xrp', 'ripple', 'xrpusdt'],
  },
  {
    symbol: 'ADA',
    slug: 'cardano',
    tvTicker: 'BINANCE:ADAUSDT',
    display: 'Cardano',
    aliases: ['ada', 'cardano', 'adausdt'],
  },
  {
    symbol: 'DOGE',
    slug: 'dogecoin',
    tvTicker: 'BINANCE:DOGEUSDT',
    display: 'Dogecoin',
    aliases: ['doge', 'dogecoin', 'dogeusdt'],
  },
  {
    symbol: 'AVAX',
    slug: 'avalanche-2',
    tvTicker: 'BINANCE:AVAXUSDT',
    display: 'Avalanche',
    aliases: ['avax', 'avalanche', 'avaxusdt'],
  },
  {
    symbol: 'LINK',
    slug: 'chainlink',
    tvTicker: 'BINANCE:LINKUSDT',
    display: 'Chainlink',
    aliases: ['link', 'chainlink', 'linkusdt'],
  },
  {
    symbol: 'MATIC',
    slug: 'matic-network',
    tvTicker: 'BINANCE:MATICUSDT',
    display: 'Polygon',
    aliases: ['matic', 'polygon', 'maticusdt'],
  },
  {
    symbol: 'TRX',
    slug: 'tron',
    tvTicker: 'BINANCE:TRXUSDT',
    display: 'TRON',
    aliases: ['trx', 'tron', 'trxusdt'],
  },
  {
    symbol: 'TON',
    slug: 'the-open-network',
    tvTicker: 'BINANCE:TONUSDT',
    display: 'Toncoin',
    aliases: ['ton', 'toncoin', 'tonusdt'],
  },
];

const ALIAS_TO_ENTRY: Record<string, Entry> = (() => {
  const map: Record<string, Entry> = {};
  for (const entry of TABLE) {
    for (const alias of entry.aliases) {
      map[alias] = entry;
    }
  }
  return map;
})();

/**
 * Uppercase tokens that look like tickers but aren't coins — trading
 * verbs, fiat, and Foxy's own vocabulary. Keeps the generic fallback
 * from mistaking "AL" / "SAT" / "USDT" for a coin symbol.
 */
const TICKER_STOPWORDS = new Set([
  'AL',
  'SAT',
  'BEKLE',
  'BUY',
  'SELL',
  'HOLD',
  'AI',
  'TL',
  'USD',
  'USDT',
  'USDC',
  'FOXY',
  'RSI',
  'ATH',
  'ATL',
  'OK',
  'VS',
  'PNL',
  'API',
  'CEO',
  'NFT',
  'DEX',
  'CEX',
]);

/** Looks like a bare ticker the user typed in caps: `JTO`, `WIF`, `PEPE`. */
const TICKER_RE = /^[A-Z][A-Z0-9]{1,5}$/;

/**
 * Pull the first coin reference out of `prompt`. First pass: tokenize,
 * lowercase, and look each token up in the curated alias map — those
 * win and carry canonical display/slug/ticker. Second pass: if nothing
 * curated matched, accept the first ALL-CAPS ticker-shaped token (how
 * users naturally write a symbol — "JTO analizi yapar mısın?"), so any
 * coin reaches the backend instead of being rejected by a 12-row table.
 * The first hit wins — multi-coin prompts ("ETH vs BTC") resolve to
 * whichever is mentioned earlier, mirroring how users frame questions.
 */
export function extractCoin(prompt: string): CoinMatch | null {
  if (!prompt) return null;
  const splitter = /[\s,.!?;:()/\\\-_'"]+/;

  // Pass 1 — curated table (canonical display/slug/ticker).
  const lowered = prompt
    .toLowerCase()
    .split(splitter)
    .filter((t) => t.length > 0);
  for (const token of lowered) {
    const hit = ALIAS_TO_ENTRY[token];
    if (hit) {
      return {
        symbol: hit.symbol,
        slug: hit.slug,
        tvTicker: hit.tvTicker,
        display: hit.display,
      };
    }
  }

  // Pass 2 — generic ticker fallback for coins outside the table.
  const rawTokens = prompt.split(splitter).filter((t) => t.length > 0);
  for (const token of rawTokens) {
    if (TICKER_RE.test(token) && !TICKER_STOPWORDS.has(token)) {
      const symbol = token.toUpperCase();
      return {
        symbol,
        slug: symbol.toLowerCase(),
        tvTicker: `BINANCE:${symbol}USDT`,
        display: symbol,
      };
    }
  }

  return null;
}

/**
 * Build a `CoinMatch` from a bare symbol the backend resolved (against
 * the full OKX universe). Uses the curated table for a nice display
 * name / slug when known, otherwise a generic shape. Lets the UI render
 * a board for any coin the backend accepted, even ones the local table
 * never heard of.
 */
export function coinFromSymbol(symbol: string): CoinMatch {
  const up = symbol.toUpperCase().replace(/USDT$/i, '');
  const hit = TABLE.find((e) => e.symbol === up);
  if (hit) {
    return {
      symbol: hit.symbol,
      slug: hit.slug,
      tvTicker: hit.tvTicker,
      display: hit.display,
    };
  }
  return {
    symbol: up,
    slug: up.toLowerCase(),
    tvTicker: `BINANCE:${up}USDT`,
    display: up,
  };
}

/** All known coins, useful for hint chips. */
export const KNOWN_COINS: CoinMatch[] = TABLE.map(({ aliases: _a, ...rest }) => rest);
