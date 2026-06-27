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
