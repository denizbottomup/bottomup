import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { EntitlementService } from './entitlement.service.js';
import { EntitlementController } from './entitlement.controller.js';

/**
 * Centralizes "is the viewer free / trial / premium?" so every
 * feature gate (trade visibility, auto-copy ratio, Bup AI quota)
 * resolves the answer the same way. Other modules import this
 * one and inject `EntitlementService`.
 */
@Module({
  imports: [PrismaModule, AuthModule],
  providers: [EntitlementService],
  controllers: [EntitlementController],
  exports: [EntitlementService],
})
export class EntitlementModule {}
