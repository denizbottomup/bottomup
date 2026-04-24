import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard.js';
import {
  MarketIntelService,
  type DominanceSnapshot,
  type FearGreedPoint,
  type FundingRateRow,
  type LongShortRow,
  type MarketPulse,
} from './market-intel.service.js';

@Controller('/analytic')
@UseGuards(FirebaseAuthGuard)
export class MarketIntelController {
  constructor(private readonly intel: MarketIntelService) {}

  @Get('/pulse')
  pulse(): Promise<MarketPulse> {
    return this.intel.pulse();
  }

  @Get('/fear-greed')
  async fearGreed(
    @Query('limit') limitRaw?: string,
  ): Promise<{ current: FearGreedPoint | null; history: FearGreedPoint[] }> {
    const limit = Number.parseInt(limitRaw ?? '30', 10);
    return this.intel.fearGreed(Number.isFinite(limit) ? limit : 30);
  }

  @Get('/btc-dominance')
  async dominance(): Promise<{ snapshot: DominanceSnapshot | null }> {
    const snapshot = await this.intel.dominance();
    return { snapshot };
  }

  @Get('/funding-rate')
  async funding(
    @Query('limit') limitRaw?: string,
  ): Promise<{ items: FundingRateRow[] }> {
    const limit = Number.parseInt(limitRaw ?? '10', 10);
    const items = await this.intel.topFundingRates(
      Number.isFinite(limit) ? limit : 10,
    );
    return { items };
  }

  @Get('/long-short-ratio')
  async longShort(
    @Query('limit') limitRaw?: string,
  ): Promise<{ items: LongShortRow[] }> {
    const limit = Number.parseInt(limitRaw ?? '8', 10);
    const items = await this.intel.longShort(
      Number.isFinite(limit) ? limit : 8,
    );
    return { items };
  }
}
