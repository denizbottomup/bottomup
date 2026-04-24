import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import type { PrismaClient } from '@bottomup/db';
import { PRISMA } from '../common/prisma.module.js';
import { MarketIntelService } from '../market-intel/market-intel.service.js';

export interface LandingTrader {
  trader_id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  image: string | null;
  monthly_roi: number | null;
  win_rate: number | null;
  followers: number;
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
  private readonly log = new Logger(PublicService.name);
  private waitlistReady = false;

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly intel: MarketIntelService,
  ) {}

  /**
   * Lazily ensures the `landing_waitlist` table exists. We don't manage
   * this schema via Prisma migrations (DB is introspected from the
   * legacy FastAPI service), so a CREATE IF NOT EXISTS on first call
   * keeps things self-bootstrapping without a manual DBA step.
   */
  private async ensureWaitlistTable(): Promise<void> {
    if (this.waitlistReady) return;
    await this.prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS landing_waitlist (
         id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         email       VARCHAR(256) NOT NULL UNIQUE,
         source      VARCHAR(64),
         created_at  TIMESTAMP(6) NOT NULL DEFAULT NOW(),
         notified_at TIMESTAMP(6)
       )`,
    );
    this.waitlistReady = true;
  }

  async joinWaitlist(
    email: string,
    source: string | undefined,
  ): Promise<{ ok: true; already: boolean }> {
    const clean = String(email ?? '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean) || clean.length > 256) {
      throw new BadRequestException('Geçerli bir e-posta gerekli');
    }
    const src = source
      ? String(source).replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 64) || null
      : null;
    await this.ensureWaitlistTable();
    const result = await this.prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO landing_waitlist (email, source)
       VALUES ($1, $2)
       ON CONFLICT (email) DO NOTHING
       RETURNING id::text`,
      clean,
      src,
    );
    const already = result.length === 0;
    this.log.log(`waitlist ${already ? 'dup' : 'new'} email=${clean} source=${src ?? '-'}`);
    return { ok: true, already };
  }

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

  private async topTraders(limit: number): Promise<LandingTrader[]> {
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT u.id::text AS trader_id, u.name, u.first_name, u.last_name, u.image,
              ts.monthly_roi, ts.win_rate,
              (SELECT COUNT(*)::int FROM follow_notify f
                WHERE f.trader_id = u.id AND f.follow = TRUE AND f.is_deleted = FALSE) AS followers
         FROM "user" u
         LEFT JOIN trader_stats ts ON ts.trader_id = u.id
        WHERE u.is_trader = TRUE AND u.is_active = TRUE AND u.is_deleted = FALSE
          AND EXISTS (SELECT 1 FROM setup s
                       WHERE s.trader_id = u.id
                         AND s.is_deleted = FALSE
                         AND s.status IN ('active'::statuses_type,'success'::statuses_type,'closed'::statuses_type))
        ORDER BY COALESCE(ts.monthly_roi, 0) DESC, ts.monthly_pnl DESC NULLS LAST
        LIMIT ${Math.max(1, Math.min(20, limit))}`,
    );
    return rows.map((r) => ({
      trader_id: r.trader_id as string,
      name: (r.name as string | null) ?? null,
      first_name: (r.first_name as string | null) ?? null,
      last_name: (r.last_name as string | null) ?? null,
      image: (r.image as string | null) ?? null,
      monthly_roi: r.monthly_roi == null ? null : Number(r.monthly_roi),
      win_rate: r.win_rate == null ? null : Number(r.win_rate),
      followers: Number(r.followers ?? 0),
    }));
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
      `SELECT id::text AS id, title, source_name AS source,
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
      source: (r.source as string | null) ?? null,
      image: (r.image as string | null) ?? null,
      url: (r.url as string | null) ?? null,
      date: (r.date as Date | null) ?? null,
      sentiment: (r.sentiment as string | null) ?? null,
      tickers: Array.isArray(r.tickers) ? (r.tickers as string[]).slice(0, 5) : [],
    }));
  }
}
