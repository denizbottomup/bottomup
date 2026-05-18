import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SignalsController } from './signals.controller.js';
import { SignalsService } from './signals.service.js';

/**
 * Cross-coin signals feed for the authenticated viewer. The feed
 * shows every currently-live trader setup (incoming + active) plus a
 * tail of recently-closed ones, so the UI can render both the active
 * book and a "what just happened" event log next to each other.
 */
@Module({
  imports: [AuthModule],
  controllers: [SignalsController],
  providers: [SignalsService],
})
export class SignalsModule {}
