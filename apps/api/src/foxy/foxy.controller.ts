import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard.js';
import { FoxyService, type FoxyVerdict } from './foxy.service.js';

@Controller('/feed/foxy')
@UseGuards(FirebaseAuthGuard)
export class FoxyController {
  constructor(private readonly foxy: FoxyService) {}

  @Get(':setupId')
  async analyze(@Param('setupId') setupId: string): Promise<FoxyVerdict> {
    return this.foxy.analyze(setupId);
  }
}
