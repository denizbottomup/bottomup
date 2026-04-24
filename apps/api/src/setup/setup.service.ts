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
  image_success: string | null;
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

  /**
   * Trader-authored setup publish. Mobile uses PUT /setup/ with a JSON
   * body; we accept the same shape plus support POST for web forms that
   * are friendlier with HTML method conventions. Only users marked
   * is_trader may publish.
   *
   * Validations match the mobile client:
   *   - coin_name must be a non-empty uppercase USDT pair
   *   - entry_value > 0, stop_value opposite side of entry for the chosen
   *     direction, TP1 must be on the profit side
   *   - category, position, order_type validated against enums
   */
  async create(
    viewer: AuthedUser,
    body: {
      coin_name: string;
      category: 'spot' | 'futures';
      position: 'long' | 'short';
      order_type?: 'market' | 'limit' | 'stop';
      entry_value: number;
      entry_value_end?: number | null;
      stop_value?: number | null;
      profit_taking_1?: number | null;
      profit_taking_2?: number | null;
      profit_taking_3?: number | null;
      open_leverage?: number | null;
      note?: string | null;
      tags?: string[];
    },
  ): Promise<{ id: string }> {
    const viewerId = await this.resolveViewerId(viewer);
    const check = await this.prisma.$queryRawUnsafe<Array<{ is_trader: boolean; is_approved: boolean }>>(
      `SELECT COALESCE(is_trader, FALSE) AS is_trader,
              COALESCE(is_approved, FALSE) AS is_approved
         FROM "user" WHERE id = $1::uuid LIMIT 1`,
      viewerId,
    );
    const row = check[0];
    if (!row?.is_trader) {
      throw new BadRequestException('Only traders can publish setups');
    }

    const coin = String(body.coin_name ?? '').trim().toUpperCase();
    if (!/^[A-Z0-9]{3,20}$/.test(coin)) {
      throw new BadRequestException('coin_name invalid');
    }
    if (!['spot', 'futures'].includes(body.category)) {
      throw new BadRequestException('category invalid');
    }
    if (!['long', 'short'].includes(body.position)) {
      throw new BadRequestException('position invalid');
    }
    const orderType = body.order_type ?? 'limit';
    if (!['market', 'limit', 'stop'].includes(orderType)) {
      throw new BadRequestException('order_type invalid');
    }

    const entry = Number(body.entry_value);
    if (!Number.isFinite(entry) || entry <= 0) {
      throw new BadRequestException('entry_value must be > 0');
    }
    const entryEnd = body.entry_value_end == null ? null : Number(body.entry_value_end);
    const stop = body.stop_value == null ? null : Number(body.stop_value);
    const tp1 = body.profit_taking_1 == null ? null : Number(body.profit_taking_1);
    const tp2 = body.profit_taking_2 == null ? null : Number(body.profit_taking_2);
    const tp3 = body.profit_taking_3 == null ? null : Number(body.profit_taking_3);

    const isLong = body.position === 'long';
    if (stop != null) {
      if (isLong && stop >= entry) {
        throw new BadRequestException('stop must be below entry for long');
      }
      if (!isLong && stop <= entry) {
        throw new BadRequestException('stop must be above entry for short');
      }
    }
    if (tp1 != null) {
      if (isLong && tp1 <= entry) {
        throw new BadRequestException('TP1 must be above entry for long');
      }
      if (!isLong && tp1 >= entry) {
        throw new BadRequestException('TP1 must be below entry for short');
      }
    }

    const leverage = body.open_leverage == null ? null : Math.max(1, Math.min(125, Math.round(Number(body.open_leverage))));
    const note = body.note ? String(body.note).slice(0, 2000) : null;
    const tags = Array.isArray(body.tags) ? body.tags.filter((t) => typeof t === 'string').map((t) => t.trim()).filter(Boolean).slice(0, 10) : [];

    const rows = await this.prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO setup
         (id, created_at, updated_at, is_deleted, trader_id, category, coin_name,
          is_active, is_targeted, position, profit_taking_1, profit_taking_2, profit_taking_3,
          stop_value, tags, status, entry_value, entry_value_end, is_hidden, note,
          open_leverage, order_type, last_acted_at,
          initial_entry_value, initial_entry_value_end, initial_stop_value,
          initial_profit_taking_1, initial_profit_taking_2, initial_profit_taking_3)
       VALUES
         (gen_random_uuid(), NOW(), NOW(), FALSE, $1::uuid, $2::categories_type, $3,
          TRUE, FALSE, $4::positions_type, $5, $6, $7,
          $8, $9, 'incoming'::statuses_type, $10, $11, FALSE, $12,
          $13, $14::order_types_type, NOW(),
          $10, $11, $8, $5, $6, $7)
       RETURNING id::text`,
      viewerId,
      body.category,
      coin,
      body.position,
      tp1,
      tp2,
      tp3,
      stop,
      tags,
      entry,
      entryEnd,
      note,
      leverage,
      orderType,
    );

    const setupId = rows[0]?.id;
    if (!setupId) throw new BadRequestException('Failed to create setup');

    await this.prisma.$executeRawUnsafe(
      `INSERT INTO setup_events
         (setup_id, trader_id, event_time, changed_column, old_value, new_value, action)
       VALUES ($1::uuid, $2::uuid, NOW(), 'status', NULL, 'incoming', 'insert')`,
      setupId,
      viewerId,
    );

    return { id: setupId };
  }

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
              s.note, s.tags, s.clap_count, s.image_success,
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
      image_success: (r.image_success as string | null) ?? null,
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

  /**
   * POST /setup/search — mobile's full-text-ish setup browser. Accepts a
   * JSON body with filter hints and walks the setup table with the same
   * join surface used by the feed so the row cards render identically.
   */
  async search(
    viewer: AuthedUser,
    body: {
      query?: string;
      coin_name?: string;
      tag?: string;
      category?: 'spot' | 'futures';
      position?: 'long' | 'short';
      status?: string | string[];
      trader_id?: string;
      only_followed?: boolean;
      order_by?: 'last_acted_at' | 'created_at' | 'clap_count';
      limit?: number;
      skip?: number;
    },
  ): Promise<{ items: SetupDetail[]; total: number }> {
    const viewerId = await this.resolveViewerId(viewer);
    const q = String(body?.query ?? '').trim();
    const coin = body?.coin_name
      ? String(body.coin_name).trim().toUpperCase()
      : '';
    const tag = body?.tag ? String(body.tag).trim() : '';
    const category =
      body?.category === 'futures' || body?.category === 'spot'
        ? body.category
        : null;
    const position =
      body?.position === 'long' || body?.position === 'short'
        ? body.position
        : null;
    const statuses = Array.isArray(body?.status)
      ? (body.status as string[])
      : body?.status
        ? [String(body.status)]
        : [];
    const validStatuses = [
      'incoming',
      'active',
      'cancelled',
      'stopped',
      'success',
      'closed',
    ];
    const safeStatuses = statuses.filter((s) => validStatuses.includes(s));
    const onlyFollowed = Boolean(body?.only_followed);
    const traderId = body?.trader_id ? String(body.trader_id) : '';
    const orderBy =
      body?.order_by === 'created_at' || body?.order_by === 'clap_count'
        ? body.order_by
        : 'last_acted_at';
    const limit = Math.max(1, Math.min(100, Math.floor(body?.limit ?? 25)));
    const skip = Math.max(0, Math.min(2000, Math.floor(body?.skip ?? 0)));

    const conds: string[] = ['s.is_deleted = FALSE'];
    const params: unknown[] = [viewerId];
    const bind = (v: unknown): string => {
      params.push(v);
      return `$${params.length}`;
    };
    if (q) {
      const ilikeTerm = `%${q.replace(/[%_]/g, (m) => `\\${m}`)}%`;
      conds.push(
        `(s.coin_name ILIKE ${bind(ilikeTerm)} OR s.note ILIKE ${bind(ilikeTerm)})`,
      );
    }
    if (coin) conds.push(`s.coin_name = ${bind(coin)}`);
    if (tag) conds.push(`${bind(tag)} = ANY(s.tags)`);
    if (category) conds.push(`s.category = ${bind(category)}::categories_type`);
    if (position) conds.push(`s.position = ${bind(position)}::positions_type`);
    if (safeStatuses.length > 0) {
      const placeholders = safeStatuses
        .map((s) => `${bind(s)}::statuses_type`)
        .join(',');
      conds.push(`s.status IN (${placeholders})`);
    }
    if (traderId) conds.push(`s.trader_id = ${bind(traderId)}::uuid`);
    if (onlyFollowed) {
      conds.push(
        `EXISTS (SELECT 1 FROM follow_notify f
                   WHERE f.user_id = $1::uuid
                     AND f.trader_id = s.trader_id
                     AND f.follow = TRUE
                     AND f.is_deleted = FALSE)`,
      );
    }

    const where = conds.join(' AND ');
    const orderCol =
      orderBy === 'created_at'
        ? 's.created_at'
        : orderBy === 'clap_count'
          ? 's.clap_count'
          : 's.last_acted_at';

    const totalRows = await this.prisma.$queryRawUnsafe<Array<{ n: number }>>(
      `SELECT COUNT(*)::int AS n FROM setup s WHERE ${where}`,
      ...params,
    );
    const total = Number(totalRows[0]?.n ?? 0);

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
              s.note, s.tags, s.clap_count, s.image_success,
              s.created_at, s.updated_at, s.last_acted_at,
              u.id::text       AS trader_id,
              u.name           AS trader_name,
              u.first_name     AS trader_first_name,
              u.last_name      AS trader_last_name,
              u.image          AS trader_image,
              COALESCE(u.is_trending, FALSE) AS trader_is_trending,
              c.code           AS coin_code,
              c.name           AS coin_display_name,
              c.image          AS coin_image
         FROM setup s
         LEFT JOIN "user" u ON u.id = s.trader_id
         LEFT JOIN coin c ON c.code = s.coin_name AND c.is_deleted = FALSE
        WHERE ${where}
        ORDER BY ${orderCol} DESC NULLS LAST
        LIMIT ${limit} OFFSET ${skip}`,
      ...params,
    );

    const items = rows.map((r) => this.mapDetailRow(r, false, false, false));
    return { items, total };
  }

  private mapDetailRow(
    r: Record<string, unknown>,
    clapped: boolean,
    reported: boolean,
    follows: boolean,
  ): SetupDetail {
    return {
      id: r.id as string,
      status: r.status as SetupDetail['status'],
      sub_status: (r.sub_status as string | null) ?? null,
      category: (r.category as SetupDetail['category']) ?? 'spot',
      position: (r.position as SetupDetail['position']) ?? null,
      order_type: String(r.order_type ?? 'limit'),
      coin_name: r.coin_name as string,
      entry_value: Number(r.entry_value ?? 0),
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
      is_tp1: r.is_tp1 == null ? null : Boolean(r.is_tp1),
      is_tp2: r.is_tp2 == null ? null : Boolean(r.is_tp2),
      is_tp3: r.is_tp3 == null ? null : Boolean(r.is_tp3),
      is_stop: r.is_stop == null ? null : Boolean(r.is_stop),
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
      image_success: (r.image_success as string | null) ?? null,
      created_at: date(r.created_at),
      updated_at: date(r.updated_at),
      last_acted_at: date(r.last_acted_at),
      trader: {
        id: String(r.trader_id ?? ''),
        name: (r.trader_name as string | null) ?? null,
        first_name: (r.trader_first_name as string | null) ?? null,
        last_name: (r.trader_last_name as string | null) ?? null,
        image: (r.trader_image as string | null) ?? null,
        is_trending: Boolean(r.trader_is_trending),
      },
      coin: {
        code: String(r.coin_code ?? r.coin_name ?? ''),
        display_name: (r.coin_display_name as string | null) ?? null,
        image: (r.coin_image as string | null) ?? null,
      },
      viewer: {
        clapped,
        reported,
        follows_trader: follows,
      },
    };
  }

  /**
   * PATCH /setup/:id/success_image — trader attaches a screenshot after
   * their setup closes (TP hit, stop hit, manual close). Image is a URL
   * string; we store it on the setup row and emit a setup_event so the
   * timeline reflects the upload.
   */
  async setSuccessImage(
    viewer: AuthedUser,
    setupId: string,
    body: { image?: string | null; success_image?: string | null },
  ): Promise<{ ok: true }> {
    await this.assertOwner(viewer, setupId);
    const raw = body?.success_image ?? body?.image ?? null;
    const image = raw == null || raw === '' ? null : String(raw).slice(0, 2000);
    if (image != null && !/^https?:\/\//i.test(image)) {
      throw new BadRequestException('success_image must be a valid URL');
    }
    await this.prisma.$executeRawUnsafe(
      `UPDATE setup
          SET image_success = $2,
              last_acted_at = NOW(),
              updated_at = NOW()
        WHERE id = $1::uuid`,
      setupId,
      image,
    );
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO setup_events
         (setup_id, trader_id, event_time, changed_column, old_value, new_value, action)
       SELECT s.id, s.trader_id, NOW(), 'success_image', NULL, $2, 'update'
         FROM setup s WHERE s.id = $1::uuid`,
      setupId,
      image,
    );
    return { ok: true };
  }

  /**
   * Trader edits mutable price levels on their own setup. Accepts a sparse
   * body — only keys actually present are touched. For every changed
   * numeric field we append a row to setup_value_history so the detail
   * page's "Değişim geçmişi" chart stays accurate.
   *
   * Protected fields: coin_name, category, position, trader_id, status.
   * Use /close or /delete for status transitions.
   */
  async edit(
    viewer: AuthedUser,
    setupId: string,
    body: Partial<{
      entry_value: number | null;
      entry_value_end: number | null;
      stop_value: number | null;
      profit_taking_1: number | null;
      profit_taking_2: number | null;
      profit_taking_3: number | null;
      open_leverage: number | null;
      note: string | null;
    }>,
  ): Promise<{ ok: true }> {
    await this.assertOwner(viewer, setupId);

    const prevRows = await this.prisma.$queryRawUnsafe<
      Array<Record<string, unknown>>
    >(
      `SELECT entry_value, entry_value_end, stop_value,
              profit_taking_1, profit_taking_2, profit_taking_3,
              open_leverage, note, position::text AS position
         FROM setup WHERE id = $1::uuid LIMIT 1`,
      setupId,
    );
    const prev = prevRows[0];
    if (!prev) throw new NotFoundException('Setup not found');

    const NUMERIC_FIELDS = [
      'entry_value',
      'entry_value_end',
      'stop_value',
      'profit_taking_1',
      'profit_taking_2',
      'profit_taking_3',
    ] as const;
    type NumericField = (typeof NUMERIC_FIELDS)[number];
    const numericPatch: Partial<Record<NumericField, number | null>> = {};
    for (const k of NUMERIC_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, k)) {
        const raw = body[k];
        if (raw == null) {
          numericPatch[k] = null;
        } else {
          const n = Number(raw);
          if (!Number.isFinite(n)) {
            throw new BadRequestException(`${k} invalid`);
          }
          numericPatch[k] = n;
        }
      }
    }

    const entry =
      numericPatch.entry_value != null
        ? numericPatch.entry_value
        : prev.entry_value != null
          ? Number(prev.entry_value)
          : null;
    const stop =
      'stop_value' in numericPatch
        ? (numericPatch.stop_value ?? null)
        : prev.stop_value != null
          ? Number(prev.stop_value)
          : null;
    const tp1 =
      'profit_taking_1' in numericPatch
        ? (numericPatch.profit_taking_1 ?? null)
        : prev.profit_taking_1 != null
          ? Number(prev.profit_taking_1)
          : null;
    const isLong = String(prev.position ?? 'long') === 'long';

    if (entry != null && entry <= 0) {
      throw new BadRequestException('entry_value must be > 0');
    }
    // Breakeven stop (stop === entry) is intentionally allowed: traders
    // use that to lock in risk-free after first entry.
    if (stop != null && entry != null) {
      if (isLong && stop > entry) {
        throw new BadRequestException('stop must be <= entry for long');
      }
      if (!isLong && stop < entry) {
        throw new BadRequestException('stop must be >= entry for short');
      }
    }
    if (tp1 != null && entry != null) {
      if (isLong && tp1 <= entry) {
        throw new BadRequestException('TP1 must be above entry for long');
      }
      if (!isLong && tp1 >= entry) {
        throw new BadRequestException('TP1 must be below entry for short');
      }
    }

    const leverage =
      'open_leverage' in body
        ? body.open_leverage == null
          ? null
          : Math.max(1, Math.min(125, Math.round(Number(body.open_leverage))))
        : undefined;
    const note =
      'note' in body
        ? body.note == null
          ? null
          : String(body.note).slice(0, 2000)
        : undefined;

    const setClauses: string[] = [];
    const values: unknown[] = [setupId];
    const bind = (v: unknown): string => {
      values.push(v);
      return `$${values.length}`;
    };

    for (const k of NUMERIC_FIELDS) {
      if (k in numericPatch) {
        setClauses.push(`${k} = ${bind(numericPatch[k])}`);
      }
    }
    if (leverage !== undefined) {
      setClauses.push(`open_leverage = ${bind(leverage)}`);
    }
    if (note !== undefined) {
      setClauses.push(`note = ${bind(note)}`);
    }
    if (setClauses.length === 0) {
      return { ok: true };
    }
    setClauses.push(`last_acted_at = NOW()`);
    setClauses.push(`updated_at = NOW()`);

    await this.prisma.$executeRawUnsafe(
      `UPDATE setup SET ${setClauses.join(', ')} WHERE id = $1::uuid`,
      ...values,
    );

    const viewerId = await this.resolveViewerId(viewer);
    for (const k of NUMERIC_FIELDS) {
      if (!(k in numericPatch)) continue;
      const oldV = prev[k] == null ? null : Number(prev[k]);
      const newV = numericPatch[k];
      if (oldV === newV) continue;
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO setup_value_history (id, setup_id, field, value, created_at)
         VALUES (gen_random_uuid(), $1::uuid, $2, $3, NOW())`,
        setupId,
        k,
        newV,
      );
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO setup_events
           (setup_id, trader_id, event_time, changed_column, old_value, new_value, action)
         VALUES ($1::uuid, $2::uuid, NOW(), $3,
                 CASE WHEN $4::text IS NULL THEN NULL ELSE $4::text END,
                 CASE WHEN $5::text IS NULL THEN NULL ELSE $5::text END,
                 'update')`,
        setupId,
        viewerId,
        k,
        oldV == null ? null : String(oldV),
        newV == null ? null : String(newV),
      );
    }

    return { ok: true };
  }

  /**
   * Trader closes their own setup. The body's `reason` steers the final
   * status: 'cancel' → 'cancelled', 'stop' → 'stopped', anything else
   * falls through to 'closed'. An explicit `close_price` is optional; if
   * not supplied the setup just gets its status bumped with close_date.
   */
  async close(
    viewer: AuthedUser,
    setupId: string,
    body: { reason?: string; close_price?: number | null; note?: string | null },
  ): Promise<{ ok: true; status: string }> {
    await this.assertOwner(viewer, setupId);
    const reason = String(body?.reason ?? '').toLowerCase();
    const status =
      reason === 'cancel' || reason === 'cancelled'
        ? 'cancelled'
        : reason === 'stop' || reason === 'stopped'
          ? 'stopped'
          : 'closed';
    const closePrice =
      body?.close_price == null ? null : Number(body.close_price);
    if (closePrice != null && !Number.isFinite(closePrice)) {
      throw new BadRequestException('close_price invalid');
    }
    const note = body?.note ? String(body.note).slice(0, 500) : null;

    await this.prisma.$executeRawUnsafe(
      `UPDATE setup
          SET status = $2::statuses_type,
              is_active = FALSE,
              close_price = COALESCE($3, close_price),
              close_date = NOW(),
              last_acted_at = NOW(),
              updated_at = NOW()
        WHERE id = $1::uuid`,
      setupId,
      status,
      closePrice,
    );

    await this.prisma.$executeRawUnsafe(
      `INSERT INTO setup_events
         (setup_id, trader_id, event_time, changed_column, old_value, new_value, action)
       SELECT s.id, s.trader_id, NOW(), 'status', NULL, $2, 'update'
         FROM setup s WHERE s.id = $1::uuid`,
      setupId,
      status,
    );
    void note;
    return { ok: true, status };
  }

  /**
   * Trader soft-deletes their own setup. Sets is_deleted = TRUE and
   * status = 'cancelled' so it drops out of feeds and stats immediately.
   */
  async remove(viewer: AuthedUser, setupId: string): Promise<{ ok: true }> {
    await this.assertOwner(viewer, setupId);
    await this.prisma.$executeRawUnsafe(
      `UPDATE setup
          SET is_deleted = TRUE,
              is_active = FALSE,
              status = 'cancelled'::statuses_type,
              close_date = COALESCE(close_date, NOW()),
              last_acted_at = NOW(),
              updated_at = NOW()
        WHERE id = $1::uuid`,
      setupId,
    );
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO setup_events
         (setup_id, trader_id, event_time, changed_column, old_value, new_value, action)
       SELECT s.id, s.trader_id, NOW(), 'is_deleted', 'FALSE', 'TRUE', 'delete'
         FROM setup s WHERE s.id = $1::uuid`,
      setupId,
    );
    return { ok: true };
  }

  private async assertOwner(viewer: AuthedUser, setupId: string): Promise<void> {
    const viewerId = await this.resolveViewerId(viewer);
    const rows = await this.prisma.$queryRawUnsafe<Array<{ trader_id: string | null }>>(
      `SELECT trader_id::text AS trader_id FROM setup WHERE id = $1::uuid LIMIT 1`,
      setupId,
    );
    const row = rows[0];
    if (!row) throw new NotFoundException('Setup not found');
    if (!row.trader_id || row.trader_id !== viewerId) {
      throw new ForbiddenException('Only the setup owner can perform this action');
    }
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
