import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { PrismaClient } from '@bottomup/db';
import { PRISMA } from '../common/prisma.module.js';
import type { AuthedUser } from '../common/decorators/current-user.decorator.js';

export interface SetupDetail {
  id: string;
  status: 'incoming' | 'active' | 'cancelled' | 'stopped' | 'success' | 'closed';
  sub_status: string | null;
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
  initial_entry_value: number | null;
  initial_entry_value_end: number | null;
  initial_stop_value: number | null;
  initial_profit_taking_1: number | null;
  initial_profit_taking_2: number | null;
  initial_profit_taking_3: number | null;
  r_value: number | null;
  initial_rr: string | null;
  risk_ratio: string | null;
  open_leverage: number | null;
  is_tp1: boolean | null;
  is_tp2: boolean | null;
  is_tp3: boolean | null;
  is_stop: boolean | null;
  close_price: number | null;
  close_date: Date | null;
  activation_date: Date | null;
  tp1_date: Date | null;
  tp2_date: Date | null;
  tp3_date: Date | null;
  stop_date: Date | null;
  note: string | null;
  tags: string[];
  clap_count: number;
  created_at: Date | null;
  updated_at: Date | null;
  last_acted_at: Date | null;
  trader: {
    id: string;
    name: string | null;
    first_name: string | null;
    last_name: string | null;
    image: string | null;
    is_trending: boolean;
  };
  coin: {
    code: string;
    display_name: string | null;
    image: string | null;
  };
  viewer: {
    clapped: boolean;
    reported: boolean;
    follows_trader: boolean;
  };
}

export interface SetupHistoryPoint {
  id: string;
  field: string;
  value: number | null;
  created_at: Date | null;
}

const VALID_REPORT_REASONS = /^[\s\S]{4,400}$/;

@Injectable()
export class SetupService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async detail(viewer: AuthedUser, setupId: string): Promise<SetupDetail> {
    const viewerId = await this.resolveViewerId(viewer);
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT s.id::text AS id,
              s.status::text AS status,
              s.sub_status,
              s.category::text AS category,
              s.position::text AS position,
              s.order_type::text AS order_type,
              s.coin_name,
              s.entry_value, s.entry_value_end,
              s.stop_value, s.profit_taking_1, s.profit_taking_2, s.profit_taking_3,
              s.initial_entry_value, s.initial_entry_value_end, s.initial_stop_value,
              s.initial_profit_taking_1, s.initial_profit_taking_2, s.initial_profit_taking_3,
              s.r_value, s.initial_rr, s.risk_ratio, s.open_leverage,
              s.is_tp1, s.is_tp2, s.is_tp3, s.is_stop,
              s.close_price, s.close_date, s.activation_date,
              s.tp1_date, s.tp2_date, s.tp3_date, s.stop_date,
              s.note, s.tags, s.clap_count,
              s.created_at, s.updated_at, s.last_acted_at,
              u.id::text       AS trader_id,
              u.name           AS trader_name,
              u.first_name     AS trader_first_name,
              u.last_name      AS trader_last_name,
              u.image          AS trader_image,
              u.is_trending    AS trader_is_trending,
              c.code           AS coin_code,
              c.name           AS coin_display_name,
              c.image          AS coin_image,
              EXISTS (SELECT 1 FROM clap cp
                      WHERE cp.setup_id = s.id
                        AND cp.user_id = $2::uuid
                        AND cp.is_deleted = FALSE) AS viewer_clapped,
              EXISTS (SELECT 1 FROM report rp
                      WHERE rp.setup_id = s.id
                        AND rp.user_id = $2::uuid
                        AND rp.is_deleted = FALSE) AS viewer_reported,
              EXISTS (SELECT 1 FROM follow_notify fn
                      WHERE fn.trader_id = s.trader_id
                        AND fn.user_id = $2::uuid
                        AND fn.follow = TRUE
                        AND fn.is_deleted = FALSE) AS viewer_follows
         FROM setup s
         LEFT JOIN "user" u ON u.id = s.trader_id
         LEFT JOIN coin c ON c.code = s.coin_name AND c.is_deleted = FALSE
        WHERE s.id = $1::uuid
          AND s.is_deleted = FALSE
        LIMIT 1`,
      setupId,
      viewerId,
    );
    const r = rows[0];
    if (!r) throw new NotFoundException('Setup not found');

    return {
      id: r.id as string,
      status: r.status as SetupDetail['status'],
      sub_status: (r.sub_status as string | null) ?? null,
      category: r.category as SetupDetail['category'],
      position: (r.position as SetupDetail['position']) ?? null,
      order_type: r.order_type as string,
      coin_name: r.coin_name as string,
      entry_value: Number(r.entry_value),
      entry_value_end: num(r.entry_value_end),
      stop_value: num(r.stop_value),
      profit_taking_1: num(r.profit_taking_1),
      profit_taking_2: num(r.profit_taking_2),
      profit_taking_3: num(r.profit_taking_3),
      initial_entry_value: num(r.initial_entry_value),
      initial_entry_value_end: num(r.initial_entry_value_end),
      initial_stop_value: num(r.initial_stop_value),
      initial_profit_taking_1: num(r.initial_profit_taking_1),
      initial_profit_taking_2: num(r.initial_profit_taking_2),
      initial_profit_taking_3: num(r.initial_profit_taking_3),
      r_value: num(r.r_value),
      initial_rr: (r.initial_rr as string | null) ?? null,
      risk_ratio: (r.risk_ratio as string | null) ?? null,
      open_leverage: num(r.open_leverage),
      is_tp1: (r.is_tp1 as boolean | null) ?? null,
      is_tp2: (r.is_tp2 as boolean | null) ?? null,
      is_tp3: (r.is_tp3 as boolean | null) ?? null,
      is_stop: (r.is_stop as boolean | null) ?? null,
      close_price: num(r.close_price),
      close_date: date(r.close_date),
      activation_date: date(r.activation_date),
      tp1_date: date(r.tp1_date),
      tp2_date: date(r.tp2_date),
      tp3_date: date(r.tp3_date),
      stop_date: date(r.stop_date),
      note: (r.note as string | null) ?? null,
      tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
      clap_count: intOr(r.clap_count, 0),
      created_at: date(r.created_at),
      updated_at: date(r.updated_at),
      last_acted_at: date(r.last_acted_at),
      trader: {
        id: (r.trader_id as string | null) ?? '',
        name: (r.trader_name as string | null) ?? null,
        first_name: (r.trader_first_name as string | null) ?? null,
        last_name: (r.trader_last_name as string | null) ?? null,
        image: (r.trader_image as string | null) ?? null,
        is_trending: Boolean(r.trader_is_trending),
      },
      coin: {
        code: (r.coin_code as string) ?? (r.coin_name as string),
        display_name: (r.coin_display_name as string | null) ?? null,
        image: (r.coin_image as string | null) ?? null,
      },
      viewer: {
        clapped: Boolean(r.viewer_clapped),
        reported: Boolean(r.viewer_reported),
        follows_trader: Boolean(r.viewer_follows),
      },
    };
  }

  async history(setupId: string, limit = 50): Promise<SetupHistoryPoint[]> {
    const capped = Math.max(1, Math.min(300, Math.floor(limit)));
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT id::text AS id, field, value, created_at
         FROM setup_value_history
        WHERE setup_id = $1::uuid
        ORDER BY created_at DESC NULLS LAST
        LIMIT ${capped}`,
      setupId,
    );
    return rows.map((r) => ({
      id: r.id as string,
      field: r.field as string,
      value: num(r.value),
      created_at: date(r.created_at),
    }));
  }

  async clap(viewer: AuthedUser, setupId: string): Promise<{ ok: true; clap_count: number }> {
    const viewerId = await this.resolveViewerId(viewer);
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO clap (id, created_at, updated_at, is_deleted, user_id, setup_id)
       VALUES (gen_random_uuid(), NOW(), NOW(), FALSE, $1::uuid, $2::uuid)
       ON CONFLICT (user_id, setup_id) DO UPDATE
         SET is_deleted = FALSE, updated_at = NOW()`,
      viewerId,
      setupId,
    );
    const { count } = await this.recount(setupId, +1);
    return { ok: true, clap_count: count };
  }

  async unclap(viewer: AuthedUser, setupId: string): Promise<{ ok: true; clap_count: number }> {
    const viewerId = await this.resolveViewerId(viewer);
    await this.prisma.$executeRawUnsafe(
      `UPDATE clap
          SET is_deleted = TRUE, updated_at = NOW()
        WHERE user_id = $1::uuid
          AND setup_id = $2::uuid
          AND is_deleted = FALSE`,
      viewerId,
      setupId,
    );
    const { count } = await this.recount(setupId, -1);
    return { ok: true, clap_count: count };
  }

  async report(
    viewer: AuthedUser,
    setupId: string,
    content: string,
  ): Promise<{ ok: true }> {
    if (!VALID_REPORT_REASONS.test(content ?? '')) {
      throw new BadRequestException('Report content must be 4-400 characters');
    }
    const viewerId = await this.resolveViewerId(viewer);

    const rows = await this.prisma.$queryRawUnsafe<Array<{ trader_id: string | null }>>(
      `SELECT trader_id::text AS trader_id FROM setup WHERE id = $1::uuid LIMIT 1`,
      setupId,
    );
    const row = rows[0];
    if (!row) throw new NotFoundException('Setup not found');

    await this.prisma.$executeRawUnsafe(
      `INSERT INTO report (id, created_at, updated_at, is_deleted,
                           user_id, setup_id, trader_id, content)
       VALUES (gen_random_uuid(), NOW(), NOW(), FALSE,
               $1::uuid, $2::uuid, NULLIF($3,'')::uuid, $4)
       ON CONFLICT (user_id, setup_id) DO UPDATE
         SET content = EXCLUDED.content, is_deleted = FALSE, updated_at = NOW()`,
      viewerId,
      setupId,
      row.trader_id ?? '',
      content,
    );
    return { ok: true };
  }

  /** Refresh setup.clap_count approximately from the clap table. */
  private async recount(setupId: string, delta: number): Promise<{ count: number }> {
    const res = await this.prisma.$queryRawUnsafe<Array<{ clap_count: number }>>(
      `UPDATE setup
          SET clap_count = (SELECT COUNT(*)::int FROM clap
                             WHERE setup_id = $1::uuid AND is_deleted = FALSE)
        WHERE id = $1::uuid
        RETURNING clap_count`,
      setupId,
    );
    void delta;
    const row = res[0];
    return { count: row?.clap_count ?? 0 };
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

function date(v: unknown): Date | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  return null;
}

function intOr(v: unknown, fallback: number): number {
  if (v === null || v === undefined) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}
