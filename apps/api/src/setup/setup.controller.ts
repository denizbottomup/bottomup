import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {} from '@nestjs/common';
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

  @Put()
  createViaPut(
    @CurrentUser() viewer: AuthedUser,
    @Body() body: Parameters<SetupService['create']>[1],
  ): Promise<{ id: string }> {
    return this.setups.create(viewer, body);
  }

  @Post()
  createViaPost(
    @CurrentUser() viewer: AuthedUser,
    @Body() body: Parameters<SetupService['create']>[1],
  ): Promise<{ id: string }> {
    return this.setups.create(viewer, body);
  }

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

  @Patch(':setupId')
  edit(
    @CurrentUser() viewer: AuthedUser,
    @Param('setupId') setupId: string,
    @Body() body: Parameters<SetupService['edit']>[2],
  ): Promise<{ ok: true }> {
    return this.setups.edit(viewer, setupId, body ?? {});
  }

  @Patch(':setupId/close')
  close(
    @CurrentUser() viewer: AuthedUser,
    @Param('setupId') setupId: string,
    @Body() body: { reason?: string; close_price?: number | null; note?: string | null },
  ): Promise<{ ok: true; status: string }> {
    return this.setups.close(viewer, setupId, body ?? {});
  }

  @Delete(':setupId')
  remove(
    @CurrentUser() viewer: AuthedUser,
    @Param('setupId') setupId: string,
  ): Promise<{ ok: true }> {
    return this.setups.remove(viewer, setupId);
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

  /**
   * Mobile-frozen: POST /setup/batch-impressions. The mobile client
   * batches view events into one array. For MVP we just acknowledge;
   * a future analytics worker can tail a Redis stream populated here.
   */
  @Post('/batch-impressions')
  batchImpressions(
    @Body() body: { impressions?: Array<{ setup_id?: string; ts?: number }> },
  ): { ok: true; received: number } {
    const n = Array.isArray(body?.impressions) ? body.impressions.length : 0;
    return { ok: true, received: n };
  }
}
