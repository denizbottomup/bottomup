import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { FoxyController } from './foxy.controller.js';
import { FoxyService } from './foxy.service.js';

@Module({
  imports: [AuthModule],
  controllers: [FoxyController],
  providers: [FoxyService],
})
export class FoxyModule {}
