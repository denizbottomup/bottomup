import { Body, Controller, Get, Post } from '@nestjs/common';
import { PublicService } from './public.service.js';

/**
 * Unauthenticated endpoints used by the marketing landing. Only read-
 * only, curated data — never anything a user could mine for PII.
 */
@Controller('/public')
export class PublicController {
  constructor(private readonly pub: PublicService) {}

  @Get('/landing')
  landing(): ReturnType<PublicService['landing']> {
    return this.pub.landing();
  }

  @Post('/waitlist')
  waitlist(
    @Body() body: { email?: string; source?: string },
  ): Promise<{ ok: true; already: boolean }> {
    return this.pub.joinWaitlist(body?.email ?? '', body?.source);
  }
}
