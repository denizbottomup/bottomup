import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard.js';
import { CurrentUser, type AuthedUser } from '../common/decorators/current-user.decorator.js';
import {
  CopyTradeService,
  type CopyTradeRow,
  type CopyTradeStats,
  type TeamInfo,
  type TeamMember,
} from './copytrade.service.js';

@Controller('/copy_trade')
@UseGuards(FirebaseAuthGuard)
export class CopyTradeController {
  constructor(private readonly ct: CopyTradeService) {}

  @Get('/team')
  team(@CurrentUser() viewer: AuthedUser): Promise<TeamInfo> {
    return this.ct.team(viewer);
  }

  @Patch('/team')
  renameTeam(
    @CurrentUser() viewer: AuthedUser,
    @Body() body: { name?: string },
  ): Promise<TeamInfo> {
    return this.ct.renameTeam(viewer, String(body?.name ?? ''));
  }

  @Delete('/team')
  deleteTeam(@CurrentUser() viewer: AuthedUser): Promise<{ ok: true }> {
    return this.ct.deleteTeam(viewer);
  }

  @Get('/team/members')
  members(
    @CurrentUser() viewer: AuthedUser,
  ): Promise<{ items: TeamMember[] }> {
    return this.ct.listMembers(viewer);
  }

  @Put('/team/trader/:traderId')
  addTrader(
    @CurrentUser() viewer: AuthedUser,
    @Param('traderId') traderId: string,
  ): Promise<{ ok: true }> {
    return this.ct.addTeamTrader(viewer, traderId);
  }

  @Delete('/team/trader/:traderId')
  removeTrader(
    @CurrentUser() viewer: AuthedUser,
    @Param('traderId') traderId: string,
  ): Promise<{ ok: true }> {
    return this.ct.removeTeamTrader(viewer, traderId);
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
