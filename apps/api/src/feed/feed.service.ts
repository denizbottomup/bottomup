import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@bottomup/db';
import { PRISMA } from '../common/prisma.module.js';
import type { AuthedUser } from '../common/decorators/current-user.decorator.js';

export interface SetupCardRow {
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
  activation_date: Date | null;
  created_at: Date | null;
  last_acted_at: Date | null;
  is_tp1: boolean | null;
  is_tp2: boolean | null;
  is_tp3: boolean | null;
  close_price: number | null;
  trader: {
    id: string;
    name: string | null;
    first_name: string | null;
    last_name: string | null;
    image: string | null;
    cover_image: string | null;
  };
  coin: {
    code: string;
    display_name: string | null;
    image: string | null;
  };
}

@Injectable()
export class FeedService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  /**
   * Setups from traders the viewer follows, filtered by status.
   *   incoming → "Opportunities" (pending, not yet triggered)
   *   active   → "Active"        (entry hit, position is live)
   *
   * Uses the replicated Railway copy of `setup`, `user`, `trader_profile`,
   * `coin`, and `follow_notify`. Hidden/deleted setups and unfollowed
   * traders are filtered out at the SQL layer.
   */
  async listByStatus(
    viewer: AuthedUser,
    status: 'incoming' | 'active',
    limit = 100,
  ): Promise<SetupCardRow[]> {
    const viewerId = await this.resolveViewerId(viewer);

    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT s.id::text                AS id,
              s.status                  AS status,
              s.category                AS category,
              s.position                AS position,
              s.order_type              AS order_type,
              s.coin_name               AS coin_name,
              s.entry_value             AS entry_value,
              s.entry_value_end         AS entry_value_end,
              s.stop_value              AS stop_value,
              s.profit_taking_1         AS profit_taking_1,
              s.profit_taking_2         AS profit_taking_2,
              s.profit_taking_3         AS profit_taking_3,
              s.r_value                 AS r_value,
              s.activation_date         AS activation_date,
              s.created_at              AS created_at,
              s.last_acted_at           AS last_acted_at,
              s.is_tp1                  AS is_tp1,
              s.is_tp2                  AS is_tp2,
              s.is_tp3                  AS is_tp3,
              s.close_price             AS close_price,
              u.id::text                AS trader_id,
              u.name                    AS trader_name,
              u.first_name              AS trader_first_name,
              u.last_name               AS trader_last_name,
              u.image                   AS trader_image,
              tp.cover_image            AS trader_cover_image,
              c.code                    AS coin_code,
              c.name                    AS coin_display_name,
              c.image                   AS coin_image
         FROM "setup" s
         JOIN "user" u
           ON u.id = s.trader_id
          AND u.is_deleted = FALSE
         JOIN "follow_notify" f
           ON f.trader_id = s.trader_id
          AND f.user_id   = $1::uuid
          AND f.follow    = TRUE
          AND f.is_deleted = FALSE
         LEFT JOIN "trader_profile" tp
           ON tp.trader_id = s.trader_id
          AND tp.is_deleted = FALSE
         LEFT JOIN "coin" c
           ON c.code = s.coin_name
          AND c.is_deleted = FALSE
        WHERE s.status = $2::statuses_type
          AND s.is_deleted = FALSE
          AND s.is_hidden  = FALSE
        ORDER BY s.last_acted_at DESC NULLS LAST, s.created_at DESC NULLS LAST
        LIMIT ${Number(limit)}`,
      viewerId,
      status,
    );

    return rows.map((r) => ({
      id: r.id as string,
      status: r.status as SetupCardRow['status'],
      category: r.category as SetupCardRow['category'],
      position: (r.position ?? null) as SetupCardRow['position'],
      order_type: r.order_type as string,
      coin_name: r.coin_name as string,
      entry_value: Number(r.entry_value),
      entry_value_end: numOrNull(r.entry_value_end),
      stop_value: numOrNull(r.stop_value),
      profit_taking_1: numOrNull(r.profit_taking_1),
      profit_taking_2: numOrNull(r.profit_taking_2),
      profit_taking_3: numOrNull(r.profit_taking_3),
      r_value: numOrNull(r.r_value),
      activation_date: (r.activation_date ?? null) as Date | null,
      created_at: (r.created_at ?? null) as Date | null,
      last_acted_at: (r.last_acted_at ?? null) as Date | null,
      is_tp1: (r.is_tp1 ?? null) as boolean | null,
      is_tp2: (r.is_tp2 ?? null) as boolean | null,
      is_tp3: (r.is_tp3 ?? null) as boolean | null,
      close_price: numOrNull(r.close_price),
      trader: {
        id: r.trader_id as string,
        name: (r.trader_name ?? null) as string | null,
        first_name: (r.trader_first_name ?? null) as string | null,
        last_name: (r.trader_last_name ?? null) as string | null,
        image: (r.trader_image ?? null) as string | null,
        cover_image: (r.trader_cover_image ?? null) as string | null,
      },
      coin: {
        code: (r.coin_code as string) ?? (r.coin_name as string),
        display_name: (r.coin_display_name ?? null) as string | null,
        image: (r.coin_image ?? null) as string | null,
      },
    }));
  }

  private async resolveViewerId(viewer: AuthedUser): Promise<string> {
    if (viewer.kind === 'jwt') return viewer.sub;
    const rows = await this.prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id::text AS id FROM "user" WHERE uid = $1 LIMIT 1`,
      viewer.uid,
    );
    const row = rows[0];
    if (!row) {
      throw new Error(`Viewer not found for Firebase uid ${viewer.uid}`);
    }
    return row.id;
  }
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
