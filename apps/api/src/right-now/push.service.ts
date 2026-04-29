import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { PrismaClient } from '@bottomup/db';
import { PRISMA } from '../common/prisma.module.js';
import webpush from 'web-push';

/**
 * Web Push delivery for Right Now combined-direction flips.
 *
 * Mimari:
 *   - Subscriptions DB'de tutuluyor (`right_now_alert_subscription`)
 *     — kullanıcı tarayıcıyı kapatıp açtığında bile alert akışı devam
 *     etsin.
 *   - VAPID anahtarları env'den okunuyor; eksikse servis sessizce
 *     "disabled" durumda — kayıt endpoint'leri 503 döner, broadcast
 *     no-op olur. Production'da `VAPID_PUBLIC_KEY`,
 *     `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` set edilmelidir.
 *   - Her combined flip için tek bir broadcast — coin filtresi + tier
 *     filtresi yok (MVP). İleride per-user filter ekleyeceğiz.
 *   - 410/404 dönen subscription'lar otomatik silinir (browser
 *     unsubscribed).
 */
@Injectable()
export class PushService implements OnModuleInit {
  private readonly log = new Logger(PushService.name);
  private readonly enabled: boolean;
  /** Public VAPID key (base64url) — frontend uses this for subscribe(). */
  readonly publicKey: string | null;

  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {
    const pub = process.env.VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    const subj = process.env.VAPID_SUBJECT || 'mailto:noreply@bottomup.app';
    this.publicKey = pub ?? null;
    if (pub && priv) {
      try {
        webpush.setVapidDetails(subj, pub, priv);
        this.enabled = true;
      } catch (e) {
        this.log.warn(`web-push setVapidDetails failed: ${(e as Error).message}`);
        this.enabled = false;
      }
    } else {
      this.log.warn('VAPID keys missing — Web Push disabled, in-app alerts still work');
      this.enabled = false;
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS right_now_alert_subscription (
          id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id     uuid        NOT NULL,
          endpoint    text        NOT NULL UNIQUE,
          p256dh      text        NOT NULL,
          auth        text        NOT NULL,
          coins       text[]      NOT NULL DEFAULT ARRAY['BTC','ETH','SOL','BNB','XRP']::text[],
          created_at  timestamptz NOT NULL DEFAULT NOW(),
          last_sent_at timestamptz
        );
      `);
      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS ix_rn_alert_user
          ON right_now_alert_subscription (user_id);
      `);
    } catch (err) {
      this.log.warn(
        `right_now_alert_subscription bootstrap failed (will retry next boot): ${(err as Error).message}`,
      );
    }
  }

  /**
   * Persist a new browser subscription. If the same endpoint already
   * exists we update the keys (browser may rotate them) and reset the
   * coin filter — idempotent register/refresh.
   */
  async subscribe(
    userId: string,
    sub: { endpoint: string; keys: { p256dh: string; auth: string } },
    coins: string[] = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP'],
  ): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO right_now_alert_subscription (user_id, endpoint, p256dh, auth, coins)
       VALUES ($1::uuid, $2, $3, $4, $5::text[])
       ON CONFLICT (endpoint) DO UPDATE
         SET user_id = EXCLUDED.user_id,
             p256dh  = EXCLUDED.p256dh,
             auth    = EXCLUDED.auth,
             coins   = EXCLUDED.coins`,
      userId,
      sub.endpoint,
      sub.keys.p256dh,
      sub.keys.auth,
      coins,
    );
  }

  async unsubscribe(endpoint: string): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      `DELETE FROM right_now_alert_subscription WHERE endpoint = $1`,
      endpoint,
    );
  }

  /**
   * Send a combined-flip notification to every subscriber whose `coins`
   * filter includes the asset. Stale (410/404) subscriptions are deleted
   * inline so the next broadcast doesn't keep retrying them.
   */
  async broadcastFlip(
    coin: string,
    payload: { from: string; to: string; at: string; confidence: number },
  ): Promise<void> {
    if (!this.enabled) return;
    let rows: Array<{ endpoint: string; p256dh: string; auth: string }>;
    try {
      rows = await this.prisma.$queryRawUnsafe<
        Array<{ endpoint: string; p256dh: string; auth: string }>
      >(
        `SELECT endpoint, p256dh, auth
           FROM right_now_alert_subscription
          WHERE $1 = ANY(coins)`,
        coin,
      );
    } catch (err) {
      this.log.error(`broadcastFlip query failed: ${(err as Error).message}`);
      return;
    }
    if (rows.length === 0) return;

    const body = JSON.stringify({
      type: 'right_now_flip',
      coin,
      from: payload.from,
      to: payload.to,
      at: payload.at,
      confidence: payload.confidence,
      title: `${coin}: ${payload.to.toUpperCase()}`,
      message: `Kombine yön ${payload.from.toUpperCase()} → ${payload.to.toUpperCase()}. Güven %${Math.round(
        payload.confidence * 100,
      )}.`,
    });

    const stale: string[] = [];
    await Promise.all(
      rows.map(async (r) => {
        try {
          await webpush.sendNotification(
            { endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } },
            body,
          );
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          // 404 / 410 = subscription gone (browser unsubscribed). Drop it.
          if (status === 404 || status === 410) {
            stale.push(r.endpoint);
          } else {
            this.log.warn(
              `push send failed (status ${status ?? '?'}): ${(err as Error).message}`,
            );
          }
        }
      }),
    );
    if (stale.length > 0) {
      await this.prisma
        .$executeRawUnsafe(
          `DELETE FROM right_now_alert_subscription WHERE endpoint = ANY($1::text[])`,
          stale,
        )
        .catch(() => undefined);
      this.log.log(`Cleaned ${stale.length} stale subscriptions for ${coin}`);
    }
  }
}
