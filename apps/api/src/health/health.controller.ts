import { Controller, Get, Inject } from '@nestjs/common';
import type { PrismaClient } from '@bottomup/db';
import { PRISMA } from '../common/prisma.module.js';

@Controller()
export class HealthController {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  @Get('/health')
  async health(): Promise<{ status: 'ok'; db: 'ok' | 'down'; uptime: number }> {
    let db: 'ok' | 'down' = 'down';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db = 'ok';
    } catch {
      db = 'down';
    }
    return { status: 'ok', db, uptime: Math.floor(process.uptime()) };
  }
}
