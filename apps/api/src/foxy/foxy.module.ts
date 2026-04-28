import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { MarketIntelModule } from '../market-intel/market-intel.module.js';
import { EntitlementModule } from '../entitlement/entitlement.module.js';
import { FoxyController } from './foxy.controller.js';
import { FoxyService } from './foxy.service.js';

@Module({
  // MarketIntelModule gives Foxy access to the existing CoinGlass /
  // Binance helpers (liquidations, OI, funding, L/S) so the
  // derivatives card can re-use them without duplicating the API
  // surface. EntitlementModule gates the Foxy weekly quota by
  // tier (5/week free, 100/week trial+premium).
  imports: [AuthModule, MarketIntelModule, EntitlementModule],
  controllers: [FoxyController],
  providers: [FoxyService],
})
export class FoxyModule {}
