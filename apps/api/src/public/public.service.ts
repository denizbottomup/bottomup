import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@bottomup/db';
import { PRISMA } from '../common/prisma.module.js';
import { MarketIntelService } from '../market-intel/market-intel.service.js';

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

@Injectable()
export class PublicService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly intel: MarketIntelService,
  ) {}

  async landing(): Promise<{
    stats: LandingStats;
    top_traders: LandingTrader[];
    latest_setups: LandingSetup[];
    news: LandingNews[];
    pulse: Awaited<ReturnType<MarketIntelService['pulse']>>;
  }> {
    const [stats, traders, setups, news, pulse] = await Promise.all([
      this.stats(),
      this.topTraders(6),
      this.latestSetups(8),
      this.latestNews(6),
      this.intel.pulse().catch(() => ({
        fear_greed: null,
        fear_greed_history: [],
        dominance: null,
        top_funding: [],
        top_long_short: [],
        liquidation: [],
        open_interest: [],
      })),
    ]);
    return { stats, top_traders: traders, latest_setups: setups, news, pulse };
  }

  private async stats(): Promise<LandingStats> {
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT
         (SELECT COUNT(*)::int FROM "user"
           WHERE is_trader = TRUE AND is_deleted = FALSE AND is_active = TRUE) AS total_traders,
         (SELECT COUNT(*)::int FROM setup
           WHERE is_deleted = FALSE) AS total_setups,
         (SELECT COUNT(*)::int FROM setup
           WHERE is_deleted = FALSE AND status IN ('incoming'::statuses_type,'active'::statuses_type)) AS active_setups,
         (SELECT (
            COUNT(*) FILTER (WHERE status IN ('success'::statuses_type,'closed'::statuses_type))::float
            / NULLIF(COUNT(*) FILTER (WHERE status IN ('success'::statuses_type,'closed'::statuses_type,'stopped'::statuses_type)), 0)
          ) FROM setup
           WHERE is_deleted = FALSE
             AND close_date > NOW() - INTERVAL '30 days') AS success_rate_30d`,
    );
    const r = rows[0] ?? {};
    return {
      total_traders: Number(r.total_traders ?? 0),
      total_setups: Number(r.total_setups ?? 0),
      active_setups: Number(r.active_setups ?? 0),
      success_rate_30d: r.success_rate_30d == null ? null : Number(r.success_rate_30d),
    };
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
  private async topTraders(limit: number): Promise<LandingTrader[]> {
    const capped = Math.max(1, Math.min(20, limit));
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `WITH monthly AS (
         SELECT s.trader_id,
                COUNT(*) FILTER (WHERE s.status = 'success'::statuses_type)::int AS success,
                COUNT(*) FILTER (WHERE s.status = 'stopped'::statuses_type)::int AS stopped,
                COALESCE(SUM(p.estimated_pnl), 0) AS net_pnl,
                COALESCE(SUM(p.estimated_pnl_rate), 0) AS net_r
           FROM trader_setup_pnl_performance p
           JOIN setup s ON s.id = p.setup_id
          WHERE s.is_deleted = FALSE
            AND s.category = 'futures'::categories_type
            AND s.status IN ('success'::statuses_type,'stopped'::statuses_type)
            AND s.close_date >= DATE_TRUNC('month', NOW())
          GROUP BY s.trader_id
       )
       SELECT u.id::text AS trader_id, u.name, u.first_name, u.last_name, u.image,
              (SELECT COUNT(*)::int FROM follow_notify f
                WHERE f.trader_id = u.id AND f.follow = TRUE AND f.is_deleted = FALSE) AS followers,
              COALESCE(m.success + m.stopped, 0) AS trades,
              COALESCE(m.success, 0) AS wins,
              COALESCE(m.net_pnl, 0) AS net_pnl,
              COALESCE(m.net_r, 0) AS net_r
         FROM "user" u
         LEFT JOIN monthly m ON m.trader_id = u.id
        WHERE u.is_trader = TRUE AND u.is_active = TRUE AND u.is_deleted = FALSE
          AND m.success + m.stopped > 0
        ORDER BY m.net_pnl DESC NULLS LAST
        LIMIT ${capped}`,
    );
    const STARTING = 10000;
    return rows.map((r) => {
      const trades = Number(r.trades ?? 0);
      const wins = Number(r.wins ?? 0);
      const netPnl = Number(r.net_pnl ?? 0);
      const balance = STARTING + netPnl;
      const returnPct = ((balance - STARTING) / STARTING) * 100;
      return {
        trader_id: r.trader_id as string,
        name: (r.name as string | null) ?? null,
        first_name: (r.first_name as string | null) ?? null,
        last_name: (r.last_name as string | null) ?? null,
        image: (r.image as string | null) ?? null,
        followers: Number(r.followers ?? 0),
        virtual_balance_usd: Math.round(balance * 100) / 100,
        virtual_return_pct: Math.round(returnPct * 100) / 100,
        monthly_trades: trades,
        monthly_wins: wins,
        monthly_win_rate: trades > 0 ? wins / trades : null,
      };
    });
  }

  private async latestSetups(limit: number): Promise<LandingSetup[]> {
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT s.id::text      AS id,
              s.coin_name      AS coin_name,
              s.status::text   AS status,
              s.position::text AS position,
              s.category::text AS category,
              s.entry_value    AS entry_value,
              s.stop_value     AS stop_value,
              s.profit_taking_1 AS profit_taking_1,
              s.r_value        AS r_value,
              u.name           AS trader_name,
              u.image          AS trader_image,
              c.image          AS coin_image,
              s.created_at     AS created_at
         FROM setup s
         LEFT JOIN "user" u ON u.id = s.trader_id
         LEFT JOIN coin c ON c.code = s.coin_name AND c.is_deleted = FALSE
        WHERE s.is_deleted = FALSE
          AND s.status IN ('incoming'::statuses_type,'active'::statuses_type)
        ORDER BY s.last_acted_at DESC NULLS LAST
        LIMIT ${Math.max(1, Math.min(40, limit))}`,
    );
    return rows.map((r) => ({
      id: r.id as string,
      coin_name: r.coin_name as string,
      status: r.status as string,
      position: (r.position as string | null) ?? null,
      category: (r.category as string) ?? 'spot',
      entry_value: Number(r.entry_value ?? 0),
      stop_value: r.stop_value == null ? null : Number(r.stop_value),
      profit_taking_1: r.profit_taking_1 == null ? null : Number(r.profit_taking_1),
      r_value: r.r_value == null ? null : Number(r.r_value),
      trader_name: (r.trader_name as string | null) ?? null,
      trader_image: (r.trader_image as string | null) ?? null,
      coin_image: (r.coin_image as string | null) ?? null,
      created_at: (r.created_at as Date | null) ?? null,
    }));
  }

  private async latestNews(limit: number): Promise<LandingNews[]> {
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT id::text AS id, title, text, source_name AS source,
              COALESCE(thumbnail_url, image_url) AS image,
              news_url AS url, date, sentiment, COALESCE(tickers, ARRAY[]::text[]) AS tickers
         FROM news
        WHERE is_deleted = FALSE
        ORDER BY date DESC NULLS LAST
        LIMIT ${Math.max(1, Math.min(20, limit))}`,
    );
    return rows.map((r) => ({
      id: r.id as string,
      title: (r.title as string | null) ?? null,
      text: (r.text as string | null) ?? null,
      source: (r.source as string | null) ?? null,
      image: (r.image as string | null) ?? null,
      url: (r.url as string | null) ?? null,
      date: (r.date as Date | null) ?? null,
      sentiment: (r.sentiment as string | null) ?? null,
      tickers: Array.isArray(r.tickers) ? (r.tickers as string[]).slice(0, 5) : [],
    }));
  }
}
