import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../common/prisma.module.js';
import { OkxController } from './okx.controller.js';
import { OkxService } from './okx.service.js';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [OkxController],
  providers: [OkxService],
})
export class OkxModule {}
