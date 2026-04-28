import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard.js';
import {
  FoxyService,
  type FoxyChatMessage,
  type FoxyDerivatives,
  type FoxySetupsByCoin,
  type FoxyVerdict,
} from './foxy.service.js';

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

  /**
   * `/me/foxy/setups/:coin` — BottomUp setups for the asset the user
   * just asked Foxy about. The route lives under `/me/*` because it
   * requires auth and gives per-viewer-relevant data; the path
   * leading symbol is the bare ticker ("ETH", "BTC", ...) and the
   * service normalises it to the `<SYMBOL>USDT` form stored in the
   * setup table.
   */
  @Get('/me/foxy/setups/:coin')
  async setupsByCoin(
    @Param('coin') coin: string,
  ): Promise<FoxySetupsByCoin> {
    return this.foxy.setupsByCoin(coin);
  }

  /**
   * `/me/foxy/derivatives/:coin` — liquidations, OI, long/short
   * ratio and funding rate for the asset Foxy is currently
   * analysing. Each block is independently nullable so a partial
   * outage on one source still yields a useful card.
   */
  @Get('/me/foxy/derivatives/:coin')
  async derivativesByCoin(
    @Param('coin') coin: string,
  ): Promise<FoxyDerivatives> {
    return this.foxy.derivativesByCoin(coin);
  }
}
