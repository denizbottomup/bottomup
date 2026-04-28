import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma.module.js';
import { MarketIntelModule } from '../market-intel/market-intel.module.js';
import { PublicController } from './public.controller.js';
import { PublicService } from './public.service.js';

@Module({
  imports: [PrismaModule, MarketIntelModule],
  controllers: [PublicController],
  providers: [PublicService],
  // MeModule re-uses PublicService for trader detail / leaderboard
  // data and layers entitlement-aware filtering on top.
  exports: [PublicService],
})
export class PublicModule {}
