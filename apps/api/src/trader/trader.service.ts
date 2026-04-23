import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { PrismaClient } from '@bottomup/db';
import { PRISMA } from '../common/prisma.module.js';
import type { AuthedUser } from '../common/decorators/current-user.decorator.js';

export interface TraderCardRow {
  id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  image: string | null;
  cover_image: string | null;
  content: string | null;
  is_trending: boolean;
  monthly_roi: string | null;
  followers: number;
  active_setups: number;
  viewer_following: boolean;
}

export interface TraderProfileDetail {
  id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  image: string | null;
  cover_image: string | null;
  content: string | null;
  instagram: string | null;
  telegram: string | null;
  twitter: string | null;
  is_trader: boolean;
  is_trending: boolean;
  monthly_roi: string | null;
  referral_code: string | null;
  rate: number | null;
  rank_score: number | null;
  stats: {
    followers: number;
    active_setups: number;
    closed_setups: number;
    total_claps: number;
    pnl_total: number | null;
    pnl_avg_rate: number | null;
    win_rate: number | null;
  };
  viewer: {
    is_following: boolean;
    is_blocked: boolean;
    notify_enabled: boolean;
    is_self: boolean;
  };
}

export interface TraderSetupRow {
  id: string;
  status: 'incoming' | 'active' | 'cancelled' | 'stopped' | 'success' | 'closed';
  category: 'spot' | 'futures';
  position: 'long' | 'short' | null;
  order_type: string;
  coin_name: string;
  entry_value: number;
  entry_value_end: number | null;
  stop_value: number | null;
  profit_taking_1: number | null;
  profit_taking_2: number | null;
  profit_taking_3: number | null;
  r_value: number | null;
  is_tp1: boolean | null;
  is_tp2: boolean | null;
  is_tp3: boolean | null;
  close_price: number | null;
  last_acted_at: Date | null;
  created_at: Date | null;
  close_date: Date | null;
  coin_image: string | null;
  coin_display_name: string | null;
}

const ALLOWED_STATUSES = ['incoming', 'active', 'cancelled', 'stopped', 'success', 'closed'] as const;
type TraderStatus = (typeof ALLOWED_STATUSES)[number];

@Injectable()
export class TraderService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  /**
   * Daily PnL timeseries for a trader's closed/successful setups over
   * the requested range (defaults to 180 days). Returns one row per
   * day with the day's realised PnL and a running cumulative total —
   * enough to render a trader PnL area chart without a second request.
   */
  async analytics(
    traderId: string,
    days: number,
  ): Promise<{
    points: Array<{ date: string; pnl: number; pnl_rate: number | null; cumulative: number; trades: number }>;
    stats: { total_pnl: number; avg_pnl_rate: number | null; win_rate: number | null; monthly_pnl: number | null; monthly_roi: number | null; risk_score: number | null };
  }> {
    const clamped = Math.max(7, Math.min(365, Math.floor(days)));
    const dayRows = await this.prisma.$queryRawUnsafe<
      Array<{ d: Date; pnl: number | null; pnl_rate_avg: number | null; n: number }>
    >(
      `SELECT DATE_TRUNC('day', COALESCE(s.close_date, s.tp1_date, p.updated_at, p.created_at))::date AS d,
              COALESCE(SUM(p.pnl), 0) AS pnl,
              AVG(p.pnl_rate)          AS pnl_rate_avg,
              COUNT(*)::int            AS n
         FROM trader_setup_pnl_performance p
         JOIN setup s ON s.id = p.setup_id
        WHERE p.trader_id = $1::uuid
          AND COALESCE(s.close_date, s.tp1_date, p.updated_at, p.created_at) >= NOW() - ($2::int || ' days')::interval
          AND s.is_deleted = FALSE
        GROUP BY 1
        ORDER BY 1 ASC`,
      traderId,
      clamped,
    );

    let cumulative = 0;
    const points = dayRows.map((r) => {
      const pnl = r.pnl != null ? Number(r.pnl) : 0;
      cumulative += pnl;
      const iso = r.d instanceof Date ? r.d.toISOString().slice(0, 10) : String(r.d).slice(0, 10);
      return {
        date: iso,
        pnl,
        pnl_rate:
          r.pnl_rate_avg != null && Number.isFinite(Number(r.pnl_rate_avg))
            ? Number(r.pnl_rate_avg)
            : null,
        cumulative,
        trades: Number(r.n ?? 0),
      };
    });

    const statsRows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT pnl, pnl_rate, win_rate, monthly_pnl, monthly_roi, risk_score
         FROM trader_stats
        WHERE trader_id = $1::uuid
        LIMIT 1`,
      traderId,
    );
    const s = statsRows[0] ?? {};
    const stats = {
      total_pnl: Number(s.pnl ?? 0),
      avg_pnl_rate: numOrNull(s.pnl_rate),
      win_rate: numOrNull(s.win_rate),
      monthly_pnl: numOrNull(s.monthly_pnl),
      monthly_roi: numOrNull(s.monthly_roi),
      risk_score: numOrNull(s.risk_score),
    };

    return { points, stats };
  }

  async search(
    viewer: AuthedUser,
    opts: { sort?: 'trending' | 'followers' | 'new'; limit?: number; onlyFollowed?: boolean },
  ): Promise<TraderCardRow[]> {
    const viewerId = await this.resolveViewerId(viewer);
    const capped = Math.max(1, Math.min(200, Math.floor(opts.limit ?? 40)));
    const order =
      opts.sort === 'new'
        ? 'u.created_at DESC NULLS LAST'
        : opts.sort === 'followers'
          ? 'followers DESC'
          : 'u.is_trending DESC, followers DESC';

    const followFilter = opts.onlyFollowed
      ? `EXISTS (SELECT 1 FROM follow_notify fn
                   WHERE fn.trader_id = u.id AND fn.user_id = $1::uuid
                     AND fn.follow = TRUE AND fn.is_deleted = FALSE)`
      : `TRUE`;

    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT u.id::text AS id, u.name, u.first_name, u.last_name, u.image,
              u.is_trending, u.monthly_roi, u.rate,
              tp.cover_image AS cover_image, tp.content AS content,
              (SELECT COUNT(*)::int FROM follow_notify f
                WHERE f.trader_id = u.id AND f.follow = TRUE AND f.is_deleted = FALSE) AS followers,
              (SELECT COUNT(*)::int FROM setup s
                WHERE s.trader_id = u.id AND s.is_deleted = FALSE
                  AND s.status = 'active'::statuses_type) AS active_setups,
              COALESCE((SELECT fn.follow FROM follow_notify fn
                         WHERE fn.user_id = $1::uuid AND fn.trader_id = u.id
                           AND fn.is_deleted = FALSE), FALSE) AS viewer_following
         FROM "user" u
         LEFT JOIN trader_profile tp ON tp.trader_id = u.id AND tp.is_deleted = FALSE
        WHERE u.is_trader = TRUE
          AND u.is_deleted = FALSE
          AND u.is_active = TRUE
          AND ${followFilter}
        ORDER BY ${order}
        LIMIT ${capped}`,
      viewerId,
    );

    return rows.map((r) => ({
      id: r.id as string,
      name: (r.name as string | null) ?? null,
      first_name: (r.first_name as string | null) ?? null,
      last_name: (r.last_name as string | null) ?? null,
      image: (r.image as string | null) ?? null,
      cover_image: (r.cover_image as string | null) ?? null,
      content: (r.content as string | null) ?? null,
      is_trending: Boolean(r.is_trending),
      monthly_roi: (r.monthly_roi as string | null) ?? null,
      followers: Number(r.followers ?? 0),
      active_setups: Number(r.active_setups ?? 0),
      viewer_following: Boolean(r.viewer_following),
    }));
  }

  async profile(viewer: AuthedUser, traderId: string): Promise<TraderProfileDetail> {
    const viewerId = await this.resolveViewerId(viewer);
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `WITH base AS (
         SELECT u.id::text AS id, u.name, u.first_name, u.last_name, u.image,
                u.instagram, u.telegram, u.twitter,
                u.is_trader, u.is_trending, u.monthly_roi, u.referral_code, u.rate,
                tp.cover_image AS cover_image, tp.content AS content,
                (SELECT COUNT(*)::int FROM follow_notify f
                   WHERE f.trader_id = u.id AND f.follow = TRUE AND f.is_deleted = FALSE) AS followers,
                (SELECT COUNT(*)::int FROM setup s
                   WHERE s.trader_id = u.id AND s.is_deleted = FALSE AND s.status = 'active'::statuses_type) AS active_setups,
                (SELECT COUNT(*)::int FROM setup s
                   WHERE s.trader_id = u.id AND s.is_deleted = FALSE AND s.status IN ('success'::statuses_type,'closed'::statuses_type,'stopped'::statuses_type)) AS closed_setups,
                (SELECT COALESCE(SUM(clap_count), 0)::int FROM setup s
                   WHERE s.trader_id = u.id AND s.is_deleted = FALSE) AS total_claps,
                (SELECT AVG(rank_score) FROM setup s
                   WHERE s.trader_id = u.id AND s.is_deleted = FALSE AND s.rank_score IS NOT NULL) AS rank_score_avg,
                (SELECT COALESCE(SUM(pnl), 0) FROM trader_setup_pnl_performance p
                   WHERE p.trader_id = u.id) AS pnl_total,
                (SELECT AVG(pnl_rate) FROM trader_setup_pnl_performance p
                   WHERE p.trader_id = u.id AND p.pnl_rate IS NOT NULL) AS pnl_avg_rate,
                (SELECT (
                   COUNT(*) FILTER (WHERE s.status IN ('success'::statuses_type,'closed'::statuses_type))::float
                   / NULLIF(COUNT(*) FILTER (WHERE s.status IN ('success'::statuses_type,'closed'::statuses_type,'stopped'::statuses_type)), 0)
                 ) FROM setup s
                   WHERE s.trader_id = u.id AND s.is_deleted = FALSE) AS win_rate
           FROM "user" u
           LEFT JOIN trader_profile tp ON tp.trader_id = u.id AND tp.is_deleted = FALSE
          WHERE u.id = $1::uuid
            AND u.is_deleted = FALSE
          LIMIT 1
       )
       SELECT b.*,
              COALESCE((SELECT fn.follow FROM follow_notify fn
                         WHERE fn.user_id = $2::uuid AND fn.trader_id = $1::uuid
                           AND fn.is_deleted = FALSE), FALSE) AS viewer_follow,
              COALESCE((SELECT fn.block FROM follow_notify fn
                         WHERE fn.user_id = $2::uuid AND fn.trader_id = $1::uuid
                           AND fn.is_deleted = FALSE), FALSE) AS viewer_block
         FROM base b`,
      traderId,
      viewerId,
    );

    const r = rows[0];
    if (!r) throw new NotFoundException('Trader not found');

    return {
      id: r.id as string,
      name: (r.name as string | null) ?? null,
      first_name: (r.first_name as string | null) ?? null,
      last_name: (r.last_name as string | null) ?? null,
      image: (r.image as string | null) ?? null,
      cover_image: (r.cover_image as string | null) ?? null,
      content: (r.content as string | null) ?? null,
      instagram: (r.instagram as string | null) ?? null,
      telegram: (r.telegram as string | null) ?? null,
      twitter: (r.twitter as string | null) ?? null,
      is_trader: Boolean(r.is_trader),
      is_trending: Boolean(r.is_trending),
      monthly_roi: (r.monthly_roi as string | null) ?? null,
      referral_code: (r.referral_code as string | null) ?? null,
      rate: num(r.rate),
      rank_score: num(r.rank_score_avg),
      stats: {
        followers: intOr(r.followers, 0),
        active_setups: intOr(r.active_setups, 0),
        closed_setups: intOr(r.closed_setups, 0),
        total_claps: intOr(r.total_claps, 0),
        pnl_total: num(r.pnl_total),
        pnl_avg_rate: num(r.pnl_avg_rate),
        win_rate: num(r.win_rate),
      },
      viewer: {
        is_following: Boolean(r.viewer_follow),
        is_blocked: Boolean(r.viewer_block),
        notify_enabled: Boolean(r.viewer_follow),
        is_self: traderId === viewerId,
      },
    };
  }

  async setups(traderId: string, statusRaw: string | undefined, limit: number): Promise<TraderSetupRow[]> {
    const statuses = this.parseStatusFilter(statusRaw);
    const capped = Math.max(1, Math.min(200, Math.floor(limit)));

    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT s.id::text AS id,
              s.status::text AS status,
              s.category::text AS category,
              s.position::text AS position,
              s.order_type::text AS order_type,
              s.coin_name,
              s.entry_value, s.entry_value_end,
              s.stop_value, s.profit_taking_1, s.profit_taking_2, s.profit_taking_3,
              s.r_value,
              s.is_tp1, s.is_tp2, s.is_tp3,
              s.close_price, s.last_acted_at, s.created_at, s.close_date,
              c.image AS coin_image, c.name AS coin_display_name
         FROM setup s
         LEFT JOIN coin c ON c.code = s.coin_name AND c.is_deleted = FALSE
        WHERE s.trader_id = $1::uuid
          AND s.is_deleted = FALSE
          AND s.status::text = ANY($2::text[])
        ORDER BY COALESCE(s.last_acted_at, s.created_at) DESC NULLS LAST
        LIMIT ${capped}`,
      traderId,
      statuses,
    );

    return rows.map((r) => ({
      id: r.id as string,
      status: r.status as TraderSetupRow['status'],
      category: r.category as TraderSetupRow['category'],
      position: (r.position as TraderSetupRow['position']) ?? null,
      order_type: r.order_type as string,
      coin_name: r.coin_name as string,
      entry_value: Number(r.entry_value),
      entry_value_end: num(r.entry_value_end),
      stop_value: num(r.stop_value),
      profit_taking_1: num(r.profit_taking_1),
      profit_taking_2: num(r.profit_taking_2),
      profit_taking_3: num(r.profit_taking_3),
      r_value: num(r.r_value),
      is_tp1: (r.is_tp1 as boolean | null) ?? null,
      is_tp2: (r.is_tp2 as boolean | null) ?? null,
      is_tp3: (r.is_tp3 as boolean | null) ?? null,
      close_price: num(r.close_price),
      last_acted_at: (r.last_acted_at as Date | null) ?? null,
      created_at: (r.created_at as Date | null) ?? null,
      close_date: (r.close_date as Date | null) ?? null,
      coin_image: (r.coin_image as string | null) ?? null,
      coin_display_name: (r.coin_display_name as string | null) ?? null,
    }));
  }

  /**
   * Upsert a follow_notify row for (viewer, trader). Mobile semantics:
   * PUT /user/traders/:id → create or re-enable follow.
   * DELETE /user/traders/:id → soft-delete / unfollow.
   */
  async follow(viewer: AuthedUser, traderId: string): Promise<{ ok: true }> {
    const viewerId = await this.resolveViewerId(viewer);
    if (viewerId === traderId) return { ok: true };
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO follow_notify (id, created_at, updated_at, is_deleted, user_id, trader_id, follow, block)
       VALUES (gen_random_uuid(), NOW(), NOW(), FALSE, $1::uuid, $2::uuid, TRUE, FALSE)
       ON CONFLICT (user_id, trader_id)
       DO UPDATE SET follow = TRUE, is_deleted = FALSE, updated_at = NOW()`,
      viewerId,
      traderId,
    );
    return { ok: true };
  }

  async unfollow(viewer: AuthedUser, traderId: string): Promise<{ ok: true }> {
    const viewerId = await this.resolveViewerId(viewer);
    await this.prisma.$executeRawUnsafe(
      `UPDATE follow_notify
          SET follow = FALSE, updated_at = NOW()
        WHERE user_id = $1::uuid AND trader_id = $2::uuid`,
      viewerId,
      traderId,
    );
    return { ok: true };
  }

  private parseStatusFilter(raw: string | undefined): string[] {
    if (!raw) return ['active', 'incoming'];
    const parts = raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((s): s is TraderStatus => (ALLOWED_STATUSES as readonly string[]).includes(s));
    return parts.length > 0 ? parts : ['active', 'incoming'];
  }

  private async resolveViewerId(viewer: AuthedUser): Promise<string> {
    if (viewer.kind === 'jwt') return viewer.sub;
    const rows = await this.prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id::text AS id FROM "user" WHERE uid = $1 LIMIT 1`,
      viewer.uid,
    );
    const row = rows[0];
    if (!row) throw new NotFoundException(`Viewer not found for uid ${viewer.uid}`);
    return row.id;
  }
}

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function numOrNull(v: unknown): number | null {
  return num(v);
}

function intOr(v: unknown, fallback: number): number {
  if (v === null || v === undefined) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}
