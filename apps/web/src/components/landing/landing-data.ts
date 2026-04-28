/**
 * Trader card payload. Used to be inside `LandingPayload.top_traders`,
 * but the trader leaderboard is now behind the auth wall — anonymous
 * landing visitors don't see real cards. Logged-in clients fetch this
 * shape from `/me/leaderboard`.
 */
export interface LeaderboardTrader {
  trader_id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  image: string | null;
  followers: number;
  virtual_balance_usd: number;
  virtual_return_pct: number;
  monthly_trades: number;
  monthly_wins: number;
  monthly_win_rate: number | null;
}

export interface LandingPayload {
  stats: {
    total_traders: number;
    total_setups: number;
    success_rate_30d: number | null;
    active_setups: number;
  };
  news: Array<{
    id: string;
    title: string | null;
    text: string | null;
    source: string | null;
    image: string | null;
    url: string | null;
    date: string | null;
    sentiment: string | null;
    tickers: string[];
  }>;
  pulse: {
    fear_greed: { value: number; classification: string; ts: number } | null;
    fear_greed_history: Array<{ value: number; classification: string; ts: number }>;
    dominance: {
      btc: number;
      eth: number;
      usdt: number | null;
      total_market_cap_usd: number;
      total_volume_usd: number;
    } | null;
    top_funding: Array<{ symbol: string; funding_rate: number; mark_price: number }>;
    top_long_short: Array<{ symbol: string; long_ratio: number; short_ratio: number }>;
    liquidation: Array<{
      symbol: string;
      long_24h_usd: number;
      short_24h_usd: number;
      total_24h_usd: number;
    }>;
    open_interest: Array<{
      symbol: string;
      oi_usd: number;
      oi_change_24h_pct: number | null;
    }>;
    /** Recent Hyperliquid whale events ($1M+ notional, ~last hour). */
    whale_alerts: Array<{
      user: string;
      symbol: string;
      side: 'long' | 'short';
      position_size: number;
      entry_price: number;
      liq_price: number;
      position_value_usd: number;
      ts: number;
    }>;
    /** Currently-open Hyperliquid whale positions ($1M+ notional). */
    whale_positions: Array<{
      user: string;
      symbol: string;
      side: 'long' | 'short';
      position_size: number;
      entry_price: number;
      mark_price: number;
      liq_price: number;
      leverage: number;
      position_value_usd: number;
      unrealized_pnl: number;
      margin_mode: 'cross' | 'isolated';
      opened_at: number;
      updated_at: number;
    }>;
  };
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://bottomupapi-production.up.railway.app';

export async function fetchLanding(locale = 'en'): Promise<LandingPayload | null> {
  try {
    const res = await fetch(
      `${API_BASE}/public/landing?locale=${encodeURIComponent(locale)}`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return null;
    return (await res.json()) as LandingPayload;
  } catch {
    return null;
  }
}

/**
 * Authenticated leaderboard fetch. Caller must pass the Firebase
 * ID token (or our internal JWT) it already holds — this endpoint
 * 401s otherwise. Used by `<LeaderboardSection>` once it knows the
 * viewer is logged in.
 */
export async function fetchMyLeaderboard(
  idToken: string,
  limit = 6,
): Promise<LeaderboardTrader[]> {
  try {
    const res = await fetch(`${API_BASE}/me/leaderboard?limit=${limit}`, {
      headers: { Authorization: `Bearer ${idToken}` },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { items: LeaderboardTrader[] };
    return json.items ?? [];
  } catch {
    return [];
  }
}

/**
 * Locale-only news feed — used by the client when the user switches
 * language. The rest of the landing payload is locale-agnostic so we
 * don't refetch it.
 */
export async function fetchNews(
  locale: string,
  limit = 6,
): Promise<LandingPayload['news']> {
  try {
    const res = await fetch(
      `${API_BASE}/public/news?locale=${encodeURIComponent(locale)}&limit=${limit}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return [];
    return (await res.json()) as LandingPayload['news'];
  } catch {
    return [];
  }
}

export function formatUsd(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export function displayName(t: {
  name: string | null;
  first_name: string | null;
  last_name: string | null;
}): string {
  return (
    t.name ||
    [t.first_name, t.last_name].filter(Boolean).join(' ').trim() ||
    'Trader'
  );
}
