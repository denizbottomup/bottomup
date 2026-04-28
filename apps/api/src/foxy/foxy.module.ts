import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { MarketIntelModule } from '../market-intel/market-intel.module.js';
import { FoxyController } from './foxy.controller.js';
import { FoxyService } from './foxy.service.js';

@Module({
  // MarketIntelModule gives Foxy access to the existing CoinGlass /
  // Binance helpers (liquidations, OI, funding, L/S) so the
  // derivatives card can re-use them without duplicating the API
  // surface.
  imports: [AuthModule, MarketIntelModule],
  controllers: [FoxyController],
  providers: [FoxyService],
})
export class FoxyModule {}
