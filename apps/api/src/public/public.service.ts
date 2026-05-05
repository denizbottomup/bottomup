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

@Injectable()
export class PublicService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly intel: MarketIntelService,
  ) {}

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

    // Case-insensitive name lookup so shareable URLs (`/analyst/awerte`)
    // resolve regardless of capitalization. Trader display names are
    // effectively unique in practice; LIMIT 1 keeps us safe in the
    // pathological collision case.
    const user = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT u.id::text AS id, u.name, u.first_name, u.last_name, u.image,
              u.referral_code,
              tp.content AS bio,
              (SELECT COUNT(*)::int FROM follow_notify f
                WHERE f.trader_id = u.id AND f.follow = TRUE AND f.is_deleted = FALSE) AS followers
         FROM "user" u
         LEFT JOIN trader_profile tp ON tp.trader_id = u.id AND tp.is_deleted = FALSE
        WHERE u.is_trader = TRUE AND u.is_deleted = FALSE AND LOWER(u.name) = LOWER($1)
        LIMIT 1`,
      nameClean,
    );
    const u = user[0];
    if (!u) return null;
    const traderId = u.id as string;

    // Closed futures trades (success/stopped). Same filter basis as the
    // leaderboard and admin Metabase query.
    //
    // `close_date` is null for a large fraction of stopped trades (the
    // user closed via stop-loss, not manually), so we fall back through
    // tp1_date / updated_at / created_at the same way trader.service does.
    // Without this fallback, those trades drop out of the equity curve
    // and monthly aggregation entirely, while still being counted in the
    // headline stats — which produces equity curves that "end" higher
    // than the true balance and monthly arrays whose net_r doesn't sum
    // to total_r. See docs/BUG_TRADER_STATS.md for the diagnosis.
    // Per-trade close timestamp:
    //   success → s.close_date
    //   stopped → s.stop_date  (SL trigger moment)
    //   either  → s.tp1_date / s.last_acted_at as further fallbacks
    //   last resort → p.updated_at / p.created_at on the PnL row
    // LEFT JOIN trader_setup_pnl_performance — that table is recomputed
    // by a daily cron, so trades closed today have a setup row but no
    // PnL row yet. INNER JOIN dropped them; LEFT JOIN keeps them with
    // null pnl/r (treated as 0 below). Status filter also includes
    // 'closed' (manual break-even close): those are real trade activity
    // and belong in the trade count and recent panel even though they
    // aren't wins or losses.
    const trades = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT s.id::text AS id,
              s.coin_name,
              s.position::text AS position,
              s.status::text AS status,
              COALESCE(s.close_date, s.stop_date, s.tp1_date, s.last_acted_at, p.updated_at, p.created_at) AS close_date,
              COALESCE(s.close_date, s.stop_date, s.tp1_date, s.last_acted_at) AS real_close_date,
              COALESCE(p.estimated_pnl, 0) AS pnl,
              COALESCE(p.estimated_pnl_rate, 0) AS r
         FROM setup s
         LEFT JOIN trader_setup_pnl_performance p ON p.setup_id = s.id
        WHERE s.is_deleted = FALSE
          AND s.trader_id = $1::uuid
          AND s.category = 'futures'::categories_type
          AND s.status IN ('success'::statuses_type,'stopped'::statuses_type,'closed'::statuses_type)
        ORDER BY COALESCE(s.close_date, s.stop_date, s.tp1_date, s.last_acted_at, p.updated_at, p.created_at) ASC NULLS LAST`,
      traderId,
    );

    const STARTING = 10000;
    let runningBalance = STARTING;
    let totalPnl = 0;
    let totalR = 0;
    let wins = 0;
    let losses = 0;
    let breakEven = 0;
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
      const isLoss = t.status === 'stopped';

      totalPnl += pnl;
      totalR += r;
      if (isWin) wins += 1;
      else if (isLoss) losses += 1;
      else breakEven += 1;
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

    const totalTrades = wins + losses + breakEven;
    // Win rate denominator excludes break-even trades — they're neither
    // wins nor losses, just exits at entry.
    const winRate = wins + losses > 0 ? wins / (wins + losses) : null;

    // Last-30-days rolling aggregate. The leaderboard card uses the
    // same window — the modal stays in sync as the user clicks
    // through. Calendar months were rejected because the field empties
    // out on the 1st: a rolling window keeps the headline meaningful
    // every day. All-time history is still surfaced via the Monthly R
    // chart, the coin / long-short breakdown, and the Recent trades
    // panel.
    const windowStartTs = Date.now() - 30 * 24 * 60 * 60 * 1000;
    let mPnl = 0;
    let mR = 0;
    let mWins = 0;
    let mLosses = 0;
    let mBest = -Infinity;
    let mWorst = Infinity;
    const mCurve: Array<{ t: number; balance: number }> = [];
    let mBalance = STARTING;
    for (const t of trades) {
      const closeAt = t.close_date as Date | null;
      if (!closeAt) continue;
      const ts = new Date(closeAt).getTime();
      if (ts < windowStartTs) continue;
      const pnl = Number(t.pnl ?? 0);
      const r = Number(t.r ?? 0);
      const isWin = t.status === 'success';
      mPnl += pnl;
      mR += r;
      if (isWin) mWins += 1;
      else mLosses += 1;
      if (pnl > mBest) mBest = pnl;
      if (pnl < mWorst) mWorst = pnl;
      mBalance += pnl;
      mCurve.push({ t: ts, balance: mBalance });
    }
    const mTrades = mWins + mLosses;
    const mWinRate = mTrades > 0 ? mWins / mTrades : null;

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

    // Equity: sample the *monthly* curve up to 180 points. We show
    // this-month's balance progression in the modal (matches the card).
    let curve = mCurve;
    if (curve.length > 180) {
      const step = Math.ceil(curve.length / 180);
      curve = curve.filter((_, i) => i % step === 0 || i === curve.length - 1);
    }

    // Recent panel: prefer trades with a real close timestamp from the
    // setup table (close_date / stop_date / tp1_date / last_acted_at).
    // The PnL row's updated_at gets touched by daily cron jobs, so if
    // we sort by it the panel collapses every stopped trade onto a
    // single batch instant. We use real_close_date for both filtering
    // and ordering so wins and losses both appear in true chronology.
    //
    // `index` is the 0-based position in the trader's *full* close_date
    // ASC stream. Downstream `MeService` consults it to apply the free
    // tier's "every 5th trade is unlocked" rule (`index % 5 === 0`).
    // We attach it here so the lock policy and the index calculation
    // never drift.
    const realClosed = trades
      .map((t, fullIdx) => ({
        t,
        real: (t.real_close_date as Date | null) ?? null,
        fullIdx,
      }))
      .filter((x) => x.real != null);
    const recent = realClosed
      .sort((a, b) => +new Date(b.real as Date) - +new Date(a.real as Date))
      .slice(0, 8)
      .map(({ t, real, fullIdx }) => ({
        id: t.id as string,
        coin: String(t.coin_name ?? ''),
        position:
          t.position === 'long' || t.position === 'short'
            ? (t.position as 'long' | 'short')
            : null,
        status: String(t.status ?? ''),
        close_date: real,
        pnl: Math.round(Number(t.pnl ?? 0) * 100) / 100,
        r: Math.round(Number(t.r ?? 0) * 100) / 100,
        index: fullIdx,
        is_locked: false,
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
        referral_code: (u.referral_code as string | null) ?? null,
      },
      stats: {
        trades: mTrades,
        wins: mWins,
        losses: mLosses,
        win_rate: mWinRate,
        total_pnl: Math.round(mPnl * 100) / 100,
        total_r: Math.round(mR * 100) / 100,
        best_trade_pnl: mBest === -Infinity ? 0 : Math.round(mBest * 100) / 100,
        worst_trade_pnl: mWorst === Infinity ? 0 : Math.round(mWorst * 100) / 100,
        virtual_balance_usd: Math.round(mBalance * 100) / 100,
        virtual_return_pct:
          Math.round(((mBalance - STARTING) / STARTING) * 10000) / 100,
      },
      all_time: {
        trades: totalTrades,
        wins,
        losses,
        win_rate: winRate,
        total_pnl: Math.round(totalPnl * 100) / 100,
        total_r: Math.round(totalR * 100) / 100,
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
  ): Promise<AnalystListItem[]> {
    const cap = Math.max(1, Math.min(100, limit));
    const sortable: Record<string, string> = {
      monthly_pnl: 'ts.monthly_pnl',
      monthly_pnl_rate: 'ts.monthly_pnl_rate',
      monthly_roi: 'ts.monthly_roi',
      monthly_win_rate: 'ts.monthly_win_rate',
      pnl: 'ts.pnl',
      win_rate: 'ts.win_rate',
      rate: 'ts.rate',
      followers: 'followers',
      name: 'u.name',
    };
    const sortCol = sortable[orderBy] ?? sortable.monthly_pnl;
    const sortDir = sortCol === 'u.name' ? 'ASC' : 'DESC';

    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT u.id::text   AS trader_id,
              u.name,
              u.first_name,
              u.last_name,
              u.image,
              u.referral_code,
              (SELECT COUNT(*)::int FROM follow_notify f
                WHERE f.trader_id = u.id AND f.follow = TRUE AND f.is_deleted = FALSE) AS followers,
              ts.win_rate, ts.monthly_win_rate, ts.pnl, ts.pnl_rate,
              ts.monthly_pnl, ts.monthly_pnl_rate, ts.monthly_r, ts.monthly_roi,
              ts.rate, ts.risk_score, ts.stat_at
         FROM "user" u
         LEFT JOIN trader_stats ts ON ts.trader_id = u.id
        WHERE u.is_trader = TRUE AND u.is_active = TRUE AND u.is_deleted = FALSE
        ORDER BY ${sortCol} ${sortDir} NULLS LAST
        LIMIT ${cap}`,
    );

    return rows.map((r) => ({
      trader_id: r.trader_id as string,
      name: (r.name as string | null) ?? null,
      first_name: (r.first_name as string | null) ?? null,
      last_name: (r.last_name as string | null) ?? null,
      image: (r.image as string | null) ?? null,
      referral_code: (r.referral_code as string | null) ?? null,
      followers: Number(r.followers ?? 0),
      stats: {
        win_rate: r.win_rate == null ? null : Number(r.win_rate),
        monthly_win_rate:
          r.monthly_win_rate == null ? null : Number(r.monthly_win_rate),
        pnl: r.pnl == null ? null : Number(r.pnl),
        pnl_rate: r.pnl_rate == null ? null : Number(r.pnl_rate),
        monthly_pnl: r.monthly_pnl == null ? null : Number(r.monthly_pnl),
        monthly_pnl_rate:
          r.monthly_pnl_rate == null ? null : Number(r.monthly_pnl_rate),
        monthly_r: r.monthly_r == null ? null : Number(r.monthly_r),
        monthly_roi: r.monthly_roi == null ? null : Number(r.monthly_roi),
        rate: r.rate == null ? null : Number(r.rate),
        risk_score: r.risk_score == null ? null : Number(r.risk_score),
        stat_at: (r.stat_at as Date | null) ?? null,
      },
    }));
  }

  /**
   * Trader leaderboard (rolling 30-day net PnL). Public method so the
   * authenticated `/me/leaderboard` controller can call it without
   * needing its own SQL — feature gates and per-viewer flags will
   * layer on top of this same projection.
   */
  async topTraders(limit: number): Promise<LandingTrader[]> {
    const capped = Math.max(1, Math.min(20, limit));
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      // `close_date` is null for many stopped trades — same fallback as
      // getTrader() so the monthly window includes stop-loss closures.
      // Without this, the leaderboard counts only manually-closed trades,
      // which biases the win-rate sharply upward (most cards end up
      // showing 100% WR because every loss is filtered out).
      // Rolling 30-day window — same as the trader detail modal.
      // Calendar months emptied the leaderboard on the 1st of every
      // month; rolling stays meaningful every day.
      //
      // LEFT JOIN onto trader_setup_pnl_performance — the PnL table is
      // refreshed by a daily cron and trails the setup table by up to
      // 24h. Without LEFT JOIN, today's closed setups disappear from
      // the leaderboard until the cron runs. With LEFT JOIN, they
      // count toward trade tallies even before PnL lands (their PnL
      // contribution is NULL=0 until the cron catches up).
      // 'closed' (manual break-even close) is included in the trade
      // count alongside success/stopped.
      `WITH monthly AS (
         SELECT s.trader_id,
                COUNT(*) FILTER (WHERE s.status = 'success'::statuses_type)::int AS success,
                COUNT(*) FILTER (WHERE s.status = 'stopped'::statuses_type)::int AS stopped,
                COUNT(*) FILTER (WHERE s.status = 'closed'::statuses_type)::int AS closed,
                COALESCE(SUM(p.estimated_pnl), 0) AS net_pnl,
                COALESCE(SUM(p.estimated_pnl_rate), 0) AS net_r
           FROM setup s
           LEFT JOIN trader_setup_pnl_performance p ON p.setup_id = s.id
          WHERE s.is_deleted = FALSE
            AND s.category = 'futures'::categories_type
            AND s.status IN ('success'::statuses_type,'stopped'::statuses_type,'closed'::statuses_type)
            AND COALESCE(s.close_date, s.stop_date, s.tp1_date, s.last_acted_at, p.updated_at, p.created_at) >= NOW() - INTERVAL '30 days'
          GROUP BY s.trader_id
       )
       SELECT u.id::text AS trader_id, u.name, u.first_name, u.last_name, u.image,
              (SELECT COUNT(*)::int FROM follow_notify f
                WHERE f.trader_id = u.id AND f.follow = TRUE AND f.is_deleted = FALSE) AS followers,
              COALESCE(m.success + m.stopped + m.closed, 0) AS trades,
              COALESCE(m.success, 0) AS wins,
              COALESCE(m.success + m.stopped, 0) AS scored_trades,
              COALESCE(m.net_pnl, 0) AS net_pnl,
              COALESCE(m.net_r, 0) AS net_r
         FROM "user" u
         LEFT JOIN monthly m ON m.trader_id = u.id
        WHERE u.is_trader = TRUE AND u.is_active = TRUE AND u.is_deleted = FALSE
          AND m.success + m.stopped + m.closed > 0
        ORDER BY m.net_pnl DESC NULLS LAST
        LIMIT ${capped}`,
    );
    const STARTING = 10000;
    return rows.map((r) => {
      const trades = Number(r.trades ?? 0);
      const wins = Number(r.wins ?? 0);
      const scored = Number(r.scored_trades ?? 0);
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
        monthly_win_rate: scored > 0 ? wins / scored : null,
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

  private async latestNews(limit: number, locale = 'en'): Promise<LandingNews[]> {
    const cap = Math.max(1, Math.min(20, limit));
    // English is the source language; for any other locale we LEFT JOIN
    // the news_text translation table and COALESCE the title / text /
    // full_text. If the translator hasn't caught up yet, the request
    // gracefully falls back to the source-language copy.
    const lang = String(locale ?? 'en').toLowerCase();
    if (lang === 'en') {
      const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT n.id::text AS id, n.title, n.text, n.source_name AS source,
                COALESCE(n.thumbnail_url, n.image_url) AS image,
                n.news_url AS url, n.date, n.sentiment,
                COALESCE(n.tickers, ARRAY[]::text[]) AS tickers
           FROM news n
          WHERE n.is_deleted = FALSE
          ORDER BY n.date DESC NULLS LAST
          LIMIT ${cap}`,
      );
      return rows.map((r) => mapNewsRow(r));
    }

    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT n.id::text AS id,
              COALESCE(nt.title, n.title) AS title,
              COALESCE(nt.text,  n.text)  AS text,
              n.source_name AS source,
              COALESCE(n.thumbnail_url, n.image_url) AS image,
              n.news_url AS url, n.date, n.sentiment,
              COALESCE(n.tickers, ARRAY[]::text[]) AS tickers
         FROM news n
         LEFT JOIN news_text nt
                ON nt.news_id = n.id AND nt.language = $1
        WHERE n.is_deleted = FALSE
        ORDER BY n.date DESC NULLS LAST
        LIMIT ${cap}`,
      lang,
    );
    return rows.map((r) => mapNewsRow(r));
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
