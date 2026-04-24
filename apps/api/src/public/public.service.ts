import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@bottomup/db';
import { PRISMA } from '../common/prisma.module.js';
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
    close_date: Date | null;
    pnl: number;
    r: number;
  }>;
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

    const user = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT u.id::text AS id, u.name, u.first_name, u.last_name, u.image,
              tp.content AS bio,
              (SELECT COUNT(*)::int FROM follow_notify f
                WHERE f.trader_id = u.id AND f.follow = TRUE AND f.is_deleted = FALSE) AS followers
         FROM "user" u
         LEFT JOIN trader_profile tp ON tp.trader_id = u.id AND tp.is_deleted = FALSE
        WHERE u.is_trader = TRUE AND u.is_deleted = FALSE AND u.name = $1
        LIMIT 1`,
      nameClean,
    );
    const u = user[0];
    if (!u) return null;
    const traderId = u.id as string;

    // Closed futures trades (success/stopped). Same filter basis as the
    // leaderboard and admin Metabase query.
    const trades = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT s.id::text AS id,
              s.coin_name,
              s.position::text AS position,
              s.status::text AS status,
              s.close_date,
              COALESCE(p.estimated_pnl, 0) AS pnl,
              COALESCE(p.estimated_pnl_rate, 0) AS r
         FROM setup s
         JOIN trader_setup_pnl_performance p ON p.setup_id = s.id
        WHERE s.is_deleted = FALSE
          AND s.trader_id = $1::uuid
          AND s.category = 'futures'::categories_type
          AND s.status IN ('success'::statuses_type,'stopped'::statuses_type)
        ORDER BY s.close_date ASC NULLS LAST`,
      traderId,
    );

    const STARTING = 10000;
    let runningBalance = STARTING;
    let totalPnl = 0;
    let totalR = 0;
    let wins = 0;
    let losses = 0;
    let bestPnl = -Infinity;
    let worstPnl = Infinity;

    const equity: Array<{ t: number; balance: number }> = [];
    const monthlyMap = new Map<string, { net_r: number; trades: number }>();
    const coinMap = new Map<
      string,
      { trades: number; wins: number; net_r: number; net_pnl: number }
    >();
    const long = { trades: 0, wins: 0, net_r: 0, net_pnl: 0 };
    const short = { trades: 0, wins: 0, net_r: 0, net_pnl: 0 };

    for (const t of trades) {
      const pnl = Number(t.pnl ?? 0);
      const r = Number(t.r ?? 0);
      const coin = String(t.coin_name ?? '');
      const pos = t.position === 'long' || t.position === 'short' ? t.position : null;
      const closeAt = t.close_date as Date | null;
      const isWin = t.status === 'success';

      totalPnl += pnl;
      totalR += r;
      if (isWin) wins += 1;
      else losses += 1;
      if (pnl > bestPnl) bestPnl = pnl;
      if (pnl < worstPnl) worstPnl = pnl;

      runningBalance += pnl;
      if (closeAt)
        equity.push({ t: new Date(closeAt).getTime(), balance: runningBalance });

      if (closeAt) {
        const d = new Date(closeAt);
        const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        const cur = monthlyMap.get(ym) ?? { net_r: 0, trades: 0 };
        cur.net_r += r;
        cur.trades += 1;
        monthlyMap.set(ym, cur);
      }

      if (coin) {
        const cc = coinMap.get(coin) ?? {
          trades: 0,
          wins: 0,
          net_r: 0,
          net_pnl: 0,
        };
        cc.trades += 1;
        if (isWin) cc.wins += 1;
        cc.net_r += r;
        cc.net_pnl += pnl;
        coinMap.set(coin, cc);
      }

      if (pos === 'long') {
        long.trades += 1;
        if (isWin) long.wins += 1;
        long.net_r += r;
        long.net_pnl += pnl;
      } else if (pos === 'short') {
        short.trades += 1;
        if (isWin) short.wins += 1;
        short.net_r += r;
        short.net_pnl += pnl;
      }
    }

    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? wins / totalTrades : null;

    const coins = Array.from(coinMap.entries())
      .map(([coin, c]) => ({
        coin,
        trades: c.trades,
        wins: c.wins,
        win_rate: c.trades > 0 ? Math.round((c.wins / c.trades) * 1000) / 10 : 0,
        net_r: Math.round(c.net_r * 100) / 100,
        net_pnl: Math.round(c.net_pnl * 100) / 100,
      }))
      .sort((a, b) => b.net_r - a.net_r)
      .slice(0, 8);

    const monthly = Array.from(monthlyMap.entries())
      .map(([month, v]) => ({
        month,
        net_r: Math.round(v.net_r * 100) / 100,
        trades: v.trades,
      }))
      .sort((a, b) => (a.month < b.month ? -1 : 1))
      .slice(-12);

    // Equity: sample up to 180 points so the SVG sparkline stays tight.
    let curve = equity;
    if (curve.length > 180) {
      const step = Math.ceil(curve.length / 180);
      curve = curve.filter((_, i) => i % step === 0 || i === curve.length - 1);
    }

    const recent = [...trades]
      .reverse()
      .slice(0, 8)
      .map((t) => ({
        id: t.id as string,
        coin: String(t.coin_name ?? ''),
        position:
          t.position === 'long' || t.position === 'short'
            ? (t.position as 'long' | 'short')
            : null,
        status: String(t.status ?? ''),
        close_date: (t.close_date as Date | null) ?? null,
        pnl: Math.round(Number(t.pnl ?? 0) * 100) / 100,
        r: Math.round(Number(t.r ?? 0) * 100) / 100,
      }));

    return {
      trader: {
        id: traderId,
        name: (u.name as string | null) ?? null,
        first_name: (u.first_name as string | null) ?? null,
        last_name: (u.last_name as string | null) ?? null,
        image: (u.image as string | null) ?? null,
        bio: (u.bio as string | null) ?? null,
        followers: Number(u.followers ?? 0),
      },
      stats: {
        trades: totalTrades,
        wins,
        losses,
        win_rate: winRate,
        total_pnl: Math.round(totalPnl * 100) / 100,
        total_r: Math.round(totalR * 100) / 100,
        best_trade_pnl: bestPnl === -Infinity ? 0 : Math.round(bestPnl * 100) / 100,
        worst_trade_pnl: worstPnl === Infinity ? 0 : Math.round(worstPnl * 100) / 100,
        virtual_balance_usd: Math.round(runningBalance * 100) / 100,
        virtual_return_pct:
          Math.round(((runningBalance - STARTING) / STARTING) * 10000) / 100,
      },
      equity_curve: curve,
      monthly,
      coins,
      long_short: { long, short },
      recent,
    };
  }

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
