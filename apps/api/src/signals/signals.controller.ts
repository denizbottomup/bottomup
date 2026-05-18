import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard.js';
import { SignalsService, type SignalsFeed } from './signals.service.js';

@Controller('/me/signals')
@UseGuards(FirebaseAuthGuard)
export class SignalsController {
  constructor(private readonly signals: SignalsService) {}

  /**
   * `/me/signals/feed` — cross-coin trader setup feed.
   *
   * Query params:
   *   - `closed_hours` (default 48): how far back to include closed /
   *     stopped / TP-hit setups so the UI can render "şu saatte ne
   *     oldu" alongside the active book.
   *   - `limit` (default 120): hard cap on returned rows; the UI
   *     polls every 30 s so we keep this generous.
   */
  @Get('/feed')
  async feed(
    @Query('closed_hours') closedHoursRaw?: string,
    @Query('limit') limitRaw?: string,
  ): Promise<SignalsFeed> {
    const closedHours = Number(closedHoursRaw);
    const limit = Number(limitRaw);
    return this.signals.feed({
      closedHours: Number.isFinite(closedHours) && closedHours > 0
        ? Math.min(closedHours, 168)
        : 48,
      limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 300) : 120,
    });
  }
}
