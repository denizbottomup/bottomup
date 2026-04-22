import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { PrismaClient } from '@bottomup/db';
import { PRISMA } from '../common/prisma.module.js';

@Injectable()
export class UserService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  /**
   * GET /user/me
   *
   * Firebase path: look up by `uid` (Firebase user id).
   * JWT path:      look up by `id` (our internal UUID, set in the JWT sub claim).
   *
   * Returns a subset of columns matching the existing FastAPI contract.
   * TODO: replace with typed prisma.user.findFirst once the model name casing
   * is resolved (introspected schema uses lowercase `user`).
   */
  async findMe(params: { kind: 'jwt' | 'firebase'; id: string }): Promise<Record<string, unknown>> {
    const where = params.kind === 'firebase' ? '"uid" = $1' : '"id"::text = $1';
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT id, uid, email, phone, name, first_name, last_name, image,
              is_trader, is_customer, is_admin, is_active,
              instagram, telegram, twitter,
              created_at, updated_at
         FROM "user"
         WHERE ${where}
         LIMIT 1`,
      params.id,
    );
    const user = rows[0];
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
