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

export interface SubscriptionRow {
  id: string;
  market: string | null;
  transaction_id: string | null;
  start_date: Date | null;
  expire_date: Date | null;
  is_expired: boolean;
  is_cancelled: boolean;
  is_trial: boolean;
  auto_renew_status: boolean;
  price: number | null;
  currency: string | null;
  product_id: string | null;
  product_code: string | null;
  product_name: string | null;
  product_duration: number | null;
  trader_id: string | null;
  trader_name: string | null;
  trader_image: string | null;
}

export interface TraderEarningRow {
  id: string;
  amount: number | null;
  paid_amount_credits: number | null;
  is_paid: boolean;
  is_cancelled: boolean;
  is_trial: boolean;
  trader_earn_date: Date | null;
  paid_date: Date | null;
  installments: number;
  installment: number;
  subscription_id: string | null;
  product_name: string | null;
  product_code: string | null;
}

export interface TraderEarningSummary {
  total_earned: number;
  total_paid: number;
  total_pending: number;
  trial_pending: number;
  monthly: Array<{ ym: string; amount: number; paid: number; count: number }>;
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

  async listMySubscriptions(viewer: AuthedUser): Promise<{ items: SubscriptionRow[] }> {
    const viewerId = await this.resolveViewerId(viewer);
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT us.id::text                  AS id,
              us.market                     AS market,
              us.transaction_id             AS transaction_id,
              us.start_date                 AS start_date,
              us.expire_date                AS expire_date,
              us.is_expired                 AS is_expired,
              us.is_cancelled               AS is_cancelled,
              us.is_trial                   AS is_trial,
              us.auto_renew_status          AS auto_renew_status,
              us.price                      AS price,
              us.currency                   AS currency,
              us.product_id::text           AS product_id,
              p.code                        AS product_code,
              p.name                        AS product_name,
              p.duration                    AS product_duration,
              us.trader_id::text            AS trader_id,
              t.name                        AS trader_name,
              t.image                       AS trader_image
         FROM user_subscription us
         LEFT JOIN product p ON p.id = us.product_id
         LEFT JOIN "user" t  ON t.id = us.trader_id
        WHERE us.user_id = $1::uuid
          AND us.is_deleted = FALSE
        ORDER BY us.expire_date DESC NULLS LAST,
                 us.start_date  DESC NULLS LAST
        LIMIT 200`,
      viewerId,
    );
    const items: SubscriptionRow[] = rows.map((r) => ({
      id: r.id as string,
      market: (r.market as string | null) ?? null,
      transaction_id: (r.transaction_id as string | null) ?? null,
      start_date: (r.start_date as Date | null) ?? null,
      expire_date: (r.expire_date as Date | null) ?? null,
      is_expired: Boolean(r.is_expired),
      is_cancelled: Boolean(r.is_cancelled),
      is_trial: Boolean(r.is_trial),
      auto_renew_status: Boolean(r.auto_renew_status),
      price: r.price == null ? null : Number(r.price),
      currency: (r.currency as string | null) ?? null,
      product_id: (r.product_id as string | null) ?? null,
      product_code: (r.product_code as string | null) ?? null,
      product_name: (r.product_name as string | null) ?? null,
      product_duration: r.product_duration == null ? null : Number(r.product_duration),
      trader_id: (r.trader_id as string | null) ?? null,
      trader_name: (r.trader_name as string | null) ?? null,
      trader_image: (r.trader_image as string | null) ?? null,
    }));
    return { items };
  }

  /**
   * Trader referral earnings for the viewer. Aggregates rows from
   * `trader_referral_earning` with the product linked via user_subscription,
   * then computes paid/pending/monthly roll-ups in JS so the UI has a single
   * payload to render.
   */
  async listMyEarnings(viewer: AuthedUser): Promise<{
    items: TraderEarningRow[];
    summary: TraderEarningSummary;
  }> {
    const viewerId = await this.resolveViewerId(viewer);
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT e.id::text               AS id,
              e.amount                  AS amount,
              e.paid_amount_credits     AS paid_amount_credits,
              e.is_paid                 AS is_paid,
              e.is_cancelled            AS is_cancelled,
              e.is_trial                AS is_trial,
              e.trader_earn_date        AS trader_earn_date,
              e.paid_date               AS paid_date,
              e.installments            AS installments,
              e.installment             AS installment,
              e.subscription_id::text   AS subscription_id,
              p.name                    AS product_name,
              p.code                    AS product_code
         FROM trader_referral_earning e
         LEFT JOIN user_subscription us ON us.id = e.subscription_id
         LEFT JOIN product p            ON p.id = us.product_id
        WHERE e.trader_id = $1::uuid
          AND e.is_deleted = FALSE
          AND e.is_cancelled = FALSE
        ORDER BY e.trader_earn_date DESC NULLS LAST
        LIMIT 500`,
      viewerId,
    );

    const items: TraderEarningRow[] = rows.map((r) => ({
      id: r.id as string,
      amount: r.amount == null ? null : Number(r.amount),
      paid_amount_credits:
        r.paid_amount_credits == null ? null : Number(r.paid_amount_credits),
      is_paid: Boolean(r.is_paid),
      is_cancelled: Boolean(r.is_cancelled),
      is_trial: Boolean(r.is_trial),
      trader_earn_date: (r.trader_earn_date as Date | null) ?? null,
      paid_date: (r.paid_date as Date | null) ?? null,
      installments: Number(r.installments ?? 1),
      installment: Number(r.installment ?? 1),
      subscription_id: (r.subscription_id as string | null) ?? null,
      product_name: (r.product_name as string | null) ?? null,
      product_code: (r.product_code as string | null) ?? null,
    }));

    const monthlyMap = new Map<string, { amount: number; paid: number; count: number }>();
    let totalEarned = 0;
    let totalPaid = 0;
    let trialPending = 0;
    for (const it of items) {
      const amt = it.amount ?? 0;
      totalEarned += amt;
      if (it.is_paid) totalPaid += amt;
      else if (it.is_trial) trialPending += amt;
      const d = it.trader_earn_date ?? it.paid_date;
      if (d) {
        const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        const cur = monthlyMap.get(ym) ?? { amount: 0, paid: 0, count: 0 };
        cur.amount += amt;
        if (it.is_paid) cur.paid += amt;
        cur.count += 1;
        monthlyMap.set(ym, cur);
      }
    }
    const monthly = Array.from(monthlyMap.entries())
      .map(([ym, v]) => ({ ym, amount: v.amount, paid: v.paid, count: v.count }))
      .sort((a, b) => (a.ym < b.ym ? 1 : -1))
      .slice(0, 24);

    const summary: TraderEarningSummary = {
      total_earned: round2(totalEarned),
      total_paid: round2(totalPaid),
      total_pending: round2(totalEarned - totalPaid - trialPending),
      trial_pending: round2(trialPending),
      monthly: monthly.map((m) => ({
        ym: m.ym,
        amount: round2(m.amount),
        paid: round2(m.paid),
        count: m.count,
      })),
    };

    return { items, summary };
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

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
