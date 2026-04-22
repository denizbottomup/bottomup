import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard.js';
import { CurrentUser, type AuthedUser } from '../common/decorators/current-user.decorator.js';
import { FeedService, type SetupCardRow } from './feed.service.js';

const MAX_LIMIT = 200;

@Controller('/feed')
@UseGuards(FirebaseAuthGuard)
export class FeedController {
  constructor(private readonly feed: FeedService) {}

  @Get('/opportunities')
  async opportunities(
    @CurrentUser() user: AuthedUser,
    @Query('limit') limitRaw?: string,
  ): Promise<{ items: SetupCardRow[] }> {
    const limit = clampLimit(limitRaw);
    const items = await this.feed.listByStatus(user, 'incoming', limit);
    return { items };
  }

  @Get('/active')
  async active(
    @CurrentUser() user: AuthedUser,
    @Query('limit') limitRaw?: string,
  ): Promise<{ items: SetupCardRow[] }> {
    const limit = clampLimit(limitRaw);
    const items = await this.feed.listByStatus(user, 'active', limit);
    return { items };
  }
}

function clampLimit(raw?: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 100;
  return Math.min(Math.floor(n), MAX_LIMIT);
}
