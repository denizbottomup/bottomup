import { Injectable } from '@nestjs/common';
import { MarketIntelService } from '../market-intel/market-intel.service.js';

export interface TraderDetailSummary {
  trader: {
    id: string;
    name: string | null;
    first_name: string | null;
    last_name: string | null;
    image: string | null;
    bio: string | null;
    followers: number;
    referral_code: string | null;
  };
  stats: {
    trades: number;
    wins: number;
    losses: number;
    win_rate: number | null;
    total_pnl: number;
    total_r: number;
    best_trade_pnl: number;
    worst_trade_pnl: number;
    virtual_balance_usd: number;
    virtual_return_pct: number;
  };
  all_time: {
    trades: number;
    wins: number;
    losses: number;
    win_rate: number | null;
    total_pnl: number;
    total_r: number;
    virtual_balance_usd: number;
    virtual_return_pct: number;
  };
  equity_curve: Array<{ t: number; balance: number }>;
  monthly: Array<{ month: string; net_r: number; trades: number }>;
  coins: Array<{
    coin: string;
    trades: number;
    wins: number;
    win_rate: number;
    net_r: number;
    net_pnl: number;
  }>;
  long_short: {
    long: { trades: number; wins: number; net_r: number; net_pnl: number };
    short: { trades: number; wins: number; net_r: number; net_pnl: number };
  };
  recent: Array<{
    id: string;
    coin: string;
    position: 'long' | 'short' | null;
    status: string;
    /** When the position was opened (setup created). */
    entry_date: Date | null;
    close_date: Date | null;
    pnl: number;
    r: number;
    /**
     * Index of this trade in the trader's full chronological stream
     * (close_date ASC, 0-based). Stable across requests — used by
     * downstream entitlement filters to decide whether the trade is
     * unlocked for free viewers (`index % 5 === 0`).
     */
    index: number;
    /**
     * False from this layer; the entitlement filter on `MeService`
     * may flip it to true and strip price/PnL fields when serving a
     * free viewer. The public surface always returns full data.
     */
    is_locked: boolean;
  }>;
  /** Currently-open positions (status='active') — entry filled, live now. */
  active: Array<{
    id: string;
    coin: string;
    position: 'long' | 'short' | null;
    entry: number | null;
    stop: number | null;
    target: number | null;
    r: number | null;
    /** First take-profit already hit (partial close). */
    tp1_hit: boolean;
    opened_at: Date | null;
  }>;
  /** Pending limit orders (status='incoming') — waiting for entry to fill. */
  limit: Array<{
    id: string;
    coin: string;
    position: 'long' | 'short' | null;
    entry: number | null;
    /** Upper bound of the entry range for laddered limit orders. */
    entry_end: number | null;
    stop: number | null;
    target: number | null;
    r: number | null;
    placed_at: Date | null;
  }>;
}

export interface AnalystStats {
  win_rate: number | null;
  monthly_win_rate: number | null;
  pnl: number | null;
  pnl_rate: number | null;
  monthly_pnl: number | null;
  monthly_pnl_rate: number | null;
  monthly_r: number | null;
  monthly_roi: number | null;
  rate: number | null;
  risk_score: number | null;
  stat_at: Date | null;
}

export interface AnalystListItem {
  trader_id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  image: string | null;
  referral_code: string | null;
  followers: number;
  stats: AnalystStats;
}

export interface LandingTrader {
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

export interface LandingSetup {
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
  created_at: Date | null;
}

export interface LandingNews {
  id: string;
  title: string | null;
  text: string | null;
  source: string | null;
  image: string | null;
  url: string | null;
  date: Date | null;
  sentiment: string | null;
  tickers: string[];
}

export interface LandingStats {
  total_traders: number;
  total_setups: number;
  success_rate_30d: number | null;
  active_setups: number;
}

// 2026-08-03: stats/topTraders/latestSetups used to read a Railway mirror
// kept warm by a `workers` replicator polling 24 backend tables every 10s
// over HTTP. That poll-regardless-of-traffic load is what got replication
// vetoed (see incident notes on bottomup-backend's /analytic/landing-summary
// endpoint). These three now call that endpoint directly — same shape the
// status.bottomup.app page already uses (call the live backend on demand,
// no local mirror) — with a short in-process cache so N landing-page loads
// within the TTL cost one backend request, not N.
const BACKEND_API_URL = process.env.BACKEND_API_URL ?? 'https://api.bottomup.app';
const LANDING_SUMMARY_TTL_MS = 60_000;

interface BackendLandingSummary {
  stats: LandingStats;
  top_traders: LandingTrader[];
  latest_setups: LandingSetup[];
}

@Injectable()
export class PublicService {
  private landingSummaryCache: { data: BackendLandingSummary; expiresAt: number } | null = null;

  constructor(private readonly intel: MarketIntelService) {}

  private async fetchLandingSummary(): Promise<BackendLandingSummary> {
    const now = Date.now();
    if (this.landingSummaryCache && this.landingSummaryCache.expiresAt > now) {
      return this.landingSummaryCache.data;
    }
    const res = await fetch(`${BACKEND_API_URL}/analytic/landing-summary`);
    if (!res.ok) {
      throw new Error(`landing-summary fetch failed: ${res.status}`);
    }
    const data = (await res.json()) as BackendLandingSummary;
    this.landingSummaryCache = { data, expiresAt: now + LANDING_SUMMARY_TTL_MS };
    return data;
  }

  /**
   * Marketing-safe landing payload. The Phase-1 signup wall locked
   * `latest_setups` behind /me/* (live entry/stop/TP is paid content)
   * but the rolling-30-day trader leaderboard is a public showcase —
   * trader name, image, virtual return %, win rate and trade count
   * are precisely the proof-points new visitors come to see, and none
   * of those fields leak per-trade pricing. Hiding them broke the
   * landing's value proposition (and crashed the page when the field
   * went undefined). `top_traders` is back; `latest_setups` stays
   * gated.
   */
  async landing(locale = 'en'): Promise<{
    stats: LandingStats;
    top_traders: LandingTrader[];
    news: LandingNews[];
    pulse: Awaited<ReturnType<MarketIntelService['pulse']>>;
  }> {
    const [stats, top_traders, news, pulse] = await Promise.all([
      this.stats(),
      this.topTraders(6).catch(() => [] as LandingTrader[]),
      this.latestNews(6, locale),
      this.intel.pulse().catch(() => ({
        fear_greed: null,
        fear_greed_history: [],
        dominance: null,
        top_funding: [],
        top_long_short: [],
        liquidation: [],
        open_interest: [],
        whale_alerts: [],
        whale_positions: [],
      })),
    ]);
    return { stats, top_traders, news, pulse };
  }

  /**
   * News-only endpoint that the web app calls when the user switches
   * locale — the rest of the landing payload is locale-agnostic so we
   * don't refetch it.
   */
  async news(limit: number, locale: string): Promise<LandingNews[]> {
    return this.latestNews(limit, locale);
  }

  private async stats(): Promise<LandingStats> {
    const { stats } = await this.fetchLandingSummary();
    return stats;
  }

  /**
   * Monthly futures leaderboard. Mirrors the Metabase `pnl_setup6`
   * query the admin panel uses:
   *
   *   - Join trader_setup_pnl_performance to setup
   *   - Only count trades with status ∈ {success, stopped}. Manual
   *     `closed` positions are excluded (not a real win/loss).
   *   - Category is fixed to futures (same as admin view).
   *   - Win-rate = success / (success + stopped)
   *   - Balance = $10,000 + SUM(estimated_pnl) — net of fees, matches
   *     the 'net_pnl' column admins see.
   */
  /**
   * Public trader detail — accepts the trader's display `name` (that's
   * how the card click-through links in; UUIDs aren't in the landing
   * payload). Returns everything a marketing detail view needs:
   * headline stats, equity curve, monthly R series, coin breakdown,
   * long/short split, and the 8 most recent closed trades.
   */
  async traderDetail(name: string): Promise<TraderDetailSummary | null> {
    const nameClean = String(name ?? '').trim();
    if (!nameClean) return null;

    // Same on-demand backend read as landing-summary / news: the Railway
    // replica's last close for public traders was weeks stale. Live
    // FastAPI /public/trader is the pnl_setup6 source status.bottomup.app
    // already uses.
    const res = await fetch(
      `${BACKEND_API_URL}/public/trader/${encodeURIComponent(nameClean)}`,
    );
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`public/trader fetch failed: ${res.status}`);
    }
    return (await res.json()) as TraderDetailSummary;
  }

  /**
   * Public analyst directory: name, image, pre-computed `trader_stats`
   * aggregates and the trader's `referral_code`. Different from
   * `topTraders` — that one rebuilds a 30-day window from raw setups
   * and excludes traders with no recent activity. This list is the
   * full active-trader roster (with stats columns nullable for traders
   * the daily aggregator hasn't reached yet). Sort key is whitelisted
   * to avoid SQL injection on the ORDER BY clause.
   */
  async analystList(
    limit: number,
    orderBy: string,
    activeWithinDays?: number,
  ): Promise<AnalystListItem[]> {
    const cap = Math.max(1, Math.min(100, limit));
    const params = new URLSearchParams({
      limit: String(cap),
      order_by: orderBy || 'monthly_pnl',
    });
    if (activeWithinDays && activeWithinDays > 0) {
      params.set('active_within_days', String(Math.floor(activeWithinDays)));
    }
    const res = await fetch(`${BACKEND_API_URL}/public/analysts?${params}`);
    if (!res.ok) {
      throw new Error(`public/analysts fetch failed: ${res.status}`);
    }
    return (await res.json()) as AnalystListItem[];
  }

  async topTraders(limit: number): Promise<LandingTrader[]> {
    const capped = Math.max(1, Math.min(20, limit));
    const { top_traders } = await this.fetchLandingSummary();
    return top_traders.slice(0, capped);
  }

  private async latestSetups(limit: number): Promise<LandingSetup[]> {
    const capped = Math.max(1, Math.min(40, limit));
    const { latest_setups } = await this.fetchLandingSummary();
    return latest_setups.slice(0, capped);
  }

  // 2026-08-03: this used to read the mirror's `news`/`news_text` tables,
  // kept warm by the (now-disabled) replicator plus a separate Google
  // Translate worker writing straight into the mirror. Call the backend's
  // own /feed/news instead — same on-demand + cached pattern as
  // fetchLandingSummary. It only pre-translates en/tr/de (vs. the
  // translator's wider locale list); other locales fall back to English,
  // same graceful-fallback behavior the old code had for a cold translator.
  private async latestNews(limit: number, locale = 'en'): Promise<LandingNews[]> {
    const cap = Math.max(1, Math.min(20, limit));
    const lang = String(locale ?? 'en').toLowerCase();
    const backendLang = ['en', 'tr', 'de'].includes(lang) ? lang : 'en';
    const res = await fetch(`${BACKEND_API_URL}/feed/news?limit=${cap}`, {
      headers: { 'accept-language': backendLang },
    });
    if (!res.ok) {
      throw new Error(`feed/news fetch failed: ${res.status}`);
    }
    const body = (await res.json()) as {
      data?: Array<Record<string, unknown>>;
    };
    return (body.data ?? []).map((r) =>
      mapNewsRow({
        id: r.id,
        title: r.title,
        text: r.text,
        source: r.source_name,
        image: r.thumbnail_url ?? r.image_url,
        url: r.news_url,
        date: r.date,
        sentiment: r.sentiment,
        tickers: r.tickers ?? [],
      }),
    );
  }
}

function mapNewsRow(r: Record<string, unknown>): LandingNews {
  return {
    id: r.id as string,
    title: (r.title as string | null) ?? null,
    text: (r.text as string | null) ?? null,
    source: (r.source as string | null) ?? null,
    image: (r.image as string | null) ?? null,
    url: (r.url as string | null) ?? null,
    date: (r.date as Date | null) ?? null,
    sentiment: (r.sentiment as string | null) ?? null,
    tickers: Array.isArray(r.tickers) ? (r.tickers as string[]).slice(0, 5) : [],
  };
}
