import { Controller, Get, NotFoundException, Param, Query, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard.js';
import { CurrentUser, type AuthedUser } from '../common/decorators/current-user.decorator.js';
import {
  FeedService,
  type CalendarRow,
  type NewsRow,
  type SetupCardRow,
  type SetupEventRow,
} from './feed.service.js';

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

  @Get('/coin/:coin')
  async byCoin(
    @Param('coin') coin: string,
    @Query('limit') limitRaw?: string,
  ): Promise<{ items: SetupCardRow[] }> {
    const items = await this.feed.listByCoin(coin, clampLimit(limitRaw));
    return { items };
  }

  @Get('/tags')
  async trendingTags(
    @Query('limit') limitRaw?: string,
  ): Promise<{ items: Array<{ tag: string; count: number }> }> {
    const items = await this.feed.listTrendingTags(clampLimit(limitRaw));
    return { items };
  }

  @Get('/tag/:tag')
  async byTag(
    @Param('tag') tag: string,
    @Query('limit') limitRaw?: string,
  ): Promise<{ items: SetupCardRow[] }> {
    const items = await this.feed.listByTag(tag, clampLimit(limitRaw));
    return { items };
  }

  @Get('/setup/:setupId/events')
  async events(
    @Param('setupId') setupId: string,
    @Query('limit') limitRaw?: string,
  ): Promise<{ items: SetupEventRow[] }> {
    const items = await this.feed.listEvents(setupId, clampLimit(limitRaw));
    return { items };
  }

  @Get('/news')
  async news(
    @Query('limit') limitRaw?: string,
  ): Promise<{ items: NewsRow[] }> {
    const items = await this.feed.listNews(clampLimit(limitRaw));
    return { items };
  }

  @Get('/news/:newsId')
  async newsOne(@Param('newsId') newsId: string): Promise<NewsRow> {
    const row = await this.feed.getNews(newsId);
    if (!row) throw new NotFoundException('News not found');
    return row;
  }

  @Get('/calendar')
  async calendar(
    @Query('interval') interval: string = 'week',
    @Query('limit') limitRaw?: string,
  ): Promise<{ items: CalendarRow[] }> {
    const items = await this.feed.listCalendar(interval, clampLimit(limitRaw));
    return { items };
  }

  /** Mobile contract alias: /feed/calendar/crypto-calendar/:interval */
  @Get('/calendar/crypto-calendar/:interval')
  async calendarAlias(
    @Param('interval') interval: string,
    @Query('limit') limitRaw?: string,
  ): Promise<{ items: CalendarRow[] }> {
    const items = await this.feed.listCalendar(interval, clampLimit(limitRaw));
    return { items };
  }

  /**
   * Mobile version gate. The Flutter app polls this during boot to
   * decide whether to surface a soft "update available" card or force
   * the user onto the latest build. We report the current 3.0 build as
   * the minimum so legacy 2.2.1 clients see a nudge.
   */
  @Get('/canupdate')
  canUpdate(): {
    latest: string;
    minimum: string;
    force_update: boolean;
    url: string | null;
  } {
    return {
      latest: '2.2.1',
      minimum: '2.2.1',
      force_update: false,
      url: null,
    };
  }
}

function clampLimit(raw?: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 100;
  return Math.min(Math.floor(n), MAX_LIMIT);
}
