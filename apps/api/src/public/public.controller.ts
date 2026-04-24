import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
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

  @Get('/trader/:name')
  async trader(
    @Param('name') name: string,
  ): ReturnType<PublicService['traderDetail']> {
    const row = await this.pub.traderDetail(decodeURIComponent(name));
    if (!row) throw new NotFoundException('Trader not found');
    return row;
  }
}
