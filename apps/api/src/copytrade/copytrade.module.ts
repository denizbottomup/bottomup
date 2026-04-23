import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { CopyTradeController } from './copytrade.controller.js';
import { CopyTradeService } from './copytrade.service.js';

@Module({
  imports: [AuthModule],
  controllers: [CopyTradeController],
  providers: [CopyTradeService],
})
export class CopyTradeModule {}
