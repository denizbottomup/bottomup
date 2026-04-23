import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@bottomup/db';
import { PRISMA } from '../common/prisma.module.js';

export interface SearchResults {
  coins: Array<{ code: string; name: string | null; image: string | null }>;
  traders: Array<{
    id: string;
    name: string | null;
    first_name: string | null;
    last_name: string | null;
    image: string | null;
    is_trending: boolean;
    followers: number;
  }>;
  setups: Array<{
    id: string;
    coin_name: string;
    status: string;
    position: string | null;
    trader_id: string | null;
    trader_name: string | null;
    trader_image: string | null;
    created_at: Date | null;
  }>;
  tags: Array<{ tag: string; count: number }>;
}

/**
 * Unified search for the header search box. Hits coin.code/name,
 * user.name/first_name/last_name (traders only), setup.coin_name +
 * tags, and the tag frequency index. Everything ILIKE-matched and
 * capped at 6-10 per bucket so the dropdown is scrollable but not
 * overwhelming.
 */
@Injectable()
export class SearchService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async search(query: string): Promise<SearchResults> {
    const q = query.trim();
    if (q.length < 1) {
      return { coins: [], traders: [], setups: [], tags: [] };
    }
    const pattern = `%${q.toLowerCase()}%`;
    const tagPattern = q.toLowerCase();

    const [coinRows, traderRows, setupRows, tagRows] = await Promise.all([
      this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT code, name, image
           FROM coin
          WHERE is_deleted = FALSE
            AND (LOWER(code) LIKE $1 OR LOWER(name) LIKE $1)
          ORDER BY code
          LIMIT 8`,
        pattern,
      ),
      this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT u.id::text AS id, u.name, u.first_name, u.last_name, u.image, u.is_trending,
                (SELECT COUNT(*)::int FROM follow_notify f
                  WHERE f.trader_id = u.id AND f.follow = TRUE AND f.is_deleted = FALSE) AS followers
           FROM "user" u
          WHERE u.is_trader = TRUE
            AND u.is_deleted = FALSE
            AND u.is_active = TRUE
            AND (LOWER(u.name) LIKE $1
              OR LOWER(u.first_name) LIKE $1
              OR LOWER(u.last_name) LIKE $1
              OR LOWER(u.email) LIKE $1)
          ORDER BY u.is_trending DESC, followers DESC
          LIMIT 8`,
        pattern,
      ),
      this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT s.id::text AS id,
                s.coin_name,
                s.status::text AS status,
                s.position::text AS position,
                s.trader_id::text AS trader_id,
                u.name AS trader_name,
                u.image AS trader_image,
                s.created_at
           FROM setup s
           LEFT JOIN "user" u ON u.id = s.trader_id
          WHERE s.is_deleted = FALSE
            AND (LOWER(s.coin_name) LIKE $1
              OR EXISTS (SELECT 1 FROM unnest(s.tags) t WHERE LOWER(t) LIKE $1))
            AND s.status IN ('incoming','active','success')
          ORDER BY s.last_acted_at DESC NULLS LAST
          LIMIT 10`,
        pattern,
      ),
      this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT tag, COUNT(*)::int AS n
           FROM (SELECT unnest(tags) AS tag FROM setup WHERE is_deleted = FALSE) x
          WHERE LOWER(tag) LIKE $1
          GROUP BY tag
          ORDER BY n DESC
          LIMIT 6`,
        `%${tagPattern}%`,
      ),
    ]);

    return {
      coins: coinRows.map((r) => ({
        code: r.code as string,
        name: (r.name as string | null) ?? null,
        image: (r.image as string | null) ?? null,
      })),
      traders: traderRows.map((r) => ({
        id: r.id as string,
        name: (r.name as string | null) ?? null,
        first_name: (r.first_name as string | null) ?? null,
        last_name: (r.last_name as string | null) ?? null,
        image: (r.image as string | null) ?? null,
        is_trending: Boolean(r.is_trending),
        followers: Number(r.followers ?? 0),
      })),
      setups: setupRows.map((r) => ({
        id: r.id as string,
        coin_name: r.coin_name as string,
        status: r.status as string,
        position: (r.position as string | null) ?? null,
        trader_id: (r.trader_id as string | null) ?? null,
        trader_name: (r.trader_name as string | null) ?? null,
        trader_image: (r.trader_image as string | null) ?? null,
        created_at: (r.created_at as Date | null) ?? null,
      })),
      tags: tagRows.map((r) => ({
        tag: r.tag as string,
        count: Number(r.n ?? 0),
      })),
    };
  }
}
