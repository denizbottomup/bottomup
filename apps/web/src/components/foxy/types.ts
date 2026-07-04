/**
 * Wire types Foxy shows in the redesigned two-column UI. These mirror
 * the NestJS service shape exactly — keep both sides in sync when the
 * backend response evolves.
 */

export type FoxyVerdict = 'AL' | 'SAT' | 'BEKLE';

export interface FoxyAnalysis {
  verdict: FoxyVerdict;
  headline: string;
  /** Plain "🦊 Senin için" actionable paragraph. Optional so older
   *  backend responses don't break the UI; render only when present. */
  takeaway?: string;
  reasons: string[];
  invalidation: string;
}

export interface FoxyAssetMarket {
  price: number;
  change_24h_pct: number;
  high_24h: number | null;
  low_24h: number | null;
  quote_volume_24h: number | null;
}

export interface FoxyOrderBookLevel {
  px: number;
  sz: number;
}

export interface FoxyOrderBook {
  inst_id: string;
  /** Exchanges that contributed to this aggregated book. */
  sources?: string[];
  asks: FoxyOrderBookLevel[];
  bids: FoxyOrderBookLevel[];
  mid: number;
  spread: number;
  spread_pct: number;
  ts: number;
}

export interface FoxyScalpTarget {
  price: number;
  r: number;
  pct: number;
}

export interface FoxyScalpSignal {
  coin: string;
  direction: 'LONG' | 'SHORT' | 'NONE';
  timeframe: string;
  price: number;
  entry: number | null;
  entry_zone: [number, number] | null;
  stop: number | null;
  targets: FoxyScalpTarget[];
  risk_per_unit: number | null;
  rr: number | null;
  confidence: number;
  headline: string;
  reasons: string[];
  invalidation: string;
  generated_at: string;
  meta: {
    rsi: number | null;
    ema_fast: number | null;
    ema_slow: number | null;
    atr: number | null;
    trend: 'up' | 'down' | 'flat';
    ob_imbalance: number | null;
  };
}

export interface FoxyQuotaState {
  used: number;
  limit: number;
  window_starts_at: string;
  resets_at: string;
}

export interface FoxyQueryReply {
  prompt: string;
  coin: string | null;
  analysis: FoxyAnalysis;
  /** Supporting data the model reasoned over — surfaced for the full
   *  decision board. Each may be null/absent; the UI hides empty panels.
   *  Optional so a pre-deploy backend response still type-checks. */
  market?: FoxyAssetMarket | null;
  derivatives?: FoxyDerivatives | null;
  whales?: FoxyWhales | null;
  setups?: FoxySetupsByCoin | null;
  orderbook?: FoxyOrderBook | null;
  signal?: FoxyScalpSignal | null;
  quota: FoxyQuotaState;
  entitlement: {
    tier: 'free' | 'trial' | 'premium';
    expires_at: string | null;
    is_trial: boolean;
  };
}

export interface FoxyCoinSetup {
  id: string;
  status: string;
  position: 'long' | 'short' | null;
  entry_value: number | null;
  stop_value: number | null;
  profit_taking_1: number | null;
  r_value: number | null;
  trader_id: string | null;
  trader_name: string | null;
  trader_image: string | null;
  created_at: string | null;
  last_acted_at: string | null;
}

export interface FoxySetupsByCoin {
  coin: string;
  active: FoxyCoinSetup[];
  recent: {
    count: number;
    wins: number;
    losses: number;
    break_even: number;
    win_rate: number | null;
    total_r: number;
  };
}

export interface FoxyDerivatives {
  coin: string;
  liquidation: {
    long_24h_usd: number;
    short_24h_usd: number;
    total_24h_usd: number;
    total_4h_usd: number;
    total_1h_usd: number;
  } | null;
  oi: {
    oi_usd: number;
    change_4h_pct: number | null;
    change_24h_pct: number | null;
  } | null;
  long_short: {
    long_ratio: number;
    short_ratio: number;
    ts: number;
  } | null;
  funding: {
    rate: number;
    annualized_pct: number;
    next_funding_ts: number | null;
  } | null;
}

export interface FoxyWhaleTransfer {
  id: string;
  ts: string;
  chain: string;
  token_symbol: string;
  unit_value: number;
  usd_value: number;
  from: { name: string; address: string; type: string | null };
  to: { name: string; address: string; type: string | null };
  flow: 'cex_in' | 'cex_out' | 'between';
  tx_hash: string;
}

export interface FoxyWhales {
  coin: string;
  window_hours: number;
  min_usd: number;
  total: number;
  transfers: FoxyWhaleTransfer[];
  flows: {
    cex_in_usd: number;
    cex_out_usd: number;
    between_usd: number;
  };
}

/** Session-only history entry. Not persisted — cleared on reload. */
export interface FoxyHistoryEntry {
  id: string;
  prompt: string;
  coinSymbol: string | null;
  coinDisplay: string | null;
  verdict: FoxyVerdict;
  at: number;
}

/** One price band in the depth profile ("duvar haritası"). */
export interface FoxyDepthBucket {
  px_low: number;
  px_high: number;
  px_mid: number;
  size: number;
  usd: number;
  /** usd ÷ the side's uniform per-bucket share — 1.0 is "average". */
  strength: number;
  is_wall: boolean;
}

/** Where resting bids/asks concentrate around the mid. */
export interface FoxyDepthProfile {
  coin: string;
  inst_id: string;
  sources: string[];
  mid: number;
  range_pct: number;
  buckets_per_side: number;
  /** Nearest-to-mid first (descending price). */
  bids: FoxyDepthBucket[];
  /** Nearest-to-mid first (ascending price). */
  asks: FoxyDepthBucket[];
  support_wall: FoxyDepthBucket | null;
  resistance_wall: FoxyDepthBucket | null;
  ts: number;
}

/** One technical factor contributing to a confluence zone. */
export interface FoxyZoneFactor {
  kind: 'order_block' | 'fvg' | 'ema' | 'wall';
  tf: string;
  detail: string;
  weight: number;
}

/** A price band where independent technical evidence stacks up. */
export interface FoxyZone {
  low: number;
  high: number;
  mid: number;
  side: 'demand' | 'supply';
  score: number;
  dist_pct: number;
  factors: FoxyZoneFactor[];
}

/** Multi-timeframe confluence map (OB + FVG + EMA + walls). */
export interface FoxyConfluence {
  coin: string;
  price: number;
  zones: FoxyZone[];
  ts: number;
}
