import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { HealthModule } from './health/health.module.js';
import { UserModule } from './user/user.module.js';
import { FeedModule } from './feed/feed.module.js';
import { FoxyModule } from './foxy/foxy.module.js';
import { LivecastModule } from './livecast/livecast.module.js';
import { RightNowModule } from './right-now/right-now.module.js';
import { TraderModule } from './trader/trader.module.js';
import { SetupModule } from './setup/setup.module.js';
import { WatchlistModule } from './watchlist/watchlist.module.js';
import { CopyTradeModule } from './copytrade/copytrade.module.js';
import { SearchModule } from './search/search.module.js';
import { AnalyticsModule } from './analytics/analytics.module.js';
import { MarketIntelModule } from './market-intel/market-intel.module.js';
import { MiscModule } from './misc/misc.module.js';
import { OkxModule } from './okx/okx.module.js';
import { PublicModule } from './public/public.module.js';
import { EntitlementModule } from './entitlement/entitlement.module.js';
import { MeModule } from './me/me.module.js';
import { PrismaModule } from './common/prisma.module.js';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    AuthModule,
    UserModule,
    FeedModule,
    FoxyModule,
    RightNowModule,
    LivecastModule,
    TraderModule,
    SetupModule,
    WatchlistModule,
    CopyTradeModule,
    SearchModule,
    AnalyticsModule,
    MarketIntelModule,
    MiscModule,
    OkxModule,
    PublicModule,
    EntitlementModule,
    MeModule,
  ],
})
export class AppModule implements NestModule {
  configure(_consumer: MiddlewareConsumer): void {
    // Request logger and auth middleware are added as global guards/interceptors
    // per-module. Global middlewares go here if needed.
  }
}
