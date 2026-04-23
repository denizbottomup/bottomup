import { Controller, Delete, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard.js';
import { CurrentUser, type AuthedUser } from '../common/decorators/current-user.decorator.js';
import {
  TraderService,
  type TraderCardRow,
  type TraderProfileDetail,
  type TraderSetupRow,
} from './trader.service.js';

/**
 * `/trader/:id` reads and `/user/traders/:id` follow mutations match the
 * mobile 2.2.1 path surface so the same client can later point at this
 * backend without renames. Mobile uses raw-token Authorization; the
 * FirebaseAuthGuard already accepts both Bearer and Firebase ID tokens.
 */
@Controller()
@UseGuards(FirebaseAuthGuard)
export class TraderController {
  constructor(private readonly traders: TraderService) {}

  @Get('/traders')
  async search(
    @CurrentUser() viewer: AuthedUser,
    @Query('sort') sort?: string,
    @Query('limit') limitRaw?: string,
    @Query('only_followed') onlyFollowed?: string,
  ): Promise<{ items: TraderCardRow[] }> {
    const limit = Number.parseInt(limitRaw ?? '40', 10);
    const items = await this.traders.search(viewer, {
      sort: sort === 'followers' || sort === 'new' ? sort : 'trending',
      limit: Number.isFinite(limit) ? limit : 40,
      onlyFollowed: onlyFollowed === 'true' || onlyFollowed === '1',
    });
    return { items };
  }

  @Get('/trader/:traderId')
  profile(
    @CurrentUser() viewer: AuthedUser,
    @Param('traderId') traderId: string,
  ): Promise<TraderProfileDetail> {
    return this.traders.profile(viewer, traderId);
  }

  @Get('/trader/:traderId/setups')
  async setups(
    @Param('traderId') traderId: string,
    @Query('status') status?: string,
    @Query('limit') limitRaw?: string,
  ): Promise<{ items: TraderSetupRow[] }> {
    const limit = Number.parseInt(limitRaw ?? '50', 10);
    const items = await this.traders.setups(traderId, status, Number.isFinite(limit) ? limit : 50);
    return { items };
  }

  @Put('/user/traders/:traderId')
  follow(
    @CurrentUser() viewer: AuthedUser,
    @Param('traderId') traderId: string,
  ): Promise<{ ok: true }> {
    return this.traders.follow(viewer, traderId);
  }

  @Delete('/user/traders/:traderId')
  unfollow(
    @CurrentUser() viewer: AuthedUser,
    @Param('traderId') traderId: string,
  ): Promise<{ ok: true }> {
    return this.traders.unfollow(viewer, traderId);
  }
}
