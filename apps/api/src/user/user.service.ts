import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { PrismaClient } from '@bottomup/db';
import { PRISMA } from '../common/prisma.module.js';

@Injectable()
export class UserService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  /**
   * GET /user/me — fetch the authenticated user's profile.
   *
   * Once `pnpm db:pull` is run and Prisma models are generated, replace the
   * raw query below with a typed `prisma.user.findUniqueOrThrow(...)` call.
   * The raw form keeps this controller compilable before introspection.
   */
  async findMe(userId: string): Promise<Record<string, unknown>> {
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT id, email, username, image, created_at, updated_at FROM "user" WHERE id = $1 LIMIT 1`,
      userId,
    );
    const user = rows[0];
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
