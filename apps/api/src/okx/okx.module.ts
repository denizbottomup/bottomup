import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma.module.js';
import { OkxController } from './okx.controller.js';
import { OkxService } from './okx.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [OkxController],
  providers: [OkxService],
})
export class OkxModule {}
