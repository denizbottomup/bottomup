import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { FoxyModule } from '../foxy/foxy.module.js';
import { RightNowController } from './right-now.controller.js';
import { RightNowService } from './right-now.service.js';

/**
 * Right Now — anlık AI yön sinyali. FoxyModule'den derivativesByCoin
 * + whalesByCoin'i re-use ederiz; kendi başımıza Binance klines
 * çeker, deterministic confluence + Sonnet overlay üretiriz.
 */
@Module({
  imports: [AuthModule, FoxyModule],
  controllers: [RightNowController],
  providers: [RightNowService],
})
export class RightNowModule {}
