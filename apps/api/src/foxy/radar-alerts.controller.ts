import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard.js';
import {
  CurrentUser,
  type AuthedUser,
} from '../common/decorators/current-user.decorator.js';
import {
  RadarAlertsService,
  RADAR_ALERT_COOLDOWN_MINUTES,
} from './radar-alerts.service.js';

/**
 * `/me/foxy/radar/*` — per-user radar alert subscriptions. All routes
 * are NEW paths (mobile 2.2.1's frozen REST surface is untouched) and
 * auth-gated like the rest of `/me/*`.
 */
@Controller('/me/foxy/radar')
@UseGuards(FirebaseAuthGuard)
export class RadarAlertsController {
  constructor(private readonly alerts: RadarAlertsService) {}

  /**
   * Everything the alert panel needs in one round-trip: followed
   * coins, channel state, VAPID public key for `PushManager.subscribe`,
   * and whether Telegram delivery is available server-side.
   */
  @Get('/alerts')
  async alerts_(@CurrentUser() user: AuthedUser): Promise<{
    follows: string[];
    cooldown_minutes: number;
    webpush: { enabled: boolean; public_key: string | null; endpoints: string[] };
    telegram: { configured: boolean; bot: string | null; linked: boolean };
  }> {
    const [follows, channels] = await Promise.all([
      this.alerts.follows(user),
      this.alerts.channelSummary(user),
    ]);
    return {
      follows,
      cooldown_minutes: RADAR_ALERT_COOLDOWN_MINUTES,
      webpush: {
        enabled: this.alerts.isWebPushEnabled(),
        public_key: this.alerts.vapidPublicKey,
        endpoints: channels.webpush_endpoints,
      },
      telegram: {
        configured: this.alerts.isTelegramConfigured(),
        bot: this.alerts.telegramBot(),
        linked: channels.telegram_linked,
      },
    };
  }

  @Post('/follow')
  async follow(
    @CurrentUser() user: AuthedUser,
    @Body() body: { coin?: string },
  ): Promise<{ follows: string[] }> {
    if (!body?.coin) throw new BadRequestException('coin required');
    return { follows: await this.alerts.follow(user, body.coin) };
  }

  @Delete('/follow/:coin')
  async unfollow(
    @CurrentUser() user: AuthedUser,
    @Param('coin') coin: string,
  ): Promise<{ follows: string[] }> {
    return { follows: await this.alerts.unfollow(user, coin) };
  }

  /** Body is `PushSubscription.toJSON()` from the browser. */
  @Post('/webpush')
  async saveWebPush(
    @CurrentUser() user: AuthedUser,
    @Body()
    body: { endpoint?: string; keys?: { p256dh?: string; auth?: string } },
  ): Promise<{ ok: true }> {
    if (!this.alerts.isWebPushEnabled()) {
      throw new ServiceUnavailableException('Web Push is not configured');
    }
    const endpoint = body?.endpoint;
    const p256dh = body?.keys?.p256dh;
    const auth = body?.keys?.auth;
    if (!endpoint || !p256dh || !auth) {
      throw new BadRequestException('endpoint + keys.p256dh + keys.auth required');
    }
    await this.alerts.saveWebPush(user, { endpoint, keys: { p256dh, auth } });
    return { ok: true };
  }

  @Delete('/webpush')
  async removeWebPush(
    @Body() body: { endpoint?: string },
  ): Promise<{ ok: true }> {
    if (!body?.endpoint) throw new BadRequestException('endpoint required');
    await this.alerts.removeWebPush(body.endpoint);
    return { ok: true };
  }

  /** Mint the one-time deep-link code for the Telegram handshake. */
  @Post('/telegram-link')
  async telegramLink(@CurrentUser() user: AuthedUser): Promise<{
    code: string;
    bot: string | null;
    link: string | null;
  }> {
    if (!this.alerts.isTelegramConfigured()) {
      throw new ServiceUnavailableException('Telegram bot is not configured');
    }
    return this.alerts.createTelegramLink(user);
  }

  @Delete('/telegram')
  async unlinkTelegram(@CurrentUser() user: AuthedUser): Promise<{ ok: true }> {
    await this.alerts.unlinkTelegram(user);
    return { ok: true };
  }
}
