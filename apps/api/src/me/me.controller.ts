import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard.js';
import { CurrentUser, type AuthedUser } from '../common/decorators/current-user.decorator.js';
import { MeService } from './me.service.js';

/**
 * Authenticated trader / leaderboard surface. The previous
 * `/public/trader/:name` and `top_traders` field on `/public/landing`
 * have been retired — both leaked the marketplace data we now want
 * behind the signup wall.
 */
@Controller('/me')
@UseGuards(FirebaseAuthGuard)
export class MeController {
  constructor(private readonly me: MeService) {}

  @Get('/leaderboard')
  leaderboard(
    @CurrentUser() user: AuthedUser,
    @Query('limit') limitRaw?: string,
  ): ReturnType<MeService['leaderboard']> {
    const limit = Number.parseInt(limitRaw ?? '6', 10);
    return this.me.leaderboard(user, Number.isFinite(limit) ? limit : 6);
  }

  @Get('/trader/:name')
  trader(
    @CurrentUser() user: AuthedUser,
    @Param('name') name: string,
  ): ReturnType<MeService['traderDetail']> {
    return this.me.traderDetail(user, decodeURIComponent(name));
  }
}
