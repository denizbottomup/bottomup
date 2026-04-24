import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { MarketIntelController } from './market-intel.controller.js';
import { MarketIntelService } from './market-intel.service.js';

@Module({
  imports: [AuthModule],
  controllers: [MarketIntelController],
  providers: [MarketIntelService],
  exports: [MarketIntelService],
})
export class MarketIntelModule {}
