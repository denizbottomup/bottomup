import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard.js';
import { CurrentUser, type AuthedUser } from '../common/decorators/current-user.decorator.js';
import { WatchlistService, type WatchlistItem } from './watchlist.service.js';

/**
 * Mirrors the mobile-frozen surface:
 *   GET    /watch_list                (body-less list)
 *   PUT    /watch_list  { setup_id }  or PUT /watch_list/:setupId
 *   DELETE /watch_list  { setup_id }  or DELETE /watch_list/:setupId
 *
 * Mobile historically sent the setup id as a body property on PUT/DELETE;
 * we accept that and also the path-param form, which is friendlier for
 * the browser and for curl probes. The `/status/:setupId` helper lets
 * the detail page render its button state without fetching the full list.
 */
@Controller('/watch_list')
@UseGuards(FirebaseAuthGuard)
export class WatchlistController {
  constructor(private readonly watchlist: WatchlistService) {}

  @Get()
  async list(
    @CurrentUser() viewer: AuthedUser,
    @Query('limit') limitRaw?: string,
  ): Promise<{ items: WatchlistItem[] }> {
    const limit = Number.parseInt(limitRaw ?? '200', 10);
    const items = await this.watchlist.list(viewer, Number.isFinite(limit) ? limit : 200);
    return { items };
  }

  @Get('/status/:setupId')
  status(
    @CurrentUser() viewer: AuthedUser,
    @Param('setupId') setupId: string,
  ): Promise<{ watched: boolean }> {
    return this.watchlist.watched(viewer, setupId);
  }

  @Put()
  putBody(
    @CurrentUser() viewer: AuthedUser,
    @Body() body: { setup_id?: string },
  ): Promise<{ ok: true }> {
    const setupId = String(body?.setup_id ?? '').trim();
    if (!setupId) throw new Error('setup_id required');
    return this.watchlist.add(viewer, setupId);
  }

  @Put('/:setupId')
  putPath(
    @CurrentUser() viewer: AuthedUser,
    @Param('setupId') setupId: string,
  ): Promise<{ ok: true }> {
    return this.watchlist.add(viewer, setupId);
  }

  @Delete()
  deleteBody(
    @CurrentUser() viewer: AuthedUser,
    @Body() body: { setup_id?: string },
  ): Promise<{ ok: true }> {
    const setupId = String(body?.setup_id ?? '').trim();
    if (!setupId) throw new Error('setup_id required');
    return this.watchlist.remove(viewer, setupId);
  }

  @Delete('/:setupId')
  deletePath(
    @CurrentUser() viewer: AuthedUser,
    @Param('setupId') setupId: string,
  ): Promise<{ ok: true }> {
    return this.watchlist.remove(viewer, setupId);
  }
}
