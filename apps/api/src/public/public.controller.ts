import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { PublicService } from './public.service.js';

const SUPPORTED_LOCALES = new Set([
  'en',
  'tr',
  'es',
  'pt',
  'ru',
  'vi',
  'id',
  'zh',
  'ko',
  'ar',
]);

function normalizeLocale(input: string | undefined): string {
  if (!input) return 'en';
  const lc = String(input).toLowerCase().slice(0, 5);
  // Accept "en", "en-US" → "en"; strip region.
  const base = lc.split(/[-_]/)[0] ?? 'en';
  return SUPPORTED_LOCALES.has(base) ? base : 'en';
}

/**
 * Unauthenticated endpoints used by the marketing landing. Only read-
 * only, curated data — never anything a user could mine for PII.
 */
@Controller('/public')
export class PublicController {
  constructor(private readonly pub: PublicService) {}

  @Get('/landing')
  landing(
    @Query('locale') locale?: string,
  ): ReturnType<PublicService['landing']> {
    return this.pub.landing(normalizeLocale(locale));
  }

  /** Locale-only news feed — used when the user switches language. */
  @Get('/news')
  news(
    @Query('locale') locale?: string,
    @Query('limit') limit?: string,
  ): ReturnType<PublicService['news']> {
    const cap = Math.max(1, Math.min(20, Number(limit ?? 6) || 6));
    return this.pub.news(cap, normalizeLocale(locale));
  }

  /**
   * Trader detail for the unauthenticated landing modal. Earlier this
   * endpoint was 410'd in the same Phase-1 sweep that gated
   * `latest_setups` — but the modal payload only exposes aggregated
   * 30-day / all-time performance + a closed-trade history (close_date,
   * pnl, r). No live entry/stop/TP, no per-setup pricing, nothing a
   * free-tier viewer wouldn't already see in the leaderboard card.
   * The /me/trader/:name path stays the canonical authenticated read
   * (with the 20% trade lockdown for free-tier); this public mirror
   * is for the landing showcase modal only.
   */
  @Get('/trader/:name')
  async trader(
    @Param('name') name: string,
  ): ReturnType<PublicService['traderDetail']> {
    const out = await this.pub.traderDetail(name);
    if (!out) throw new NotFoundException(`Trader "${name}" not found`);
    return out;
  }
}
