import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../common/prisma.module.js';
import { MiscController } from './misc.controller.js';
import { MiscService } from './misc.service.js';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [MiscController],
  providers: [MiscService],
})
export class MiscModule {}
