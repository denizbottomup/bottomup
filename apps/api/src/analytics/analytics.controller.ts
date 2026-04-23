import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard.js';
import {
  AnalyticsService,
  type HotCoin,
  type LatestSetupRow,
  type LeaderboardRow,
} from './analytics.service.js';

@Controller('/analytic')
@UseGuards(FirebaseAuthGuard)
export class AnalyticsController {
  constructor(private readonly a: AnalyticsService) {}

  @Get('/futures-leaderboard')
  async futuresLeaderboard(
    @Query('limit') limitRaw?: string,
  ): Promise<{ items: LeaderboardRow[] }> {
    const limit = Number.parseInt(limitRaw ?? '20', 10);
    const items = await this.a.futuresLeaderboard(Number.isFinite(limit) ? limit : 20);
    return { items };
  }

  @Get('/spot-leaderboard')
  async spotLeaderboard(
    @Query('limit') limitRaw?: string,
  ): Promise<{ items: LeaderboardRow[] }> {
    const limit = Number.parseInt(limitRaw ?? '20', 10);
    const items = await this.a.spotLeaderboard(Number.isFinite(limit) ? limit : 20);
    return { items };
  }

  @Get('/futures-latest-setup')
  async futuresLatest(@Query('limit') limitRaw?: string): Promise<{ items: LatestSetupRow[] }> {
    const limit = Number.parseInt(limitRaw ?? '15', 10);
    const items = await this.a.latestSetup('futures', Number.isFinite(limit) ? limit : 15);
    return { items };
  }

  @Get('/spot-latest-setup')
  async spotLatest(@Query('limit') limitRaw?: string): Promise<{ items: LatestSetupRow[] }> {
    const limit = Number.parseInt(limitRaw ?? '15', 10);
    const items = await this.a.latestSetup('spot', Number.isFinite(limit) ? limit : 15);
    return { items };
  }

  @Get('/hot-coins')
  async hotCoins(@Query('limit') limitRaw?: string): Promise<{ items: HotCoin[] }> {
    const limit = Number.parseInt(limitRaw ?? '12', 10);
    const items = await this.a.hotCoins(Number.isFinite(limit) ? limit : 12);
    return { items };
  }
}
