import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard.js';
import { MiscService, type AdRow, type CoinRow } from './misc.service.js';

@Controller()
@UseGuards(FirebaseAuthGuard)
export class MiscController {
  constructor(private readonly misc: MiscService) {}

  @Get('/coin')
  coins(
    @Query('market') market?: string,
    @Query('limit') limitRaw?: string,
    @Query('skip') skipRaw?: string,
  ): Promise<{ items: CoinRow[] }> {
    const limit = Number.parseInt(limitRaw ?? '200', 10);
    const skip = Number.parseInt(skipRaw ?? '0', 10);
    return this.misc.listCoins({
      market: market === 'futures' || market === 'spot' ? market : undefined,
      limit: Number.isFinite(limit) ? limit : 200,
      skip: Number.isFinite(skip) ? skip : 0,
    });
  }

  @Get('/ads')
  ads(
    @Query('page') page?: string,
    @Query('lang') lang?: string,
    @Query('limit') limitRaw?: string,
  ): Promise<{ items: AdRow[] }> {
    const limit = Number.parseInt(limitRaw ?? '6', 10);
    return this.misc.listAds({
      page,
      lang,
      limit: Number.isFinite(limit) ? limit : 6,
    });
  }

  /**
   * Mobile generic impressions sink. We already accept setup impressions
   * on POST /setup/batch-impressions; this alias covers other content
   * types (news, calendar, ads) and just acknowledges for MVP.
   */
  @Post('/impressions/batch')
  impressions(
    @Body() body: { impressions?: Array<Record<string, unknown>> },
  ): { ok: true; received: number } {
    const n = Array.isArray(body?.impressions) ? body.impressions.length : 0;
    return { ok: true, received: n };
  }
}
