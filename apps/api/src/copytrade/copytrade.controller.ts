import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard.js';
import { CurrentUser, type AuthedUser } from '../common/decorators/current-user.decorator.js';
import {
  CopyTradeService,
  type CopyTradeRow,
  type CopyTradeStats,
  type TeamInfo,
} from './copytrade.service.js';

@Controller('/copy_trade')
@UseGuards(FirebaseAuthGuard)
export class CopyTradeController {
  constructor(private readonly ct: CopyTradeService) {}

  @Get('/team')
  team(@CurrentUser() viewer: AuthedUser): Promise<TeamInfo> {
    return this.ct.team(viewer);
  }

  @Get('/team/stats')
  stats(@CurrentUser() viewer: AuthedUser): Promise<CopyTradeStats> {
    return this.ct.stats(viewer);
  }

  @Get('/setup')
  async setups(
    @CurrentUser() viewer: AuthedUser,
    @Query('state') stateRaw?: string,
    @Query('limit') limitRaw?: string,
  ): Promise<{ items: CopyTradeRow[] }> {
    const limit = Number.parseInt(limitRaw ?? '100', 10);
    const state: 'active' | 'closed' | 'all' =
      stateRaw === 'closed' ? 'closed' : stateRaw === 'all' ? 'all' : 'active';
    const items = await this.ct.setups(viewer, state, Number.isFinite(limit) ? limit : 100);
    return { items };
  }

  /**
   * Mobile contract preserved typo — do not rename. Web uses it as
   * "sum of pnl across currently open copies"; the backend view is
   * simply the unrealized slice of /team/stats reshaped per-setup.
   */
  @Get('/setup-unreleased-pnl')
  async unreleased(@CurrentUser() viewer: AuthedUser): Promise<{ items: CopyTradeRow[] }> {
    const items = await this.ct.setups(viewer, 'active', 300);
    return { items };
  }
}
