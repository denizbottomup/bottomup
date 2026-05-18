import { Inject, Injectable, Logger } from '@nestjs/common';
import type { PrismaClient } from '@bottomup/db';
import { PRISMA } from '../common/prisma.module.js';

/**
 * One row in the signals feed. Mirrors the FoxyCoinSetup shape on
 * purpose so the web layer can reuse the same display components,
 * with `coin` added back (Foxy already knew the coin context).
 */
export interface SignalRow {
  id: string;
  status: string;
  position: 'long' | 'short' | null;
  coin: string;
  entry_value: number | null;
  stop_value: number | null;
  profit_taking_1: number | null;
  r_value: number | null;
  trader_id: string | null;
  trader_name: string | null;
  trader_image: string | null;
  created_at: string | null;
  last_acted_at: string | null;
  /** ISO of whichever close-style timestamp is set on the row; null
   *  for incoming/active setups. */
  closed_at: string | null;
}

export interface SignalsFeed {
  /** Trader signals currently in-flight: pre-entry + live position. */
  active: SignalRow[];
  /** Recently closed/stopped/tp-hit setups, newest first. Window is
   *  bounded by the controller's `closedHours` param. */
  recent: SignalRow[];
  /** Server timestamp the snapshot was generated at — UI uses this
   *  to anchor relative-time labels without clock skew. */
  generated_at: string;
  /** Echoes the controller params so the UI can show "son 48 saat"
   *  without hard-coding the window. */
  window_hours: number;
}

@Injectable()
export class SignalsService {
  private readonly log = new Logger(SignalsService.name);
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async feed(opts: { closedHours: number; limit: number }): Promise<SignalsFeed> {
    const closedHours = Math.max(1, Math.floor(opts.closedHours));
    const limit = Math.max(1, Math.floor(opts.limit));

    // Active book (incoming + live). Sorted by last_acted_at so the
    // freshest activity floats up — "trader just edited a stop" rows
    // appear before week-old waiting orders without us tracking
    // edits separately.
    const active = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT s.id::text             AS id,
              s.status::text         AS status,
              s.position::text       AS position,
              s.coin_name            AS coin,
              s.entry_value          AS entry_value,
              s.stop_value           AS stop_value,
              s.profit_taking_1      AS profit_taking_1,
              s.r_value              AS r_value,
              s.trader_id::text      AS trader_id,
              u.name                 AS trader_name,
              u.image                AS trader_image,
              s.created_at           AS created_at,
              s.last_acted_at        AS last_acted_at,
              NULL::timestamp        AS closed_at
         FROM setup s
         LEFT JOIN "user" u ON u.id = s.trader_id
        WHERE s.is_deleted = FALSE
          AND s.category   = 'futures'::categories_type
          AND s.status IN ('incoming'::statuses_type, 'active'::statuses_type)
        ORDER BY s.last_acted_at DESC NULLS LAST,
                 s.created_at    DESC NULLS LAST
        LIMIT $1`,
      limit,
    );

    // Recently-resolved book — surfaces "ETH long hit TP" or
    // "BTC short stopped" events so the feed reads like an activity
    // log next to the active book.
    const recent = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT s.id::text             AS id,
              s.status::text         AS status,
              s.position::text       AS position,
              s.coin_name            AS coin,
              s.entry_value          AS entry_value,
              s.stop_value           AS stop_value,
              s.profit_taking_1      AS profit_taking_1,
              s.r_value              AS r_value,
              s.trader_id::text      AS trader_id,
              u.name                 AS trader_name,
              u.image                AS trader_image,
              s.created_at           AS created_at,
              s.last_acted_at        AS last_acted_at,
              COALESCE(s.close_date, s.stop_date, s.tp1_date,
                       s.tp2_date, s.tp3_date)
                                     AS closed_at
         FROM setup s
         LEFT JOIN "user" u ON u.id = s.trader_id
        WHERE s.is_deleted = FALSE
          AND s.category   = 'futures'::categories_type
          AND s.status IN ('success'::statuses_type,
                           'stopped'::statuses_type,
                           'closed'::statuses_type)
          AND COALESCE(s.close_date, s.stop_date, s.tp1_date,
                       s.tp2_date, s.tp3_date, s.last_acted_at)
              >= NOW() - ($1 || ' hours')::interval
        ORDER BY COALESCE(s.close_date, s.stop_date, s.tp1_date,
                          s.tp2_date, s.tp3_date, s.last_acted_at) DESC
        LIMIT $2`,
      String(closedHours),
      limit,
    );

    return {
      active: active.map(toRow),
      recent: recent.map(toRow),
      generated_at: new Date().toISOString(),
      window_hours: closedHours,
    };
  }
}

function toRow(r: Record<string, unknown>): SignalRow {
  return {
    id: r.id as string,
    status: String(r.status ?? ''),
    position:
      r.position === 'long' || r.position === 'short'
        ? (r.position as 'long' | 'short')
        : null,
    coin: String(r.coin ?? ''),
    entry_value: r.entry_value == null ? null : Number(r.entry_value),
    stop_value: r.stop_value == null ? null : Number(r.stop_value),
    profit_taking_1:
      r.profit_taking_1 == null ? null : Number(r.profit_taking_1),
    r_value: r.r_value == null ? null : Number(r.r_value),
    trader_id: (r.trader_id as string | null) ?? null,
    trader_name: (r.trader_name as string | null) ?? null,
    trader_image: (r.trader_image as string | null) ?? null,
    created_at: toIso(r.created_at),
    last_acted_at: toIso(r.last_acted_at),
    closed_at: toIso(r.closed_at),
  };
}

function toIso(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString();
  const s = String(v);
  const t = Date.parse(s);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}
