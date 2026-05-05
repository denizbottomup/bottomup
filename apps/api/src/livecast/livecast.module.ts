import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { LivecastController } from './livecast.controller.js';
import { LivecastService } from './livecast.service.js';
import { LivestreamCaptureService } from './livestream-capture.service.js';

@Module({
  imports: [AuthModule],
  controllers: [LivecastController],
  providers: [LivecastService, LivestreamCaptureService],
})
export class LivecastModule {}
