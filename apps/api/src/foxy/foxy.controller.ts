import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard.js';
import { FoxyService, type FoxyChatMessage, type FoxyVerdict } from './foxy.service.js';

@Controller()
@UseGuards(FirebaseAuthGuard)
export class FoxyController {
  constructor(private readonly foxy: FoxyService) {}

  @Get('/feed/foxy/:setupId')
  async analyze(@Param('setupId') setupId: string): Promise<FoxyVerdict> {
    return this.foxy.analyze(setupId);
  }

  @Post('/foxy/chat')
  async chat(
    @Body() body: { messages?: FoxyChatMessage[] },
  ): Promise<{ reply: string }> {
    const msgs = Array.isArray(body?.messages) ? body.messages : [];
    if (msgs.length === 0) throw new BadRequestException('messages required');
    const reply = await this.foxy.chat(msgs);
    return { reply };
  }
}
