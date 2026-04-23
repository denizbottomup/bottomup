import { Body, Controller, Delete, Get, Param, Patch, Put, Query, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard.js';
import { CurrentUser, type AuthedUser } from '../common/decorators/current-user.decorator.js';
import { UserService, type NotificationRow } from './user.service.js';

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
}
