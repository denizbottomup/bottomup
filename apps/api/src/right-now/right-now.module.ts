import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { FoxyModule } from '../foxy/foxy.module.js';
import { PrismaModule } from '../common/prisma.module.js';
import { PushService } from './push.service.js';
import { RightNowController } from './right-now.controller.js';
import { RightNowService } from './right-now.service.js';

/**
 * Right Now — anlık AI yön sinyali. FoxyModule'den derivativesByCoin
 * + whalesByCoin'i re-use ederiz; kendi başımıza Binance klines
 * çeker, deterministic confluence + Sonnet overlay üretiriz.
 *
 * PushService ayrı bir provider — Web Push subscription'ları DB'de
 * tutar ve combined-flip durumunda bildirimi yollar. RightNowService
 * onu inject edip her tick'te flip'leri broadcast'a verir.
 */
@Module({
  imports: [AuthModule, FoxyModule, PrismaModule],
  controllers: [RightNowController],
  providers: [RightNowService, PushService],
})
export class RightNowModule {}
