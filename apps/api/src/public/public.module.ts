import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma.module.js';
import { MarketIntelModule } from '../market-intel/market-intel.module.js';
import { PublicController } from './public.controller.js';
import { PublicService } from './public.service.js';

@Module({
  imports: [PrismaModule, MarketIntelModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
