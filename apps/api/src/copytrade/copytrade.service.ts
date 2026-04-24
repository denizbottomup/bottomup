import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PrismaClient } from '@bottomup/db';
import { PRISMA } from '../common/prisma.module.js';
import type { AuthedUser } from '../common/decorators/current-user.decorator.js';

export interface CopyTradeRow {
  id: string;
  setup_id: string | null;
  trader_id: string | null;
  trader_name: string | null;
  trader_image: string | null;
  coin_name: string | null;
  coin_image: string | null;
  position: 'long' | 'short' | null;
  category: 'spot' | 'futures' | null;
  state: string | null;
  realized_pnl: number | null;
  roe: number | null;
  pnl_percentage: number | null;
  position_size_usd: number | null;
  leverage: number | null;
  copied_at: Date | null;
  activated_at: Date | null;
  setup_status: string | null;
}

export interface CopyTradeStats {
  total_realized: number;
  total_unrealized: number;
  active_count: number;
  closed_count: number;
  win_count: number;
  loss_count: number;
  roe_avg: number | null;
}

export interface TeamInfo {
  id: string | null;
  name: string | null;
  weekly_pnl: number | null;
  monthly_pnl: number | null;
  trader_count: number;
}

export interface TeamMember {
  team_trader_id: string;
  trader_id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  image: string | null;
  allocation_pct: number | null;
  added_at: Date | null;
}

@Injectable()
export class CopyTradeService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async team(viewer: AuthedUser): Promise<TeamInfo> {
    const viewerId = await this.resolveViewerId(viewer);
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT t.id::text AS id, t.name, t.weekly_pnl, t.monthly_pnl,
              (SELECT COUNT(*)::int FROM team_traders tt
                 WHERE tt.team_id = t.id AND tt.is_deleted = FALSE) AS trader_count
         FROM teams t
        WHERE t.user_id = $1::uuid
        LIMIT 1`,
      viewerId,
    );
    const r = rows[0];
    if (!r) {
      return {
        id: null,
        name: null,
        weekly_pnl: null,
        monthly_pnl: null,
        trader_count: 0,
      };
    }
    return {
      id: (r.id as string | null) ?? null,
      name: (r.name as string | null) ?? null,
      weekly_pnl: num(r.weekly_pnl),
      monthly_pnl: num(r.monthly_pnl),
      trader_count: Number(r.trader_count ?? 0),
    };
  }

  async stats(viewer: AuthedUser): Promise<CopyTradeStats> {
    const viewerId = await this.resolveViewerId(viewer);
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT
         COALESCE(SUM(realized_pnl) FILTER (WHERE state IN ('closed','stopped','success','failed')), 0) AS total_realized,
         COALESCE(SUM(realized_pnl) FILTER (WHERE state IN ('active','opened','partial')), 0)            AS total_unrealized,
         COUNT(*) FILTER (WHERE state IN ('active','opened','partial'))::int                             AS active_count,
         COUNT(*) FILTER (WHERE state IN ('closed','stopped','success','failed'))::int                   AS closed_count,
         COUNT(*) FILTER (WHERE realized_pnl > 0 AND state IN ('closed','success'))::int                 AS win_count,
         COUNT(*) FILTER (WHERE realized_pnl < 0 AND state IN ('closed','stopped','failed'))::int        AS loss_count,
         AVG(roe)                                                                                          AS roe_avg
       FROM copy_trades
       WHERE user_id = $1::uuid AND is_deleted = FALSE`,
      viewerId,
    );
    const r = rows[0] ?? {};
    return {
      total_realized: Number(r.total_realized ?? 0),
      total_unrealized: Number(r.total_unrealized ?? 0),
      active_count: Number(r.active_count ?? 0),
      closed_count: Number(r.closed_count ?? 0),
      win_count: Number(r.win_count ?? 0),
      loss_count: Number(r.loss_count ?? 0),
      roe_avg: num(r.roe_avg),
    };
  }

  async setups(
    viewer: AuthedUser,
    state: 'active' | 'closed' | 'all',
    limit = 100,
  ): Promise<CopyTradeRow[]> {
    const viewerId = await this.resolveViewerId(viewer);
    const capped = Math.max(1, Math.min(300, Math.floor(limit)));
    const stateFilter =
      state === 'active'
        ? `AND ct.state IN ('active','opened','partial')`
        : state === 'closed'
          ? `AND ct.state IN ('closed','stopped','success','failed')`
          : '';

    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT ct.id::text                AS id,
              ct.setup_id::text           AS setup_id,
              ct.trader_id::text          AS trader_id,
              u.name                      AS trader_name,
              u.image                     AS trader_image,
              s.coin_name                 AS coin_name,
              c.image                     AS coin_image,
              s.position::text            AS position,
              s.category::text            AS category,
              ct.state                    AS state,
              ct.realized_pnl             AS realized_pnl,
              ct.roe                      AS roe,
              ct.pnl_percentage           AS pnl_percentage,
              ct.position_size_usd        AS position_size_usd,
              ct.leverage                 AS leverage,
              ct.copied_at                AS copied_at,
              ct.activated_at             AS activated_at,
              s.status::text              AS setup_status
         FROM copy_trades ct
         LEFT JOIN setup s ON s.id = ct.setup_id
         LEFT JOIN "user" u ON u.id = ct.trader_id
         LEFT JOIN coin c ON c.code = s.coin_name AND c.is_deleted = FALSE
        WHERE ct.user_id = $1::uuid
          AND ct.is_deleted = FALSE
          ${stateFilter}
        ORDER BY ct.copied_at DESC NULLS LAST
        LIMIT ${capped}`,
      viewerId,
    );

    return rows.map((r) => ({
      id: r.id as string,
      setup_id: (r.setup_id as string | null) ?? null,
      trader_id: (r.trader_id as string | null) ?? null,
      trader_name: (r.trader_name as string | null) ?? null,
      trader_image: (r.trader_image as string | null) ?? null,
      coin_name: (r.coin_name as string | null) ?? null,
      coin_image: (r.coin_image as string | null) ?? null,
      position: (r.position as 'long' | 'short' | null) ?? null,
      category: (r.category as 'spot' | 'futures' | null) ?? null,
      state: (r.state as string | null) ?? null,
      realized_pnl: num(r.realized_pnl),
      roe: num(r.roe),
      pnl_percentage: num(r.pnl_percentage),
      position_size_usd: num(r.position_size_usd),
      leverage: num(r.leverage),
      copied_at: (r.copied_at as Date | null) ?? null,
      activated_at: (r.activated_at as Date | null) ?? null,
      setup_status: (r.setup_status as string | null) ?? null,
    }));
  }

  async listMembers(viewer: AuthedUser): Promise<{ items: TeamMember[] }> {
    const viewerId = await this.resolveViewerId(viewer);
    const team = await this.findTeam(viewerId);
    if (!team) return { items: [] };
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT tt.id::text        AS team_trader_id,
              u.id::text          AS trader_id,
              u.name              AS name,
              u.first_name        AS first_name,
              u.last_name         AS last_name,
              u.image             AS image,
              tt.created_at       AS added_at
         FROM team_traders tt
         JOIN "user" u ON u.id = tt.trader_id AND u.is_deleted = FALSE
        WHERE tt.team_id = $1::uuid
          AND tt.is_deleted = FALSE
        ORDER BY tt.created_at DESC NULLS LAST`,
      team.id,
    );
    return {
      items: rows.map((r) => ({
        team_trader_id: r.team_trader_id as string,
        trader_id: r.trader_id as string,
        name: (r.name as string | null) ?? null,
        first_name: (r.first_name as string | null) ?? null,
        last_name: (r.last_name as string | null) ?? null,
        image: (r.image as string | null) ?? null,
        allocation_pct: null,
        added_at: (r.added_at as Date | null) ?? null,
      })),
    };
  }

  async renameTeam(viewer: AuthedUser, name: string): Promise<TeamInfo> {
    const trimmed = String(name ?? '').trim().slice(0, 60);
    if (trimmed.length === 0) throw new BadRequestException('name required');
    const viewerId = await this.resolveViewerId(viewer);
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO teams (id, user_id, name)
       VALUES (gen_random_uuid(), $1::uuid, $2)
       ON CONFLICT (user_id) DO UPDATE SET name = EXCLUDED.name`,
      viewerId,
      trimmed,
    );
    return this.team(viewer);
  }

  async addTeamTrader(
    viewer: AuthedUser,
    traderId: string,
  ): Promise<{ ok: true }> {
    const viewerId = await this.resolveViewerId(viewer);
    const team = await this.ensureTeam(viewerId);
    const exists = await this.prisma.$queryRawUnsafe<Array<{ is_trader: boolean }>>(
      `SELECT is_trader FROM "user" WHERE id = $1::uuid LIMIT 1`,
      traderId,
    );
    if (!exists[0]) throw new NotFoundException('Trader not found');
    if (!exists[0].is_trader) {
      throw new BadRequestException('Target is not a trader');
    }
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO team_traders (id, team_id, trader_id, is_deleted, created_at, updated_at)
       VALUES (gen_random_uuid(), $1::uuid, $2::uuid, FALSE, NOW(), NOW())
       ON CONFLICT (team_id, trader_id) DO UPDATE
         SET is_deleted = FALSE, updated_at = NOW()`,
      team.id,
      traderId,
    );
    return { ok: true };
  }

  async removeTeamTrader(
    viewer: AuthedUser,
    traderId: string,
  ): Promise<{ ok: true }> {
    const viewerId = await this.resolveViewerId(viewer);
    const team = await this.findTeam(viewerId);
    if (!team) throw new NotFoundException('Team not found');
    await this.prisma.$executeRawUnsafe(
      `UPDATE team_traders
          SET is_deleted = TRUE, updated_at = NOW()
        WHERE team_id = $1::uuid AND trader_id = $2::uuid`,
      team.id,
      traderId,
    );
    return { ok: true };
  }

  async deleteTeam(viewer: AuthedUser): Promise<{ ok: true }> {
    const viewerId = await this.resolveViewerId(viewer);
    const team = await this.findTeam(viewerId);
    if (!team) return { ok: true };
    await this.prisma.$executeRawUnsafe(
      `UPDATE team_traders SET is_deleted = TRUE, updated_at = NOW()
        WHERE team_id = $1::uuid`,
      team.id,
    );
    return { ok: true };
  }

  private async findTeam(viewerId: string): Promise<{ id: string } | null> {
    const rows = await this.prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id::text AS id FROM teams WHERE user_id = $1::uuid LIMIT 1`,
      viewerId,
    );
    return rows[0] ?? null;
  }

  private async ensureTeam(viewerId: string): Promise<{ id: string }> {
    const existing = await this.findTeam(viewerId);
    if (existing) return existing;
    const rows = await this.prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO teams (id, user_id, name)
       VALUES (gen_random_uuid(), $1::uuid, 'Takımım')
       ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
       RETURNING id::text AS id`,
      viewerId,
    );
    const row = rows[0];
    if (!row) throw new ForbiddenException('Unable to create team');
    return row;
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
