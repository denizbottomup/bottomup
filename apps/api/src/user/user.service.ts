import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { PrismaClient } from '@bottomup/db';
import { PRISMA } from '../common/prisma.module.js';
import type { AuthedUser } from '../common/decorators/current-user.decorator.js';

export interface NotificationRow {
  id: string;
  is_read: boolean;
  type: number;
  message: string | null;
  updated_column: string | null;
  column_value: string | null;
  created_at: Date | null;
  setup_id: string | null;
  setup_coin: string | null;
  trader_id: string | null;
  trader_name: string | null;
  trader_image: string | null;
}

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

  /**
   * Patch a sparse set of editable profile fields on the viewer's user row.
   * Mobile PATCH /user/me uses the same whitelist (name, first_name,
   * last_name, instagram, telegram, twitter, monthly_roi, image, timezone,
   * language). We silently ignore unknown fields so a forward-compatible
   * client doesn't get a 400 on an added field.
   */
  async updateMe(
    viewer: AuthedUser,
    patch: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const viewerId = await this.resolveViewerId(viewer);
    const allowed = [
      'name',
      'first_name',
      'last_name',
      'instagram',
      'telegram',
      'twitter',
      'monthly_roi',
      'image',
      'timezone',
      'language',
    ] as const;

    const setClauses: string[] = [];
    const values: unknown[] = [viewerId];
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(patch, k)) {
        values.push(patch[k] === '' ? null : (patch[k] as string | null));
        setClauses.push(`${k} = $${values.length}`);
      }
    }
    if (setClauses.length === 0) {
      // Nothing to update — just return current row.
      return this.findMe({ kind: viewer.kind, id: viewer.kind === 'jwt' ? viewer.sub : viewer.uid });
    }
    setClauses.push(`updated_at = NOW()`);
    await this.prisma.$executeRawUnsafe(
      `UPDATE "user" SET ${setClauses.join(', ')} WHERE id = $1::uuid`,
      ...values,
    );
    return this.findMe({ kind: viewer.kind, id: viewer.kind === 'jwt' ? viewer.sub : viewer.uid });
  }

  async listBlocked(viewer: AuthedUser): Promise<
    Array<{
      id: string;
      name: string | null;
      first_name: string | null;
      last_name: string | null;
      image: string | null;
    }>
  > {
    const viewerId = await this.resolveViewerId(viewer);
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT u.id::text AS id, u.name, u.first_name, u.last_name, u.image
         FROM follow_notify f
         JOIN "user" u ON u.id = f.trader_id
        WHERE f.user_id = $1::uuid
          AND f.block = TRUE
          AND f.is_deleted = FALSE
        ORDER BY f.updated_at DESC NULLS LAST`,
      viewerId,
    );
    return rows.map((r) => ({
      id: r.id as string,
      name: (r.name as string | null) ?? null,
      first_name: (r.first_name as string | null) ?? null,
      last_name: (r.last_name as string | null) ?? null,
      image: (r.image as string | null) ?? null,
    }));
  }

  async reportTrader(
    viewer: AuthedUser,
    traderId: string,
    content: string,
  ): Promise<{ ok: true }> {
    const body = String(content ?? '').trim();
    if (body.length < 4 || body.length > 400) {
      throw new NotFoundException('Report content must be 4-400 characters');
    }
    const viewerId = await this.resolveViewerId(viewer);
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO report (id, created_at, updated_at, is_deleted, user_id, trader_id, setup_id, content)
       VALUES (gen_random_uuid(), NOW(), NOW(), FALSE, $1::uuid, $2::uuid, NULL, $3)
       ON CONFLICT (user_id, trader_id)
       DO UPDATE SET content = EXCLUDED.content, is_deleted = FALSE, updated_at = NOW()`,
      viewerId,
      traderId,
      body,
    );
    return { ok: true };
  }

  async blockTrader(viewer: AuthedUser, traderId: string): Promise<{ ok: true }> {
    const viewerId = await this.resolveViewerId(viewer);
    if (viewerId === traderId) return { ok: true };
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO follow_notify (id, created_at, updated_at, is_deleted, user_id, trader_id, follow, block)
       VALUES (gen_random_uuid(), NOW(), NOW(), FALSE, $1::uuid, $2::uuid, FALSE, TRUE)
       ON CONFLICT (user_id, trader_id)
       DO UPDATE SET block = TRUE, follow = FALSE, is_deleted = FALSE, updated_at = NOW()`,
      viewerId,
      traderId,
    );
    return { ok: true };
  }

  async unblockTrader(viewer: AuthedUser, traderId: string): Promise<{ ok: true }> {
    const viewerId = await this.resolveViewerId(viewer);
    await this.prisma.$executeRawUnsafe(
      `UPDATE follow_notify
          SET block = FALSE, updated_at = NOW()
        WHERE user_id = $1::uuid AND trader_id = $2::uuid`,
      viewerId,
      traderId,
    );
    return { ok: true };
  }

  async listNotifications(
    viewer: AuthedUser,
    limit = 100,
  ): Promise<{ items: NotificationRow[]; unread: number }> {
    const viewerId = await this.resolveViewerId(viewer);
    const capped = Math.max(1, Math.min(300, Math.floor(limit)));
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT n.id::text                AS id,
              COALESCE(n.is_read, FALSE) AS is_read,
              n.type                     AS type,
              n.message                  AS message,
              n.updated_column           AS updated_column,
              n.column_value             AS column_value,
              n.created_at               AS created_at,
              n.setup_id::text           AS setup_id,
              s.coin_name                AS setup_coin,
              n.trader_id::text          AS trader_id,
              u.name                     AS trader_name,
              u.image                    AS trader_image
         FROM user_notification n
         LEFT JOIN setup s ON s.id = n.setup_id
         LEFT JOIN "user" u ON u.id = n.trader_id
        WHERE n.user_id = $1::uuid
          AND n.is_deleted = FALSE
        ORDER BY n.created_at DESC NULLS LAST
        LIMIT ${capped}`,
      viewerId,
    );

    const items: NotificationRow[] = rows.map((r) => ({
      id: r.id as string,
      is_read: Boolean(r.is_read),
      type: Number(r.type ?? 0),
      message: (r.message as string | null) ?? null,
      updated_column: (r.updated_column as string | null) ?? null,
      column_value: (r.column_value as string | null) ?? null,
      created_at: (r.created_at as Date | null) ?? null,
      setup_id: (r.setup_id as string | null) ?? null,
      setup_coin: (r.setup_coin as string | null) ?? null,
      trader_id: (r.trader_id as string | null) ?? null,
      trader_name: (r.trader_name as string | null) ?? null,
      trader_image: (r.trader_image as string | null) ?? null,
    }));

    const unread = items.reduce((n, x) => n + (x.is_read ? 0 : 1), 0);
    return { items, unread };
  }

  async markAllNotificationsRead(viewer: AuthedUser): Promise<{ ok: true }> {
    const viewerId = await this.resolveViewerId(viewer);
    await this.prisma.$executeRawUnsafe(
      `UPDATE user_notification
          SET is_read = TRUE, updated_at = NOW()
        WHERE user_id = $1::uuid
          AND is_deleted = FALSE
          AND COALESCE(is_read, FALSE) = FALSE`,
      viewerId,
    );
    return { ok: true };
  }

  async markNotificationRead(
    viewer: AuthedUser,
    notificationId: string,
  ): Promise<{ ok: true }> {
    const viewerId = await this.resolveViewerId(viewer);
    await this.prisma.$executeRawUnsafe(
      `UPDATE user_notification
          SET is_read = TRUE, updated_at = NOW()
        WHERE id = $1::uuid
          AND user_id = $2::uuid`,
      notificationId,
      viewerId,
    );
    return { ok: true };
  }

  private async resolveViewerId(viewer: AuthedUser): Promise<string> {
    if (viewer.kind === 'jwt') return viewer.sub;
    const rows = await this.prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id::text AS id FROM "user" WHERE uid = $1 LIMIT 1`,
      viewer.uid,
    );
    const row = rows[0];
    if (!row) throw new NotFoundException(`Viewer not found for uid ${viewer.uid}`);
    return row.id;
  }
}
