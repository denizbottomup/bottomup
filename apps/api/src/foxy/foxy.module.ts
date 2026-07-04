import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { MarketIntelModule } from '../market-intel/market-intel.module.js';
import { EntitlementModule } from '../entitlement/entitlement.module.js';
import { FoxyController } from './foxy.controller.js';
import { FoxyService } from './foxy.service.js';
import { RadarAlertsController } from './radar-alerts.controller.js';
import { RadarAlertsService } from './radar-alerts.service.js';

@Module({
  // MarketIntelModule gives Foxy access to the existing CoinGlass /
  // Binance helpers (liquidations, OI, funding, L/S) so the
  // derivatives card can re-use them without duplicating the API
  // surface. EntitlementModule gates the Foxy weekly quota by
  // tier (5/week free, 100/week trial+premium).
  imports: [AuthModule, MarketIntelModule, EntitlementModule],
  // RadarAlertsService is the delivery half of the opportunity radar:
  // per-user coin follows + a 60s background scan that pushes fresh
  // flips/breakouts over Web Push / Telegram (2h coin+direction
  // cooldown). Lives here (not @bottomup/workers) because the radar
  // engine, VAPID env and web-push wiring are already in this process
  // — same precedent as Right Now's PushService.
  controllers: [FoxyController, RadarAlertsController],
  providers: [FoxyService, RadarAlertsService],
  // RightNowModule re-uses derivativesByCoin + whalesByCoin so the
  // signal engine doesn't duplicate the CoinGlass/Arkham fetch path.
  exports: [FoxyService],
})
export class FoxyModule {}
