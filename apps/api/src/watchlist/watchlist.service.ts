import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { PrismaClient } from '@bottomup/db';
import { PRISMA } from '../common/prisma.module.js';
import type { AuthedUser } from '../common/decorators/current-user.decorator.js';

export interface WatchlistItem {
  id: string;
  added_at: Date | null;
  setup: {
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
    trader: {
      id: string;
      name: string | null;
      first_name: string | null;
      last_name: string | null;
      image: string | null;
    };
    coin: {
      code: string;
      display_name: string | null;
      image: string | null;
    };
  };
}

@Injectable()
export class WatchlistService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async list(viewer: AuthedUser, limit = 200): Promise<WatchlistItem[]> {
    const viewerId = await this.resolveViewerId(viewer);
    const capped = Math.max(1, Math.min(500, Math.floor(limit)));
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT w.id::text                AS wid,
              w.created_at              AS wcreated,
              s.id::text                AS id,
              s.status::text            AS status,
              s.category::text          AS category,
              s.position::text          AS position,
              s.order_type::text        AS order_type,
              s.coin_name,
              s.entry_value, s.entry_value_end,
              s.stop_value, s.profit_taking_1, s.profit_taking_2, s.profit_taking_3,
              s.r_value, s.is_tp1, s.is_tp2, s.is_tp3,
              u.id::text                AS trader_id,
              u.name                    AS trader_name,
              u.first_name              AS trader_first_name,
              u.last_name               AS trader_last_name,
              u.image                   AS trader_image,
              c.code                    AS coin_code,
              c.name                    AS coin_display_name,
              c.image                   AS coin_image
         FROM watch_list w
         JOIN setup s ON s.id = w.setup_id AND s.is_deleted = FALSE
         LEFT JOIN "user" u ON u.id = s.trader_id
         LEFT JOIN coin c ON c.code = s.coin_name AND c.is_deleted = FALSE
        WHERE w.user_id = $1::uuid
          AND w.is_deleted = FALSE
        ORDER BY w.created_at DESC NULLS LAST
        LIMIT ${capped}`,
      viewerId,
    );

    return rows.map((r) => ({
      id: r.wid as string,
      added_at: (r.wcreated as Date | null) ?? null,
      setup: {
        id: r.id as string,
        status: r.status as WatchlistItem['setup']['status'],
        category: r.category as WatchlistItem['setup']['category'],
        position: (r.position as WatchlistItem['setup']['position']) ?? null,
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
        trader: {
          id: (r.trader_id as string | null) ?? '',
          name: (r.trader_name as string | null) ?? null,
          first_name: (r.trader_first_name as string | null) ?? null,
          last_name: (r.trader_last_name as string | null) ?? null,
          image: (r.trader_image as string | null) ?? null,
        },
        coin: {
          code: (r.coin_code as string) ?? (r.coin_name as string),
          display_name: (r.coin_display_name as string | null) ?? null,
          image: (r.coin_image as string | null) ?? null,
        },
      },
    }));
  }

  async watched(viewer: AuthedUser, setupId: string): Promise<{ watched: boolean }> {
    const viewerId = await this.resolveViewerId(viewer);
    const rows = await this.prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
      `SELECT EXISTS (
         SELECT 1 FROM watch_list
          WHERE user_id = $1::uuid AND setup_id = $2::uuid AND is_deleted = FALSE
       )::boolean AS exists`,
      viewerId,
      setupId,
    );
    return { watched: Boolean(rows[0]?.exists) };
  }

  async add(viewer: AuthedUser, setupId: string): Promise<{ ok: true }> {
    const viewerId = await this.resolveViewerId(viewer);
    const exists = await this.prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id::text AS id FROM setup WHERE id = $1::uuid AND is_deleted = FALSE LIMIT 1`,
      setupId,
    );
    if (exists.length === 0) throw new NotFoundException('Setup not found');

    await this.prisma.$executeRawUnsafe(
      `INSERT INTO watch_list (id, created_at, updated_at, is_deleted, user_id, setup_id)
       VALUES (gen_random_uuid(), NOW(), NOW(), FALSE, $1::uuid, $2::uuid)
       ON CONFLICT (user_id, setup_id) DO UPDATE
         SET is_deleted = FALSE, updated_at = NOW()`,
      viewerId,
      setupId,
    );
    return { ok: true };
  }

  async remove(viewer: AuthedUser, setupId: string): Promise<{ ok: true }> {
    const viewerId = await this.resolveViewerId(viewer);
    await this.prisma.$executeRawUnsafe(
      `UPDATE watch_list
          SET is_deleted = TRUE, updated_at = NOW()
        WHERE user_id = $1::uuid
          AND setup_id = $2::uuid
          AND is_deleted = FALSE`,
      viewerId,
      setupId,
    );
    return { ok: true };
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
