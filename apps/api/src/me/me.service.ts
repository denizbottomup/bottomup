import { Injectable, NotFoundException } from '@nestjs/common';
import {
  PublicService,
  type LandingTrader,
  type TraderDetailSummary,
} from '../public/public.service.js';
import {
  EntitlementService,
  type Entitlement,
} from '../entitlement/entitlement.service.js';
import type { AuthedUser } from '../common/decorators/current-user.decorator.js';

/**
 * Free-tier trade visibility: 1 in every 5 trades from a trader's
 * close_date-ASC stream is unlocked. Locked trades are returned with
 * coin + position only, all numeric / dollar fields stripped.
 */
const UNLOCKED_EVERY = 5;

/**
 * Trade row shape after entitlement filtering. When `is_locked` is
 * true, every numeric and dollar field is stripped — the UI gets a
 * teaser row (trader + coin + side) and a 🔒 placeholder for the
 * rest, plus an upgrade CTA. When false, the row carries full data
 * just like the previous public surface.
 */
export type GatedRecentRow = TraderDetailSummary['recent'][number];

@Injectable()
export class MeService {
  constructor(
    private readonly pub: PublicService,
    private readonly entitlement: EntitlementService,
  ) {}

  /**
   * Authenticated trader detail, with entitlement-aware filtering.
   * Aggregate stats stay full (the marketing-conversion message: "this
   * trader has +28R but you can't see how — upgrade"). Only the
   * trade-by-trade list is gated.
   */
  async traderDetail(
    viewer: AuthedUser,
    name: string,
  ): Promise<TraderDetailSummary & { entitlement: Entitlement }> {
    const detail = await this.pub.traderDetail(name);
    if (!detail) throw new NotFoundException('Trader not found');

    const ent = await this.entitlement.forUser(viewer);
    return {
      ...detail,
      recent: gateTrades(detail.recent, ent),
      entitlement: ent,
    };
  }

  /**
   * Authenticated leaderboard. Re-uses `PublicService.topTraders` —
   * the same projection that used to back the (now retired)
   * unauthenticated landing card grid. Hosting it under `/me/*` lets
   * us layer per-viewer flags (followed? blocked? user's R-class
   * match) on top later, without forking the SQL.
   */
  async leaderboard(
    _viewer: AuthedUser,
    limit = 6,
  ): Promise<{ items: LandingTrader[] }> {
    const items = await this.pub.topTraders(limit);
    return { items };
  }
}

function gateTrades(
  rows: TraderDetailSummary['recent'],
  ent: Entitlement,
): TraderDetailSummary['recent'] {
  if (ent.tier !== 'free') return rows;
  return rows.map((row) => {
    const unlocked = row.index % UNLOCKED_EVERY === 0;
    if (unlocked) return { ...row, is_locked: false };
    return {
      id: row.id,
      coin: row.coin,
      position: row.position,
      // Strip every leak — status (win/loss), date, R, $.
      status: '',
      close_date: null,
      pnl: 0,
      r: 0,
      index: row.index,
      is_locked: true,
    };
  });
}
