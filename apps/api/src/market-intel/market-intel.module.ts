import { Module } from '@nestjs/common';
import { MarketIntelController } from './market-intel.controller.js';
import { MarketIntelService } from './market-intel.service.js';

@Module({
  controllers: [MarketIntelController],
  providers: [MarketIntelService],
  exports: [MarketIntelService],
})
export class MarketIntelModule {}
