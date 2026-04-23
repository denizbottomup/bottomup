import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { TraderController } from './trader.controller.js';
import { TraderService } from './trader.service.js';

@Module({
  imports: [AuthModule],
  controllers: [TraderController],
  providers: [TraderService],
})
export class TraderModule {}
