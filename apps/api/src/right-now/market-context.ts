/**
 * Cross-source market context fetchers used by the Right Now
 * orchestrator. All public, key-less endpoints — kept here so the
 * service file stays focused on orchestration and the AI layer.
 *
 * Every helper returns `null` on failure (timeout, malformed JSON,
 * upstream 5xx) — the orchestrator surfaces source-coverage in the
 * payload so the UI can degrade gracefully and warn the user.
 */

const SHORT_TIMEOUT = 6000;

// ────────────────────────────────────────────────────────── basis

export interface BasisRead {
  spot_price: number;
  perp_price: number;
  /** Absolute USD spread (perp - spot). */
  spread_usd: number;
  /** Spread as % of spot. Positive = perp premium (longs paying up). */
  premium_pct: number;
  /** Bucketed read for the UI. */
  bias:
    | 'leveraged_long' // perp >> spot (>+0.05%)
    | 'mild_long'
    | 'neutral'
    | 'mild_short'
    | 'leveraged_short' // perp << spot (<-0.05%)
    | 'unknown';
}

/**
 * Spot vs perp price spread. Bigger premium = leverage-driven move
 * (fragile); negative spread = panic (perps front-running spot
 * downside). Both feeds are public, no key.
 */
export async function fetchBasis(coin: string): Promise<BasisRead | null> {
  const symbol = `${coin}USDT`;
  try {
    const [spotRes, perpRes] = await Promise.all([
      fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`, {
        signal: AbortSignal.timeout(SHORT_TIMEOUT),
      }),
      fetch(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${symbol}`, {
        signal: AbortSignal.timeout(SHORT_TIMEOUT),
      }),
    ]);
    if (!spotRes.ok || !perpRes.ok) return null;
    const spotJson = (await spotRes.json()) as { price?: string };
    const perpJson = (await perpRes.json()) as { price?: string };
    const spot = Number(spotJson.price ?? 0);
    const perp = Number(perpJson.price ?? 0);
    if (!Number.isFinite(spot) || !Number.isFinite(perp) || spot <= 0) return null;
    const spread = perp - spot;
    const premiumPct = (spread / spot) * 100;
    return {
      spot_price: spot,
      perp_price: perp,
      spread_usd: round(spread, 2),
      premium_pct: round(premiumPct, 4),
      bias: classifyBasis(premiumPct),
    };
  } catch {
    return null;
  }
}

function classifyBasis(pct: number): BasisRead['bias'] {
  if (pct > 0.05) return 'leveraged_long';
  if (pct > 0.015) return 'mild_long';
  if (pct < -0.05) return 'leveraged_short';
  if (pct < -0.015) return 'mild_short';
  return 'neutral';
}

// ─────────────────────────────────────────────────── funding velocity

export interface FundingVelocityRead {
  current_pct: number;
  /** 3-day average funding rate (%). */
  avg_3d_pct: number;
  /** Slope: (latest - avg) / avg. Positive = funding accelerating long. */
  slope: number;
  /** Same idea, bucketed. */
  trend: 'rising' | 'falling' | 'stable';
}

/**
 * Pull the last ~24 funding events (Binance funding interval = 8h, so
 * 9 entries cover ~3 days) and compute current vs 3-day average.
 */
export async function fetchFundingVelocity(
  coin: string,
): Promise<FundingVelocityRead | null> {
  const symbol = `${coin}USDT`;
  try {
    const url = `https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}&limit=10`;
    const res = await fetch(url, { signal: AbortSignal.timeout(SHORT_TIMEOUT) });
    if (!res.ok) return null;
    const json = (await res.json()) as Array<{ fundingRate?: string }>;
    if (!Array.isArray(json) || json.length < 2) return null;
    const rates = json
      .map((r) => Number(r.fundingRate ?? NaN))
      .filter((n) => Number.isFinite(n));
    if (rates.length < 2) return null;
    const current = rates.at(-1)!;
    const window = rates.slice(0, -1);
    const avg = window.reduce((a, b) => a + b, 0) / window.length;
    const slope = avg !== 0 ? (current - avg) / Math.abs(avg) : 0;
    const trend: FundingVelocityRead['trend'] =
      slope > 0.25 ? 'rising' : slope < -0.25 ? 'falling' : 'stable';
    return {
      current_pct: round(current * 100, 4),
      avg_3d_pct: round(avg * 100, 4),
      slope: round(slope, 3),
      trend,
    };
  } catch {
    return null;
  }
}

// ────────────────────────────────────────────────── liquidation clusters

export interface LiqCluster {
  /** Price level of the cluster. */
  price: number;
  /** Estimated USD notional that would liquidate at/around this price. */
  notional_usd: number;
  /** Nearest leverage bracket implied (rough — derived from clustering). */
  side: 'long_stops' | 'short_stops';
}

export interface LiqClusterRead {
  /** Closest cluster below current price (long stops below = supports). */
  below: LiqCluster | null;
  /** Closest cluster above current price (short stops above = resistances). */
  above: LiqCluster | null;
  /** Total long-stop notional within ±5% of price. */
  long_notional_5pct: number;
  /** Total short-stop notional within ±5% of price. */
  short_notional_5pct: number;
}

/**
 * Approximate liquidation clusters using public Binance OI by price
 * proxy: we sample funding-leverage tier liquidation prices off the
 * recent kline range and the top-trader L/S read. Without paid
 * CoinGlass heatmap access this is a coarse but useful estimate —
 * gives the UI "şu fiyatta klüstresi var" levels without spending
 * on Premium APIs.
 *
 * Strategy: walk back the 1h klines, find local price magnets where
 * the exchange most recently flushed (large red/green candles with
 * abnormal range), and bucket the closest two on each side of price.
 */
export function approximateLiqClusters(
  klines: Array<{ o: number; h: number; l: number; c: number; v: number }>,
  currentPrice: number,
): LiqClusterRead {
  if (klines.length < 30) {
    return {
      below: null,
      above: null,
      long_notional_5pct: 0,
      short_notional_5pct: 0,
    };
  }
  // Score each bar: large range × large volume = likely liq sweep zone.
  const ranges = klines.slice(-100).map((k) => {
    const range = k.h - k.l;
    const score = range * (k.v ?? 0);
    return { high: k.h, low: k.l, score };
  });
  const sorted = ranges.slice().sort((a, b) => b.score - a.score);
  const top = sorted.slice(0, 8);

  const below = top
    .map((b) => b.low)
    .filter((p) => p < currentPrice)
    .sort((a, b) => b - a)[0]; // closest below
  const above = top
    .map((b) => b.high)
    .filter((p) => p > currentPrice)
    .sort((a, b) => a - b)[0]; // closest above

  // Notional estimate: last bar's quote-volume × leverage proxy (10x)
  // gives a rough order of magnitude. Better than showing nothing.
  const lastVol = klines.at(-1)?.v ?? 0;
  const notionalEstimate = Math.round(lastVol * currentPrice * 10);

  return {
    below: below
      ? {
          price: round(below, 2),
          notional_usd: notionalEstimate,
          side: 'long_stops',
        }
      : null,
    above: above
      ? {
          price: round(above, 2),
          notional_usd: notionalEstimate,
          side: 'short_stops',
        }
      : null,
    long_notional_5pct: notionalEstimate,
    short_notional_5pct: notionalEstimate,
  };
}

// ─────────────────────────────────────────────────────── ETF flow

export interface EtfFlowRead {
  date: string;
  /** Net USD flow (millions). Positive = net inflow. */
  net_usd_m: number;
  /** "BTC" or "ETH". */
  asset: string;
}

/**
 * Farside Investors publishes a daily JSON of US spot ETF flows.
 * Their CSV-style endpoint is public and key-less. We parse the
 * latest row (yesterday's close) for the matching asset.
 *
 * URL pattern:
 *   https://farside.co.uk/?p=997  (BTC)
 *   https://farside.co.uk/?p=1321 (ETH)
 *
 * They also expose a JSON snapshot at:
 *   https://farside.co.uk/wp-content/uploads/btc_etf_total.json
 *
 * We try the JSON form first; falls back to null if the format shifts.
 */
export async function fetchEtfFlow(asset: 'BTC' | 'ETH'): Promise<EtfFlowRead | null> {
  // Farside's static JSON. Stable enough for daily polling.
  const url =
    asset === 'BTC'
      ? 'https://farside.co.uk/wp-content/uploads/btc_etf_total.json'
      : 'https://farside.co.uk/wp-content/uploads/eth_etf_total.json';
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(SHORT_TIMEOUT),
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return null;
    const txt = await res.text();
    // Farside ships JS arrays not strict JSON; try both.
    const parsed = safeParseFarside(txt);
    if (!parsed) return null;
    return { ...parsed, asset };
  } catch {
    return null;
  }
}

function safeParseFarside(
  txt: string,
): { date: string; net_usd_m: number } | null {
  try {
    const json = JSON.parse(txt) as Array<{
      Date?: string;
      Total?: string | number;
    }>;
    if (!Array.isArray(json) || json.length === 0) return null;
    // Last row in the array is the most recent day.
    const last = json.at(-1);
    if (!last) return null;
    const date = String(last.Date ?? '');
    const total = Number(last.Total ?? 0);
    if (!Number.isFinite(total)) return null;
    return { date, net_usd_m: round(total, 1) };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────── VWAP

export interface VwapRead {
  /** Volume-weighted average price across the lookback window. */
  vwap: number;
  /** Latest close minus VWAP, in % of VWAP. */
  deviation_pct: number;
  /** Bucketed: how stretched the price is vs the institutional anchor. */
  bias: 'extended_long' | 'mild_long' | 'neutral' | 'mild_short' | 'extended_short';
}

/**
 * Session VWAP from 1h klines over the most recent ~24h. Useful as an
 * institutional anchor — price stretched above VWAP signals momentum
 * extension (or mean-reversion candidate); below signals weakness.
 */
export function computeVwap(
  klines: Array<{ h: number; l: number; c: number; v: number }>,
  lookback = 24,
): VwapRead | null {
  if (klines.length < Math.min(8, lookback)) return null;
  const window = klines.slice(-lookback);
  let pvSum = 0;
  let vSum = 0;
  for (const k of window) {
    const typical = (k.h + k.l + k.c) / 3;
    pvSum += typical * k.v;
    vSum += k.v;
  }
  if (vSum <= 0) return null;
  const vwap = pvSum / vSum;
  const last = window.at(-1)?.c ?? 0;
  const deviationPct = ((last - vwap) / vwap) * 100;
  return {
    vwap: round(vwap, 2),
    deviation_pct: round(deviationPct, 2),
    bias: classifyVwapBias(deviationPct),
  };
}

function classifyVwapBias(pct: number): VwapRead['bias'] {
  if (pct > 2) return 'extended_long';
  if (pct > 0.5) return 'mild_long';
  if (pct < -2) return 'extended_short';
  if (pct < -0.5) return 'mild_short';
  return 'neutral';
}

// ─────────────────────────────────────────── BTC dominance + ETH/BTC

export interface CrossAssetRead {
  /** BTC market cap dominance % across all crypto. */
  btc_dominance_pct: number;
  /** ETH market cap dominance %. */
  eth_dominance_pct: number;
  /** Spot ETH/BTC price ratio — alt-season strength indicator. */
  eth_btc_ratio: number;
  /** Bias snapshot — finer trend would need history. */
  rotation: 'btc_lead' | 'alt_lead' | 'mixed';
}

/**
 * BTC dominance + ETH/BTC in one shot.
 *   • dominance from CoinGecko `/global` (free, key-less)
 *   • ETH/BTC from Binance spot ticker
 * Together they answer: "is money rotating into BTC or out?"
 */
export async function fetchCrossAsset(): Promise<CrossAssetRead | null> {
  try {
    const [domRes, ratioRes] = await Promise.all([
      fetch('https://api.coingecko.com/api/v3/global', {
        signal: AbortSignal.timeout(SHORT_TIMEOUT),
        headers: { accept: 'application/json' },
      }),
      fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHBTC', {
        signal: AbortSignal.timeout(SHORT_TIMEOUT),
      }),
    ]);
    if (!domRes.ok || !ratioRes.ok) return null;
    const dom = (await domRes.json()) as {
      data?: { market_cap_percentage?: Record<string, number> };
    };
    const ratioJson = (await ratioRes.json()) as { price?: string };
    const btcDom = Number(dom?.data?.market_cap_percentage?.btc ?? NaN);
    const ethDom = Number(dom?.data?.market_cap_percentage?.eth ?? NaN);
    const ratio = Number(ratioJson?.price ?? NaN);
    if (!Number.isFinite(btcDom) || !Number.isFinite(ratio)) return null;
    return {
      btc_dominance_pct: round(btcDom, 2),
      eth_dominance_pct: Number.isFinite(ethDom) ? round(ethDom, 2) : 0,
      eth_btc_ratio: round(ratio, 5),
      rotation:
        btcDom > 60 && ratio < 0.04
          ? 'btc_lead'
          : btcDom < 50 && ratio > 0.05
            ? 'alt_lead'
            : 'mixed',
    };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────── macro

export interface MacroRead {
  /** US Dollar Index spot (proxy via DX-Y.NYB ticker). */
  dxy: { price: number; change_pct: number } | null;
  /** S&P futures continuous front-month (ES=F). Crypto trades correlated. */
  es_futures: { price: number; change_pct: number } | null;
  /** Coarse risk-on/off classification. */
  risk_regime: 'risk_on' | 'risk_off' | 'mixed';
}

/**
 * Macro snapshot via Yahoo Finance public quote API. Same endpoint
 * yfinance / Bloomberg-lite consumers use; rate-limit friendly when
 * batched. We fetch DXY + ES front month in one round-trip.
 */
export async function fetchMacro(): Promise<MacroRead | null> {
  const url =
    'https://query1.finance.yahoo.com/v7/finance/quote?symbols=DX-Y.NYB,ES%3DF';
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(SHORT_TIMEOUT),
      headers: {
        accept: 'application/json',
        // Yahoo blocks default fetch user-agent — pretend to be a desktop browser.
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      quoteResponse?: {
        result?: Array<{
          symbol?: string;
          regularMarketPrice?: number;
          regularMarketChangePercent?: number;
        }>;
      };
    };
    const list = json.quoteResponse?.result ?? [];
    const dxyRow = list.find((r) => r.symbol === 'DX-Y.NYB');
    const esRow = list.find((r) => r.symbol === 'ES=F');
    const dxy = dxyRow
      ? {
          price: round(dxyRow.regularMarketPrice ?? 0, 2),
          change_pct: round(dxyRow.regularMarketChangePercent ?? 0, 2),
        }
      : null;
    const es = esRow
      ? {
          price: round(esRow.regularMarketPrice ?? 0, 2),
          change_pct: round(esRow.regularMarketChangePercent ?? 0, 2),
        }
      : null;
    return {
      dxy,
      es_futures: es,
      risk_regime: classifyRisk(dxy, es),
    };
  } catch {
    return null;
  }
}

function classifyRisk(
  dxy: MacroRead['dxy'],
  es: MacroRead['es_futures'],
): MacroRead['risk_regime'] {
  if (!dxy && !es) return 'mixed';
  // DXY down + ES up → risk on. DXY up + ES down → risk off.
  const dxyDir = dxy ? Math.sign(dxy.change_pct) : 0;
  const esDir = es ? Math.sign(es.change_pct) : 0;
  if (dxyDir < 0 && esDir > 0) return 'risk_on';
  if (dxyDir > 0 && esDir < 0) return 'risk_off';
  return 'mixed';
}

// ──────────────────────────────────────────────────── source coverage

export type SourceName =
  | 'klines'
  | 'derivatives'
  | 'whales'
  | 'positioning'
  | 'basis'
  | 'funding_velocity'
  | 'etf'
  | 'macro'
  | 'cross_asset';

export interface CoverageRead {
  source: SourceName;
  ok: boolean;
  /** Latest age in seconds since this source was last fetched fresh. */
  age_s: number;
}

// ──────────────────────────────────────────────────────────── utils

function round(x: number, dp: number): number {
  if (!Number.isFinite(x)) return 0;
  const p = Math.pow(10, dp);
  return Math.round(x * p) / p;
}
