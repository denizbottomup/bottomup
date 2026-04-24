export interface LandingPayload {
  stats: {
    total_traders: number;
    total_setups: number;
    success_rate_30d: number | null;
    active_setups: number;
  };
  top_traders: Array<{
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
  }>;
  latest_setups: Array<{
    id: string;
    coin_name: string;
    status: string;
    position: string | null;
    category: string;
    entry_value: number;
    stop_value: number | null;
    profit_taking_1: number | null;
    r_value: number | null;
    trader_name: string | null;
    trader_image: string | null;
    coin_image: string | null;
    created_at: string | null;
  }>;
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
  };
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://bottomupapi-production.up.railway.app';

export async function fetchLanding(): Promise<LandingPayload | null> {
  try {
    const res = await fetch(`${API_BASE}/public/landing`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as LandingPayload;
  } catch {
    return null;
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
