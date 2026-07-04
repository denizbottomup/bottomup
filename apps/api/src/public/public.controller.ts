import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { PublicService } from './public.service.js';
import { FoxyService } from '../foxy/foxy.service.js';

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
  constructor(
    private readonly pub: PublicService,
    private readonly foxy: FoxyService,
  ) {}

  /** Deploy liveness probe — the build marker tells which commit serves. */
  @Get('/ping')
  ping(): { ok: boolean; build: string } {
    return { ok: true, build: 'b-2026-07-04-b' };
  }

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

  /**
   * Live compound order book for a coin — top levels aggregated across
   * OKX, Binance, Bybit, Bitget and Coinbase. Unauthenticated and side-
   * effect-free, so the "canlı tahta" panel can poll it every few
   * seconds for a genuinely live ladder (the Foxy query only seeds the
   * first frame).
   */
  @Get('/orderbook/:coin')
  orderbook(
    @Param('coin') coin: string,
  ): ReturnType<FoxyService['compoundOrderBook']> {
    return this.foxy.compoundOrderBook(coin);
  }

  /**
   * OKX candles for the board's live chart — the same source the scalp
   * engine computes its levels from, so chart and signal always agree.
   * `bar` is whitelisted to the intervals the UI offers; `limit` is
   * capped. Unauthenticated + server-cached (~1.5s) for polling.
   */
  @Get('/candles/:coin')
  candles(
    @Param('coin') coin: string,
    @Query('bar') barRaw?: string,
    @Query('limit') limitRaw?: string,
  ): ReturnType<FoxyService['candles']> {
    const ALLOWED_BARS = new Set(['1m', '5m', '15m', '1H', '4H', '1D']);
    const bar = barRaw && ALLOWED_BARS.has(barRaw) ? barRaw : '5m';
    const limit = Math.max(30, Math.min(300, Number(limitRaw ?? 180) || 180));
    return this.foxy.candles(coin, bar, limit);
  }

  /**
   * Depth profile ("duvar haritası") — where resting bids/asks pile up
   * within ±2.5% of the mid, aggregated from deep books across five
   * venues, with disproportionate bands flagged as walls. Public +
   * server-cached (~2.5s) so the panel can poll it.
   */
  @Get('/depth/:coin')
  depth(
    @Param('coin') coin: string,
  ): ReturnType<FoxyService['depthProfile']> {
    return this.foxy.depthProfile(coin);
  }

  /**
   * Confluence zones ("en doğru bölgeler") — order blocks, unfilled
   * FVGs and EMA20/50/200 across 1W/1D/4H/15m/5m, overlaid with the
   * live depth walls and clustered into scored buy/sell bands. Public
   * + server-cached (~45s); inputs move on candle scale.
   */
  @Get('/zones/:coin')
  zones(
    @Param('coin') coin: string,
  ): ReturnType<FoxyService['confluenceZones']> {
    return this.foxy.confluenceZones(coin);
  }

  /**
   * Opportunity radar — fresh 5m signal flips and volume breakouts
   * across the highest-volume OKX coins, scanned server-side so users
   * see chances WITHOUT having to query the right coin at the right
   * minute. Cached ~60s.
   */
  @Get('/radar')
  radar(): ReturnType<FoxyService['radar']> {
    return this.foxy.radar();
  }

  /**
   * Public analyst directory — name, image, pre-aggregated stats and
   * the trader's referral code. Powers `bottomup.app/analyst` (and
   * `bupcore.ai/analyst` while the page is in lab). All fields are
   * already exposed on the authenticated mobile profile; the referral
   * code is a public promo string that traders share off-platform.
   */
  @Get('/analysts')
  analysts(
    @Query('limit') limit?: string,
    @Query('order_by') orderBy?: string,
    @Query('active_within_days') activeWithinDays?: string,
  ): ReturnType<PublicService['analystList']> {
    const cap = Number(limit ?? 20) || 20;
    const window = activeWithinDays ? Number(activeWithinDays) : undefined;
    return this.pub.analystList(
      cap,
      String(orderBy ?? 'monthly_pnl'),
      Number.isFinite(window) && (window as number) > 0 ? window : undefined,
    );
  }
}
