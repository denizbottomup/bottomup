import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard.js';
import { CurrentUser, type AuthedUser } from '../common/decorators/current-user.decorator.js';
import {
  SetupService,
  type SetupDetail,
  type SetupHistoryPoint,
} from './setup.service.js';

@Controller('/setup')
@UseGuards(FirebaseAuthGuard)
export class SetupController {
  constructor(private readonly setups: SetupService) {}

  @Get(':setupId')
  detail(
    @CurrentUser() viewer: AuthedUser,
    @Param('setupId') setupId: string,
  ): Promise<SetupDetail> {
    return this.setups.detail(viewer, setupId);
  }

  @Get(':setupId/previous_values')
  async history(
    @Param('setupId') setupId: string,
    @Query('limit') limitRaw?: string,
  ): Promise<{ items: SetupHistoryPoint[] }> {
    const limit = Number.parseInt(limitRaw ?? '50', 10);
    const items = await this.setups.history(
      setupId,
      Number.isFinite(limit) ? limit : 50,
    );
    return { items };
  }

  @Put(':setupId/clap')
  clap(
    @CurrentUser() viewer: AuthedUser,
    @Param('setupId') setupId: string,
  ): Promise<{ ok: true; clap_count: number }> {
    return this.setups.clap(viewer, setupId);
  }

  @Delete(':setupId/clap')
  unclap(
    @CurrentUser() viewer: AuthedUser,
    @Param('setupId') setupId: string,
  ): Promise<{ ok: true; clap_count: number }> {
    return this.setups.unclap(viewer, setupId);
  }

  @Post(':setupId/report')
  report(
    @CurrentUser() viewer: AuthedUser,
    @Param('setupId') setupId: string,
    @Body() body: { content?: string; reason?: string },
  ): Promise<{ ok: true }> {
    const content = String(body?.content ?? body?.reason ?? '').trim();
    return this.setups.report(viewer, setupId, content);
  }
}
