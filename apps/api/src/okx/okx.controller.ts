import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard.js';
import { CurrentUser, type AuthedUser } from '../common/decorators/current-user.decorator.js';
import { OkxService, type OkxStatus } from './okx.service.js';
import type { OkxAccountSnapshot } from './okx.client.js';

@Controller('/user/me/okx')
@UseGuards(FirebaseAuthGuard)
export class OkxController {
  constructor(private readonly okx: OkxService) {}

  @Get('/status')
  status(@CurrentUser() viewer: AuthedUser): Promise<OkxStatus> {
    return this.okx.status(viewer);
  }

  @Post('/pair')
  pair(
    @CurrentUser() viewer: AuthedUser,
    @Body() body: Parameters<OkxService['pair']>[1],
  ): Promise<OkxStatus> {
    return this.okx.pair(viewer, body ?? {});
  }

  @Delete('/pair')
  unpair(@CurrentUser() viewer: AuthedUser): Promise<{ ok: true }> {
    return this.okx.unpair(viewer);
  }

  @Get('/balance')
  balance(@CurrentUser() viewer: AuthedUser): Promise<OkxAccountSnapshot> {
    return this.okx.balance(viewer);
  }
}
