import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@bottomup/db';
import { PRISMA } from '../common/prisma.module.js';

export interface LeaderboardRow {
  trader_id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  image: string | null;
  monthly_pnl: number | null;
  monthly_roi: number | null;
  win_rate: number | null;
  followers: number;
}

export interface LatestSetupRow {
  id: string;
  coin_name: string;
  status: string;
  position: string | null;
  trader_id: string | null;
  trader_name: string | null;
  trader_image: string | null;
  coin_image: string | null;
  entry_value: number;
  stop_value: number | null;
  profit_taking_1: number | null;
  r_value: number | null;
  last_acted_at: Date | null;
}

export interface HotCoin {
  code: string;
  name: string | null;
  image: string | null;
  active_setups: number;
  new_setups_24h: number;
}

@Injectable()
export class AnalyticsService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async futuresLeaderboard(limit = 20): Promise<LeaderboardRow[]> {
    return this.leaderboard('futures', limit);
  }

  async spotLeaderboard(limit = 20): Promise<LeaderboardRow[]> {
    return this.leaderboard('spot', limit);
  }

  /**
   * Aggregated futures leaderboard — mobile's "all-time" view. Same join
   * surface as futuresLeaderboard but orders by total_pnl from
   * trader_setup_pnl_performance instead of the monthly rolling stat.
   */
  async futuresLeaderboardAggregated(limit = 20): Promise<LeaderboardRow[]> {
    const capped = Math.max(1, Math.min(50, Math.floor(limit)));
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT u.id::text AS trader_id, u.name, u.first_name, u.last_name, u.image,
              ts.monthly_pnl, ts.monthly_roi, ts.win_rate,
              COALESCE(
                (SELECT SUM(pnl) FROM trader_setup_pnl_performance p
                  WHERE p.trader_id = u.id),
                0
              ) AS total_pnl,
              (SELECT COUNT(*)::int FROM follow_notify f
                WHERE f.trader_id = u.id AND f.follow = TRUE AND f.is_deleted = FALSE) AS followers
         FROM "user" u
         LEFT JOIN trader_stats ts ON ts.trader_id = u.id
        WHERE u.is_trader = TRUE AND u.is_deleted = FALSE AND u.is_active = TRUE
          AND EXISTS (SELECT 1 FROM setup s
                       WHERE s.trader_id = u.id
                         AND s.is_deleted = FALSE
                         AND s.category = 'futures'::categories_type)
        ORDER BY total_pnl DESC NULLS LAST
        LIMIT ${capped}`,
    );
    return rows.map((r) => ({
      trader_id: r.trader_id as string,
      name: (r.name as string | null) ?? null,
      first_name: (r.first_name as string | null) ?? null,
      last_name: (r.last_name as string | null) ?? null,
      image: (r.image as string | null) ?? null,
      monthly_pnl: num(r.total_pnl),
      monthly_roi: num(r.monthly_roi),
      win_rate: num(r.win_rate),
      followers: Number(r.followers ?? 0),
    }));
  }

  private async leaderboard(
    category: 'spot' | 'futures',
    limit: number,
  ): Promise<LeaderboardRow[]> {
    const capped = Math.max(1, Math.min(50, Math.floor(limit)));
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT u.id::text AS trader_id, u.name, u.first_name, u.last_name, u.image,
              ts.monthly_pnl, ts.monthly_roi, ts.win_rate,
              (SELECT COUNT(*)::int FROM follow_notify f
                WHERE f.trader_id = u.id AND f.follow = TRUE AND f.is_deleted = FALSE) AS followers
         FROM trader_stats ts
         JOIN "user" u ON u.id = ts.trader_id AND u.is_deleted = FALSE AND u.is_active = TRUE
        WHERE u.is_trader = TRUE
          AND EXISTS (SELECT 1 FROM setup s
                       WHERE s.trader_id = u.id
                         AND s.is_deleted = FALSE
                         AND s.category = $1::categories_type)
          AND ts.monthly_pnl IS NOT NULL
        ORDER BY ts.monthly_pnl DESC NULLS LAST
        LIMIT ${capped}`,
      category,
    );
    return rows.map((r) => ({
      trader_id: r.trader_id as string,
      name: (r.name as string | null) ?? null,
      first_name: (r.first_name as string | null) ?? null,
      last_name: (r.last_name as string | null) ?? null,
      image: (r.image as string | null) ?? null,
      monthly_pnl: num(r.monthly_pnl),
      monthly_roi: num(r.monthly_roi),
      win_rate: num(r.win_rate),
      followers: Number(r.followers ?? 0),
    }));
  }

  async latestSetup(
    category: 'spot' | 'futures',
    limit = 15,
  ): Promise<LatestSetupRow[]> {
    const capped = Math.max(1, Math.min(50, Math.floor(limit)));
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT s.id::text       AS id,
              s.coin_name       AS coin_name,
              s.status::text    AS status,
              s.position::text  AS position,
              s.trader_id::text AS trader_id,
              u.name            AS trader_name,
              u.image           AS trader_image,
              c.image           AS coin_image,
              s.entry_value     AS entry_value,
              s.stop_value      AS stop_value,
              s.profit_taking_1 AS profit_taking_1,
              s.r_value         AS r_value,
              s.last_acted_at   AS last_acted_at
         FROM setup s
         LEFT JOIN "user" u ON u.id = s.trader_id
         LEFT JOIN coin c ON c.code = s.coin_name AND c.is_deleted = FALSE
        WHERE s.is_deleted = FALSE
          AND s.category = $1::categories_type
          AND s.status IN ('incoming','active')
        ORDER BY s.last_acted_at DESC NULLS LAST
        LIMIT ${capped}`,
      category,
    );
    return rows.map((r) => ({
      id: r.id as string,
      coin_name: r.coin_name as string,
      status: r.status as string,
      position: (r.position as string | null) ?? null,
      trader_id: (r.trader_id as string | null) ?? null,
      trader_name: (r.trader_name as string | null) ?? null,
      trader_image: (r.trader_image as string | null) ?? null,
      coin_image: (r.coin_image as string | null) ?? null,
      entry_value: Number(r.entry_value),
      stop_value: num(r.stop_value),
      profit_taking_1: num(r.profit_taking_1),
      r_value: num(r.r_value),
      last_acted_at: (r.last_acted_at as Date | null) ?? null,
    }));
  }

  async hotCoins(limit = 12): Promise<HotCoin[]> {
    const capped = Math.max(1, Math.min(50, Math.floor(limit)));
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT c.code AS code, c.name AS name, c.image AS image,
              (SELECT COUNT(*)::int FROM setup s
                WHERE s.coin_name = c.code
                  AND s.is_deleted = FALSE
                  AND s.status IN ('incoming','active')) AS active_setups,
              (SELECT COUNT(*)::int FROM setup s
                WHERE s.coin_name = c.code
                  AND s.is_deleted = FALSE
                  AND s.created_at > NOW() - INTERVAL '24 hours') AS new_setups_24h
         FROM coin c
        WHERE c.is_deleted = FALSE
        ORDER BY active_setups DESC, new_setups_24h DESC
        LIMIT ${capped}`,
    );
    return rows.map((r) => ({
      code: r.code as string,
      name: (r.name as string | null) ?? null,
      image: (r.image as string | null) ?? null,
      active_setups: Number(r.active_setups ?? 0),
      new_setups_24h: Number(r.new_setups_24h ?? 0),
    }));
  }
}

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
