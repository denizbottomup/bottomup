import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { HealthModule } from './health/health.module.js';
import { UserModule } from './user/user.module.js';
import { FeedModule } from './feed/feed.module.js';
import { FoxyModule } from './foxy/foxy.module.js';
import { TraderModule } from './trader/trader.module.js';
import { PrismaModule } from './common/prisma.module.js';

@Module({
  imports: [PrismaModule, HealthModule, AuthModule, UserModule, FeedModule, FoxyModule, TraderModule],
})
export class AppModule implements NestModule {
  configure(_consumer: MiddlewareConsumer): void {
    // Request logger and auth middleware are added as global guards/interceptors
    // per-module. Global middlewares go here if needed.
  }
}
