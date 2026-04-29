import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard.js';
import {
  CurrentUser,
  type AuthedUser,
} from '../common/decorators/current-user.decorator.js';
import { PushService } from './push.service.js';
import { RightNowService, type RightNowPayload } from './right-now.service.js';

@Controller()
@UseGuards(FirebaseAuthGuard)
export class RightNowController {
  constructor(
    private readonly rn: RightNowService,
    private readonly push: PushService,
  ) {}

  /**
   * `/me/right-now` — anlık deterministic + AI sinyal bundle. Tüm
   * kullanıcılar aynı snapshot'ı görür; cache backend'de tutulur,
   * her 60s deterministic, her 5dk AI overlay ile yenilenir.
   * Kullanıcı bu endpoint'i istediği kadar polleyebilir, upstream
   * trafiğine etkisi yok.
   */
  @Get('/me/right-now')
  snapshot(): RightNowPayload {
    return this.rn.snapshot();
  }

  /**
   * `/me/right-now/push-config` — frontend'in `PushManager.subscribe()`
   * çağrısı için gereken VAPID public key + push'un enabled olup
   * olmadığı. Public key güvenli — secret key sunucuda kalıyor.
   */
  @Get('/me/right-now/push-config')
  pushConfig(): { enabled: boolean; public_key: string | null } {
    return {
      enabled: this.push.isEnabled(),
      public_key: this.push.publicKey,
    };
  }

  /**
   * `/me/right-now/subscribe` — tarayıcının `PushSubscription.toJSON()`
   * çıktısını DB'ye yazar. Aynı endpoint tekrar gelirse keyleri
   * günceller (idempotent). Tüm coin'ler için varsayılan; ilerde
   * filtre eklenecek.
   */
  @Post('/me/right-now/subscribe')
  @HttpCode(204)
  async subscribe(
    @CurrentUser() user: AuthedUser,
    @Body()
    body: {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
      coins?: string[];
    },
  ): Promise<void> {
    if (!this.push.isEnabled()) {
      throw new ServiceUnavailableException('Web Push is not configured');
    }
    if (
      !body?.endpoint ||
      !body?.keys?.p256dh ||
      !body?.keys?.auth
    ) {
      throw new BadRequestException(
        'endpoint + keys.p256dh + keys.auth required',
      );
    }
    const coins =
      Array.isArray(body.coins) && body.coins.length > 0
        ? body.coins.map((c) => String(c).toUpperCase()).filter(Boolean)
        : ['BTC', 'ETH', 'SOL', 'BNB', 'XRP'];
    await this.push.subscribe(
      await this.rn.resolveViewerId(user),
      {
        endpoint: body.endpoint,
        keys: { p256dh: body.keys.p256dh, auth: body.keys.auth },
      },
      coins,
    );
  }

  /**
   * `/me/right-now/subscribe` DELETE — kullanıcı tarayıcıda push'u
   * kapatınca veya subscribe expired olunca çağrılır.
   */
  @Delete('/me/right-now/subscribe')
  @HttpCode(204)
  async unsubscribe(
    @Body() body: { endpoint?: string },
  ): Promise<void> {
    if (!body?.endpoint) {
      throw new BadRequestException('endpoint required');
    }
    await this.push.unsubscribe(body.endpoint);
  }
}
