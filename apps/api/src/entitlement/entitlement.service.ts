import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { PrismaClient } from '@bottomup/db';
import { PRISMA } from '../common/prisma.module.js';
import type { AuthedUser } from '../common/decorators/current-user.decorator.js';

export type Tier = 'free' | 'trial' | 'premium';

export interface Entitlement {
  /**
   * The effective tier the user is treated as right now.
   * - `premium`: at least one active, non-expired, non-cancelled paid subscription
   * - `trial`:   only active subscription is a trial (premium-equivalent access)
   * - `free`:    no active subscription
   */
  tier: Tier;
  /** Latest expire_date among active subscriptions, or null if `free`. */
  expires_at: Date | null;
  /** True iff the active subscription is a trial (premium UX, but mark as trial). */
  is_trial: boolean;
}

/**
 * Single source of truth for "is this user premium right now?".
 *
 * Subscriptions are owned by mobile (Apple/Google IAP receipts land in
 * `user_subscription`). Web only reads — never inserts. This service
 * folds the row set into a tier that the rest of the app can branch
 * on.
 *
 * Free / Premium product rules (codified per Phase-1 product spec):
 * - Free users see only every 5th trade in a trader's stream
 *   (deterministic `index % 5 == 0` over close_date ASC).
 * - Trial / Premium users see all trades.
 *
 * Other gates (auto-copy ratio, Bup AI quota) read this same
 * entitlement.
 */
@Injectable()
export class EntitlementService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  /**
   * Resolve the entitlement for an authenticated user. Single
   * Postgres round-trip; cheap enough to call per-request.
   */
  async forUser(viewer: AuthedUser): Promise<Entitlement> {
    const userId = await this.resolveViewerId(viewer);
    return this.forUserId(userId);
  }

  /**
   * Direct-by-id variant for callers that already resolved the user
   * (e.g. controllers that need entitlement plus other user data).
   */
  async forUserId(userId: string): Promise<Entitlement> {
    const rows = await this.prisma.$queryRawUnsafe<Array<{
      expire_date: Date | null;
      is_trial: boolean | null;
    }>>(
      `SELECT us.expire_date, us.is_trial
         FROM user_subscription us
        WHERE us.user_id = $1::uuid
          AND us.is_deleted   = FALSE
          AND us.is_cancelled = FALSE
          AND us.is_expired   = FALSE
          AND (us.expire_date IS NULL OR us.expire_date > NOW())
        ORDER BY us.expire_date DESC NULLS LAST`,
      userId,
    );

    if (rows.length === 0) {
      return { tier: 'free', expires_at: null, is_trial: false };
    }

    // Prefer the longest-running paid subscription. If none paid, the
    // user is on a trial — treat as premium-tier access but mark it
    // so the UI can nag them to upgrade before the trial ends.
    const paid = rows.find((r) => !r.is_trial);
    const winner = paid ?? rows[0];
    if (!winner) return { tier: 'free', expires_at: null, is_trial: false };

    return {
      tier: paid ? 'premium' : 'trial',
      expires_at: winner.expire_date ?? null,
      is_trial: !paid,
    };
  }

  /**
   * Convenience predicate for "should this user see locked content?"
   * Trial users are treated as premium for visibility purposes — the
   * trial-vs-premium distinction only matters in the UI (status
   * badge, upsell timing).
   */
  hasFullAccess(ent: Entitlement): boolean {
    return ent.tier !== 'free';
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
