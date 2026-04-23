import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@bottomup/db';
import { PRISMA } from '../common/prisma.module.js';
import type { AuthedUser } from '../common/decorators/current-user.decorator.js';

export interface SetupEventRow {
  id: number;
  event_time: Date | null;
  action: string | null;
  changed_column: string | null;
  old_value: string | null;
  new_value: string | null;
  trader_name: string | null;
  trader_image: string | null;
}

export interface NewsRow {
  id: string;
  title: string | null;
  text: string | null;
  source_name: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  news_url: string | null;
  date: Date | null;
  sentiment: string | null;
  tickers: string[];
  topics: string[];
}

export interface CalendarRow {
  id: string;
  date: Date | null;
  time: string | null;
  impact: string | null;
  title: string | null;
  source: string | null;
  forecast: string | null;
  previous: string | null;
  actual: string | null;
  description: string | null;
}

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

  async listByCoin(coin: string, limit = 50): Promise<SetupCardRow[]> {
    const capped = Math.max(1, Math.min(200, Math.floor(limit)));
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT s.id::text                AS id,
              s.status::text            AS status,
              s.category::text          AS category,
              s.position::text          AS position,
              s.order_type::text        AS order_type,
              s.coin_name,
              s.entry_value, s.entry_value_end,
              s.stop_value, s.profit_taking_1, s.profit_taking_2, s.profit_taking_3,
              s.r_value, s.activation_date, s.created_at, s.last_acted_at,
              s.is_tp1, s.is_tp2, s.is_tp3, s.close_price,
              u.id::text                AS trader_id,
              u.name                    AS trader_name,
              u.first_name              AS trader_first_name,
              u.last_name               AS trader_last_name,
              u.image                   AS trader_image,
              tp.cover_image            AS trader_cover_image,
              c.code                    AS coin_code,
              c.name                    AS coin_display_name,
              c.image                   AS coin_image
         FROM setup s
         JOIN "user" u ON u.id = s.trader_id AND u.is_deleted = FALSE
         LEFT JOIN trader_profile tp ON tp.trader_id = s.trader_id AND tp.is_deleted = FALSE
         LEFT JOIN coin c ON c.code = s.coin_name AND c.is_deleted = FALSE
        WHERE s.is_deleted = FALSE
          AND s.coin_name = $1
          AND s.status IN ('incoming','active','success')
        ORDER BY s.last_acted_at DESC NULLS LAST, s.created_at DESC NULLS LAST
        LIMIT ${capped}`,
      coin.toUpperCase(),
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

  async listByTag(tag: string, limit = 50): Promise<SetupCardRow[]> {
    const capped = Math.max(1, Math.min(200, Math.floor(limit)));
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT s.id::text                AS id,
              s.status::text            AS status,
              s.category::text          AS category,
              s.position::text          AS position,
              s.order_type::text        AS order_type,
              s.coin_name,
              s.entry_value, s.entry_value_end,
              s.stop_value, s.profit_taking_1, s.profit_taking_2, s.profit_taking_3,
              s.r_value, s.activation_date, s.created_at, s.last_acted_at,
              s.is_tp1, s.is_tp2, s.is_tp3, s.close_price,
              u.id::text                AS trader_id,
              u.name                    AS trader_name,
              u.first_name              AS trader_first_name,
              u.last_name               AS trader_last_name,
              u.image                   AS trader_image,
              tp.cover_image            AS trader_cover_image,
              c.code                    AS coin_code,
              c.name                    AS coin_display_name,
              c.image                   AS coin_image
         FROM setup s
         JOIN "user" u ON u.id = s.trader_id AND u.is_deleted = FALSE
         LEFT JOIN trader_profile tp ON tp.trader_id = s.trader_id AND tp.is_deleted = FALSE
         LEFT JOIN coin c ON c.code = s.coin_name AND c.is_deleted = FALSE
        WHERE s.is_deleted = FALSE
          AND $1 = ANY(s.tags)
        ORDER BY s.last_acted_at DESC NULLS LAST, s.created_at DESC NULLS LAST
        LIMIT ${capped}`,
      tag,
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

  async listTrendingTags(limit = 30): Promise<Array<{ tag: string; count: number }>> {
    const capped = Math.max(1, Math.min(100, Math.floor(limit)));
    const rows = await this.prisma.$queryRawUnsafe<Array<{ tag: string; n: number }>>(
      `SELECT tag, COUNT(*)::int AS n
         FROM (SELECT unnest(tags) AS tag FROM setup
                WHERE is_deleted = FALSE
                  AND status IN ('incoming','active','success')) x
        GROUP BY tag
        ORDER BY n DESC
        LIMIT ${capped}`,
    );
    return rows.map((r) => ({ tag: r.tag, count: Number(r.n ?? 0) }));
  }

  async listNews(limit = 50): Promise<NewsRow[]> {
    const capped = Math.max(1, Math.min(200, Math.floor(limit)));
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT id::text AS id, title, text, source_name, image_url, thumbnail_url,
              news_url, date, sentiment, tickers, topics
         FROM news
        WHERE is_deleted = FALSE
        ORDER BY date DESC NULLS LAST, created_at DESC NULLS LAST
        LIMIT ${capped}`,
    );
    return rows.map((r) => ({
      id: r.id as string,
      title: (r.title as string | null) ?? null,
      text: (r.text as string | null) ?? null,
      source_name: (r.source_name as string | null) ?? null,
      image_url: (r.image_url as string | null) ?? null,
      thumbnail_url: (r.thumbnail_url as string | null) ?? null,
      news_url: (r.news_url as string | null) ?? null,
      date: (r.date as Date | null) ?? null,
      sentiment: (r.sentiment as string | null) ?? null,
      tickers: Array.isArray(r.tickers) ? (r.tickers as string[]) : [],
      topics: Array.isArray(r.topics) ? (r.topics as string[]) : [],
    }));
  }

  async getNews(id: string): Promise<NewsRow | null> {
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT id::text AS id, title, text, source_name, image_url, thumbnail_url,
              news_url, date, sentiment, tickers, topics, full_text
         FROM news
        WHERE id = $1::uuid AND is_deleted = FALSE
        LIMIT 1`,
      id,
    );
    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id as string,
      title: (r.title as string | null) ?? null,
      text: ((r.full_text as string | null) ?? (r.text as string | null)) ?? null,
      source_name: (r.source_name as string | null) ?? null,
      image_url: (r.image_url as string | null) ?? null,
      thumbnail_url: (r.thumbnail_url as string | null) ?? null,
      news_url: (r.news_url as string | null) ?? null,
      date: (r.date as Date | null) ?? null,
      sentiment: (r.sentiment as string | null) ?? null,
      tickers: Array.isArray(r.tickers) ? (r.tickers as string[]) : [],
      topics: Array.isArray(r.topics) ? (r.topics as string[]) : [],
    };
  }

  /**
   * Calendar slice. `interval` accepts `today`, `week`, `month`, or an ISO
   * date range. Matching the mobile contract's crypto-calendar surface,
   * we widen "today" to ±1 day of server local so Europe-based clients
   * see their full day regardless of UTC crossover.
   */
  async listCalendar(interval = 'week', limit = 300): Promise<CalendarRow[]> {
    const capped = Math.max(1, Math.min(500, Math.floor(limit)));
    const { from, to } = parseInterval(interval);
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT id::text AS id, date, time, impact, title, source,
              forecast, previous, actual, description
         FROM calendar
        WHERE is_deleted = FALSE
          AND date BETWEEN $1::date AND $2::date
        ORDER BY date ASC, time ASC NULLS LAST
        LIMIT ${capped}`,
      from,
      to,
    );
    return rows.map((r) => ({
      id: r.id as string,
      date: (r.date as Date | null) ?? null,
      time: (r.time as string | null) ?? null,
      impact: (r.impact as string | null) ?? null,
      title: (r.title as string | null) ?? null,
      source: (r.source as string | null) ?? null,
      forecast: (r.forecast as string | null) ?? null,
      previous: (r.previous as string | null) ?? null,
      actual: (r.actual as string | null) ?? null,
      description: (r.description as string | null) ?? null,
    }));
  }

  async listEvents(setupId: string, limit = 20): Promise<SetupEventRow[]> {
    const capped = Math.max(1, Math.min(200, Math.floor(limit)));
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT se.id,
              se.event_time,
              se.action,
              se.changed_column,
              se.old_value,
              se.new_value,
              u.name       AS trader_name,
              u.image      AS trader_image
         FROM setup_events se
         LEFT JOIN "user" u ON u.id = se.trader_id
        WHERE se.setup_id = $1::uuid
          AND se.event_time IS NOT NULL
        ORDER BY se.event_time DESC
        LIMIT ${capped}`,
      setupId,
    );
    return rows.map((r) => ({
      id: Number(r.id),
      event_time: (r.event_time as Date | null) ?? null,
      action: (r.action as string | null) ?? null,
      changed_column: (r.changed_column as string | null) ?? null,
      old_value: (r.old_value as string | null) ?? null,
      new_value: (r.new_value as string | null) ?? null,
      trader_name: (r.trader_name as string | null) ?? null,
      trader_image: (r.trader_image as string | null) ?? null,
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

function parseInterval(raw: string): { from: string; to: string } {
  const today = new Date();
  const pad = (n: number): string => String(n).padStart(2, '0');
  const iso = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const add = (d: Date, days: number): Date => {
    const c = new Date(d);
    c.setDate(c.getDate() + days);
    return c;
  };
  const lower = raw.trim().toLowerCase();
  if (lower === 'today') return { from: iso(add(today, -1)), to: iso(add(today, 1)) };
  if (lower === 'week' || lower === '') return { from: iso(add(today, -1)), to: iso(add(today, 7)) };
  if (lower === 'month') return { from: iso(add(today, -1)), to: iso(add(today, 30)) };
  if (lower === 'past_week') return { from: iso(add(today, -7)), to: iso(today) };
  if (lower === 'past_month') return { from: iso(add(today, -30)), to: iso(today) };
  // Accept explicit ISO range `2026-04-01..2026-04-10`
  const range = /^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/.exec(lower);
  if (range) return { from: range[1]!, to: range[2]! };
  // Fallback: week
  return { from: iso(add(today, -1)), to: iso(add(today, 7)) };
}
