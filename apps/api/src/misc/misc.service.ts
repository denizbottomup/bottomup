import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@bottomup/db';
import { PRISMA } from '../common/prisma.module.js';

export interface CoinRow {
  id: string;
  code: string;
  name: string;
  image: string | null;
  is_spot: boolean;
  is_futures: boolean;
}

export interface AdRow {
  id: string;
  ads_id: string;
  ads_group_id: string;
  title: string | null;
  content: string | null;
  image: string | null;
  video: string | null;
  url: string | null;
  lang: string;
  pages: string | null;
  campaign: string | null;
  company: string | null;
  sort_no: number;
}

@Injectable()
export class MiscService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async listCoins(params: {
    market?: 'spot' | 'futures';
    limit: number;
    skip: number;
  }): Promise<{ items: CoinRow[] }> {
    const cap = Math.max(1, Math.min(500, Math.floor(params.limit)));
    const skip = Math.max(0, Math.min(2000, Math.floor(params.skip)));
    const where =
      params.market === 'futures'
        ? 'is_deleted = FALSE AND is_futures = TRUE'
        : params.market === 'spot'
          ? 'is_deleted = FALSE AND is_spot = TRUE'
          : 'is_deleted = FALSE';
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT id::text AS id, code, name, image, is_spot, is_futures
         FROM coin
        WHERE ${where}
        ORDER BY code ASC
        LIMIT ${cap} OFFSET ${skip}`,
    );
    const items: CoinRow[] = rows.map((r) => ({
      id: r.id as string,
      code: r.code as string,
      name: r.name as string,
      image: (r.image as string | null) ?? null,
      is_spot: Boolean(r.is_spot),
      is_futures: Boolean(r.is_futures),
    }));
    return { items };
  }

  async listAds(params: {
    page?: string;
    lang?: string;
    limit: number;
  }): Promise<{ items: AdRow[] }> {
    const cap = Math.max(1, Math.min(40, Math.floor(params.limit)));
    const now = new Date();
    const lang = params.lang ? String(params.lang).slice(0, 8) : null;
    const page = params.page ? String(params.page).slice(0, 40) : null;

    const conds: string[] = [
      'is_deleted = FALSE',
      'start_date <= $1',
      'end_date >= $1',
    ];
    const args: unknown[] = [now];
    if (lang) {
      args.push(lang);
      conds.push(`(lang = $${args.length} OR lang = 'en')`);
    }
    if (page) {
      args.push(page);
      conds.push(
        `(pages IS NULL OR pages = '' OR pages ILIKE '%' || $${args.length} || '%')`,
      );
    }
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT id::text AS id, ads_id, ads_group_id, title, content, image, video,
              url, lang, pages, campaign, company, COALESCE(sort_no, 0) AS sort_no
         FROM ads
        WHERE ${conds.join(' AND ')}
        ORDER BY sort_no ASC, created_at DESC NULLS LAST
        LIMIT ${cap}`,
      ...args,
    );
    const items: AdRow[] = rows.map((r) => ({
      id: r.id as string,
      ads_id: String(r.ads_id ?? ''),
      ads_group_id: String(r.ads_group_id ?? ''),
      title: (r.title as string | null) ?? null,
      content: (r.content as string | null) ?? null,
      image: (r.image as string | null) ?? null,
      video: (r.video as string | null) ?? null,
      url: (r.url as string | null) ?? null,
      lang: String(r.lang ?? 'en'),
      pages: (r.pages as string | null) ?? null,
      campaign: (r.campaign as string | null) ?? null,
      company: (r.company as string | null) ?? null,
      sort_no: Number(r.sort_no ?? 0),
    }));
    return { items };
  }
}
