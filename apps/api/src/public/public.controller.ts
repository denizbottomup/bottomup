import { Controller, Get, GoneException, Query } from '@nestjs/common';
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
   * The previous `/public/trader/:name` returned a full trader detail
   * payload to anyone — it powered the unauthenticated landing modal.
   * That endpoint has been retired: the same data now lives behind
   * the auth wall at `/me/trader/:name`, and free-tier viewers see
   * 80% of the trades locked. Returning 410 (and not 404) so any
   * stale clients log a clear "endpoint moved" rather than thinking
   * the trader simply doesn't exist.
   */
  @Get('/trader/:name')
  trader(): never {
    throw new GoneException(
      'GET /public/trader/:name has moved. Authenticated callers should use GET /me/trader/:name.',
    );
  }
}
