import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PublicModule } from '../public/public.module.js';
import { EntitlementModule } from '../entitlement/entitlement.module.js';
import { MeService } from './me.service.js';
import { MeController } from './me.controller.js';

/**
 * Authenticated `/me/*` surface — leaderboard + trader detail with
 * entitlement-aware filtering. The endpoints exposed here replace
 * the unauthenticated equivalents that used to live under
 * `/public/*`. Auth is required for everything in this module.
 */
@Module({
  imports: [AuthModule, PublicModule, EntitlementModule],
  controllers: [MeController],
  providers: [MeService],
})
export class MeModule {}
