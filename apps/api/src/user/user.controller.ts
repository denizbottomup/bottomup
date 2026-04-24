import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard.js';
import { CurrentUser, type AuthedUser } from '../common/decorators/current-user.decorator.js';
import {
  UserService,
  type ArchiveSetupRow,
  type FollowedTrader,
  type NotificationRow,
  type SubscriptionRow,
  type TraderEarningRow,
  type TraderEarningSummary,
} from './user.service.js';

@Controller('/user')
@UseGuards(FirebaseAuthGuard)
export class UserController {
  constructor(private readonly users: UserService) {}

  @Get('/me')
  async me(@CurrentUser() user: AuthedUser): Promise<Record<string, unknown>> {
    const id = user.kind === 'jwt' ? user.sub : user.uid;
    return this.users.findMe({ kind: user.kind, id });
  }

  @Patch('/me')
  patchMe(
    @CurrentUser() user: AuthedUser,
    @Body() body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.users.updateMe(user, body ?? {});
  }

  @Get('/me/notifications')
  async notifications(
    @CurrentUser() user: AuthedUser,
    @Query('limit') limitRaw?: string,
  ): Promise<{ items: NotificationRow[]; unread: number }> {
    const limit = Number.parseInt(limitRaw ?? '100', 10);
    return this.users.listNotifications(user, Number.isFinite(limit) ? limit : 100);
  }

  @Patch('/me/notifications')
  markAll(@CurrentUser() user: AuthedUser): Promise<{ ok: true }> {
    return this.users.markAllNotificationsRead(user);
  }

  @Patch('/me/notifications/:id')
  markOne(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
  ): Promise<{ ok: true }> {
    return this.users.markNotificationRead(user, id);
  }

  @Delete('/me')
  deleteMe(@CurrentUser() user: AuthedUser): Promise<{ ok: true }> {
    return this.users.deleteMe(user);
  }

  @Get('/me/follows')
  follows(@CurrentUser() user: AuthedUser): Promise<{ items: FollowedTrader[] }> {
    return this.users.listFollowing(user);
  }

  @Get('/me/followers')
  followers(
    @CurrentUser() user: AuthedUser,
  ): ReturnType<UserService['listFollowers']> {
    return this.users.listFollowers(user);
  }

  @Get('/me/suggestion')
  suggestion(
    @CurrentUser() user: AuthedUser,
    @Query('limit') limitRaw?: string,
  ): Promise<{ items: FollowedTrader[] }> {
    const limit = Number.parseInt(limitRaw ?? '12', 10);
    return this.users.listSuggestions(user, Number.isFinite(limit) ? limit : 12);
  }

  @Get('/me/archive')
  archive(
    @CurrentUser() user: AuthedUser,
    @Query('limit') limitRaw?: string,
  ): Promise<{ items: ArchiveSetupRow[] }> {
    const limit = Number.parseInt(limitRaw ?? '80', 10);
    return this.users.listArchive(user, Number.isFinite(limit) ? limit : 80);
  }

  @Get('/me/subscriptions')
  subscriptions(
    @CurrentUser() user: AuthedUser,
  ): Promise<{ items: SubscriptionRow[] }> {
    return this.users.listMySubscriptions(user);
  }

  @Get('/me/trader-earnings')
  traderEarnings(
    @CurrentUser() user: AuthedUser,
  ): Promise<{ items: TraderEarningRow[]; summary: TraderEarningSummary }> {
    return this.users.listMyEarnings(user);
  }

  @Get('/me/blocks')
  blocks(
    @CurrentUser() user: AuthedUser,
  ): ReturnType<UserService['listBlocked']> {
    return this.users.listBlocked(user);
  }

  @Put('/traders/:traderId/block')
  block(
    @CurrentUser() user: AuthedUser,
    @Param('traderId') traderId: string,
  ): Promise<{ ok: true }> {
    return this.users.blockTrader(user, traderId);
  }

  @Delete('/traders/:traderId/block')
  unblock(
    @CurrentUser() user: AuthedUser,
    @Param('traderId') traderId: string,
  ): Promise<{ ok: true }> {
    return this.users.unblockTrader(user, traderId);
  }

  @Post('/traders/:traderId/report')
  reportTrader(
    @CurrentUser() user: AuthedUser,
    @Param('traderId') traderId: string,
    @Body() body: { content?: string; reason?: string },
  ): Promise<{ ok: true }> {
    const content = String(body?.content ?? body?.reason ?? '').trim();
    return this.users.reportTrader(user, traderId, content);
  }
}
