import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma.module.js';
import { MiscController } from './misc.controller.js';
import { MiscService } from './misc.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [MiscController],
  providers: [MiscService],
})
export class MiscModule {}
