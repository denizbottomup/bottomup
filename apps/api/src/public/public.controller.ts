import { Controller, Get } from '@nestjs/common';
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
}
