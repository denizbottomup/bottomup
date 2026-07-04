import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@bottomup/db';
import webpush from 'web-push';
import { PRISMA } from '../common/prisma.module.js';
import type { AuthedUser } from '../common/decorators/current-user.decorator.js';
import { FoxyService, type FoxyRadarItem } from './foxy.service.js';

/**
 * Radar alerts — the delivery half of the opportunity radar.
 *
 * The ETH post-mortem showed the radar flags moves ~25 minutes early,
 * but /public/radar is still pull-only: the signal exists, nobody sees
 * it unless a tab is open. This service closes that gap:
 *
 *   - Users follow coins (`foxy_radar_follow`, one row per user+coin).
 *   - A 60s background loop re-scans every followed coin with the same
 *     candle-only engine `radar()` uses (scanRadarCoin) — followed
 *     coins keep alerting even after they fall out of the top-volume
 *     universe the public strip shows.
 *   - Fresh flip/breakout → deliver over the user's channels: Web Push
 *     (VAPID, same keys Right Now push uses) and/or Telegram
 *     (`TELEGRAM_BOT_TOKEN`, chat linked via one-time deep-link code).
 *   - Spam guard: one alert per user+coin+direction per 2 hours
 *     (`foxy_radar_sent`) — a flip that stays "fresh" for 3 bars must
 *     not fire 3 times, and flip→breakout same-direction within the
 *     window collapses into the first send.
 *
 * Lives in the API (not @bottomup/workers) deliberately: the Right Now
 * push pipeline set the precedent — VAPID env + web-push are already
 * configured on this service, and the radar engine/cache live here.
 */
@Injectable()
export class RadarAlertsService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(RadarAlertsService.name);
  private readonly webPushEnabled: boolean;
  /** Public VAPID key (base64url) — frontend uses this for subscribe(). */
  readonly vapidPublicKey: string | null;

  private readonly telegramToken: string | null;
  private telegramBotUsername: string | null = null;
  private telegramOffset = 0;
  private telegramPolling = false;

  private scanTimer: NodeJS.Timeout | null = null;
  private scanning = false;
  private stopped = false;

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly foxy: FoxyService,
  ) {
    const pub = process.env.VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    const subj = process.env.VAPID_SUBJECT || 'mailto:noreply@bottomup.app';
    this.vapidPublicKey = pub ?? null;
    let enabled = false;
    if (pub && priv) {
      try {
        webpush.setVapidDetails(subj, pub, priv);
        enabled = true;
      } catch (e) {
        this.log.warn(`web-push setVapidDetails failed: ${(e as Error).message}`);
      }
    } else {
      this.log.warn('VAPID keys missing — radar Web Push disabled');
    }
    this.webPushEnabled = enabled;
    this.telegramToken = process.env.TELEGRAM_BOT_TOKEN || null;
  }

  isWebPushEnabled(): boolean {
    return this.webPushEnabled;
  }

  isTelegramConfigured(): boolean {
    return this.telegramToken != null;
  }

  telegramBot(): string | null {
    return this.telegramBotUsername;
  }

  async onModuleInit(): Promise<void> {
    await this.bootstrapTables();
    // First scan shortly after boot (give OKX/db pools a beat), then
    // every 60s — same cadence as the radar strip poll.
    this.scanTimer = setInterval(() => void this.tick(), SCAN_INTERVAL_MS);
    setTimeout(() => void this.tick(), 15_000);
    if (this.telegramToken) {
      void this.startTelegram();
    }
  }

  onModuleDestroy(): void {
    this.stopped = true;
    if (this.scanTimer) clearInterval(this.scanTimer);
    this.scanTimer = null;
  }

  /**
   * Same lazy-bootstrap pattern as foxy_query_log and
   * right_now_alert_subscription — self-contained tables, no Prisma
   * migration to ship, no-op when they already exist.
   */
  private async bootstrapTables(): Promise<void> {
    const ddl = [
      `CREATE TABLE IF NOT EXISTS foxy_radar_follow (
         id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
         user_id     uuid        NOT NULL,
         coin        varchar(24) NOT NULL,
         created_at  timestamptz NOT NULL DEFAULT NOW(),
         UNIQUE (user_id, coin)
       )`,
      `CREATE INDEX IF NOT EXISTS ix_foxy_radar_follow_coin
         ON foxy_radar_follow (coin)`,
      // One row per delivery target. kind='webpush' → endpoint is the
      // push URL + p256dh/auth keys; kind='telegram' → endpoint is the
      // chat id, key columns stay NULL.
      `CREATE TABLE IF NOT EXISTS foxy_radar_channel (
         id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
         user_id     uuid        NOT NULL,
         kind        varchar(12) NOT NULL,
         endpoint    text        NOT NULL UNIQUE,
         p256dh      text,
         auth        text,
         created_at  timestamptz NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS ix_foxy_radar_channel_user
         ON foxy_radar_channel (user_id)`,
      // Cooldown ledger — one alert per user+coin+direction per window.
      `CREATE TABLE IF NOT EXISTS foxy_radar_sent (
         user_id      uuid        NOT NULL,
         coin         varchar(24) NOT NULL,
         direction    varchar(8)  NOT NULL,
         last_sent_at timestamptz NOT NULL DEFAULT NOW(),
         PRIMARY KEY (user_id, coin, direction)
       )`,
      // One-time codes for the Telegram deep-link handshake.
      `CREATE TABLE IF NOT EXISTS foxy_telegram_link (
         code        varchar(32) PRIMARY KEY,
         user_id     uuid        NOT NULL,
         created_at  timestamptz NOT NULL DEFAULT NOW(),
         consumed_at timestamptz
       )`,
    ];
    for (const sql of ddl) {
      try {
        await this.prisma.$executeRawUnsafe(sql);
      } catch (err) {
        this.log.warn(
          `radar alerts bootstrap failed (will retry next boot): ${(err as Error).message}`,
        );
        return;
      }
    }
  }

  // ─── Follow / channel management (backs /me/foxy/radar/*) ─────────

  async follows(viewer: AuthedUser): Promise<string[]> {
    const userId = await this.resolveViewerId(viewer);
    return this.followsById(userId);
  }

  private async followsById(userId: string): Promise<string[]> {
    const rows = await this.prisma.$queryRawUnsafe<Array<{ coin: string }>>(
      `SELECT coin FROM foxy_radar_follow WHERE user_id = $1::uuid ORDER BY created_at`,
      userId,
    );
    return rows.map((r) => r.coin);
  }

  async follow(viewer: AuthedUser, coinInput: string): Promise<string[]> {
    const coin = normalizeCoin(coinInput);
    const userId = await this.resolveViewerId(viewer);
    const current = await this.followsById(userId);
    if (!current.includes(coin) && current.length >= MAX_FOLLOWS) {
      throw new BadRequestException(
        `En fazla ${MAX_FOLLOWS} coin takip edebilirsin — önce birini bırak.`,
      );
    }
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO foxy_radar_follow (user_id, coin) VALUES ($1::uuid, $2)
       ON CONFLICT (user_id, coin) DO NOTHING`,
      userId,
      coin,
    );
    return this.followsById(userId);
  }

  async unfollow(viewer: AuthedUser, coinInput: string): Promise<string[]> {
    const coin = normalizeCoin(coinInput);
    const userId = await this.resolveViewerId(viewer);
    await this.prisma.$executeRawUnsafe(
      `DELETE FROM foxy_radar_follow WHERE user_id = $1::uuid AND coin = $2`,
      userId,
      coin,
    );
    return this.followsById(userId);
  }

  async channelSummary(viewer: AuthedUser): Promise<{
    webpush_endpoints: string[];
    telegram_linked: boolean;
  }> {
    const userId = await this.resolveViewerId(viewer);
    const rows = await this.prisma.$queryRawUnsafe<
      Array<{ kind: string; endpoint: string }>
    >(
      `SELECT kind, endpoint FROM foxy_radar_channel WHERE user_id = $1::uuid`,
      userId,
    );
    return {
      webpush_endpoints: rows
        .filter((r) => r.kind === 'webpush')
        .map((r) => r.endpoint),
      telegram_linked: rows.some((r) => r.kind === 'telegram'),
    };
  }

  /** Idempotent register/refresh — browsers rotate keys on re-subscribe. */
  async saveWebPush(
    viewer: AuthedUser,
    sub: { endpoint: string; keys: { p256dh: string; auth: string } },
  ): Promise<void> {
    const userId = await this.resolveViewerId(viewer);
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO foxy_radar_channel (user_id, kind, endpoint, p256dh, auth)
       VALUES ($1::uuid, 'webpush', $2, $3, $4)
       ON CONFLICT (endpoint) DO UPDATE
         SET user_id = EXCLUDED.user_id,
             p256dh  = EXCLUDED.p256dh,
             auth    = EXCLUDED.auth`,
      userId,
      sub.endpoint,
      sub.keys.p256dh,
      sub.keys.auth,
    );
  }

  async removeWebPush(endpoint: string): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      `DELETE FROM foxy_radar_channel WHERE kind = 'webpush' AND endpoint = $1`,
      endpoint,
    );
  }

  /**
   * Mint a one-time code the user carries to the bot via the
   * `https://t.me/<bot>?start=<code>` deep link. The poller consumes
   * it on `/start <code>` and binds the chat id as a channel.
   */
  async createTelegramLink(
    viewer: AuthedUser,
  ): Promise<{ code: string; bot: string | null; link: string | null }> {
    const userId = await this.resolveViewerId(viewer);
    const code = randomUUID().replace(/-/g, '').slice(0, 12);
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO foxy_telegram_link (code, user_id) VALUES ($1, $2::uuid)`,
      code,
      userId,
    );
    const bot = this.telegramBotUsername;
    return {
      code,
      bot,
      link: bot ? `https://t.me/${bot}?start=${code}` : null,
    };
  }

  async unlinkTelegram(viewer: AuthedUser): Promise<void> {
    const userId = await this.resolveViewerId(viewer);
    await this.prisma.$executeRawUnsafe(
      `DELETE FROM foxy_radar_channel WHERE kind = 'telegram' AND user_id = $1::uuid`,
      userId,
    );
  }

  // ─── Background scan loop ──────────────────────────────────────────

  private async tick(): Promise<void> {
    if (this.scanning || this.stopped) return;
    this.scanning = true;
    try {
      await this.scanAndNotify();
    } catch (err) {
      this.log.warn(`radar alert tick failed: ${(err as Error).message}`);
    } finally {
      this.scanning = false;
    }
  }

  private async scanAndNotify(): Promise<void> {
    // Only coins followed by users who actually have a channel wired —
    // a follow with nowhere to deliver costs an OKX fetch for nothing.
    const rows = await this.prisma.$queryRawUnsafe<Array<{ coin: string }>>(
      `SELECT DISTINCT f.coin
         FROM foxy_radar_follow f
        WHERE EXISTS (SELECT 1 FROM foxy_radar_channel c WHERE c.user_id = f.user_id)
        LIMIT ${MAX_SCAN_COINS}`,
    );
    if (rows.length === 0) return;

    const items: FoxyRadarItem[] = [];
    await Promise.all(
      rows.map(async ({ coin }) => {
        try {
          const item = await this.foxy.scanRadarCoin(coin);
          if (item) items.push(item);
        } catch {
          // one coin failing must not stall the others
        }
      }),
    );
    if (items.length === 0) return;

    for (const item of items) {
      await this.deliver(item).catch((err) =>
        this.log.warn(
          `radar alert deliver failed for ${item.coin}: ${(err as Error).message}`,
        ),
      );
    }
  }

  private async deliver(item: FoxyRadarItem): Promise<void> {
    // Followers of the coin who are OUTSIDE the cooldown window for
    // this direction. The ledger row is upserted right after — even a
    // partially failed send counts as "sent" so a flaky push endpoint
    // can't turn the 60s loop into a spam cannon.
    const users = await this.prisma.$queryRawUnsafe<Array<{ user_id: string }>>(
      `SELECT f.user_id::text AS user_id
         FROM foxy_radar_follow f
        WHERE f.coin = $1
          AND EXISTS (SELECT 1 FROM foxy_radar_channel c WHERE c.user_id = f.user_id)
          AND NOT EXISTS (
            SELECT 1 FROM foxy_radar_sent s
             WHERE s.user_id = f.user_id
               AND s.coin = f.coin
               AND s.direction = $2
               AND s.last_sent_at > NOW() - INTERVAL '${COOLDOWN_HOURS} hours')`,
      item.coin,
      item.direction,
    );
    if (users.length === 0) return;
    const userIds = users.map((u) => u.user_id);

    const channels = await this.prisma.$queryRawUnsafe<
      Array<{
        user_id: string;
        kind: string;
        endpoint: string;
        p256dh: string | null;
        auth: string | null;
      }>
    >(
      `SELECT user_id::text AS user_id, kind, endpoint, p256dh, auth
         FROM foxy_radar_channel
        WHERE user_id = ANY($1::uuid[])`,
      userIds,
    );
    if (channels.length === 0) return;

    const msg = radarMessage(item);
    const pushBody = JSON.stringify({
      type: 'foxy_radar',
      coin: item.coin,
      direction: item.direction,
      kind: item.kind,
      price: item.price,
      title: msg.title,
      message: msg.body,
      url: `/home/foxy?coin=${encodeURIComponent(item.coin)}`,
    });

    const staleEndpoints: string[] = [];
    await Promise.all(
      channels.map(async (ch) => {
        try {
          if (ch.kind === 'webpush') {
            if (!this.webPushEnabled || !ch.p256dh || !ch.auth) return;
            await webpush.sendNotification(
              { endpoint: ch.endpoint, keys: { p256dh: ch.p256dh, auth: ch.auth } },
              pushBody,
            );
          } else if (ch.kind === 'telegram') {
            await this.sendTelegram(ch.endpoint, msg);
          }
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          // 404/410 = browser unsubscribed — drop the row.
          if (ch.kind === 'webpush' && (status === 404 || status === 410)) {
            staleEndpoints.push(ch.endpoint);
          } else {
            this.log.warn(
              `radar ${ch.kind} send failed (status ${status ?? '?'}): ${(err as Error).message}`,
            );
          }
        }
      }),
    );

    if (staleEndpoints.length > 0) {
      await this.prisma
        .$executeRawUnsafe(
          `DELETE FROM foxy_radar_channel WHERE endpoint = ANY($1::text[])`,
          staleEndpoints,
        )
        .catch(() => undefined);
    }

    await this.prisma.$executeRawUnsafe(
      `INSERT INTO foxy_radar_sent (user_id, coin, direction)
       SELECT unnest($1::uuid[]), $2, $3
       ON CONFLICT (user_id, coin, direction) DO UPDATE SET last_sent_at = NOW()`,
      userIds,
      item.coin,
      item.direction,
    );
    this.log.log(
      `radar alert: ${item.coin} ${item.direction} ${item.kind} → ${userIds.length} user(s), ${channels.length} channel(s)`,
    );
  }

  // ─── Telegram ──────────────────────────────────────────────────────

  private async startTelegram(): Promise<void> {
    try {
      const me = await this.telegramApi<{ username?: string }>('getMe', {});
      this.telegramBotUsername = me?.username ?? null;
      this.log.log(`telegram bot connected: @${this.telegramBotUsername ?? '?'}`);
    } catch (err) {
      this.log.warn(`telegram getMe failed: ${(err as Error).message}`);
    }
    void this.pollTelegram();
  }

  /**
   * Long-poll loop for the link handshake. Telegram allows exactly one
   * getUpdates consumer per bot — this API process is it (single
   * replica on Railway), nothing else may poll the same token.
   */
  private async pollTelegram(): Promise<void> {
    if (this.telegramPolling || this.stopped || !this.telegramToken) return;
    this.telegramPolling = true;
    try {
      const updates = await this.telegramApi<
        Array<{
          update_id: number;
          message?: {
            text?: string;
            chat?: { id: number };
          };
        }>
      >('getUpdates', { timeout: 25, offset: this.telegramOffset });
      for (const u of updates ?? []) {
        this.telegramOffset = Math.max(this.telegramOffset, u.update_id + 1);
        const text = u.message?.text?.trim() ?? '';
        const chatId = u.message?.chat?.id;
        if (!chatId || !text) continue;
        await this.handleTelegramCommand(String(chatId), text).catch((err) =>
          this.log.warn(`telegram command failed: ${(err as Error).message}`),
        );
      }
    } catch (err) {
      this.log.warn(`telegram poll failed: ${(err as Error).message}`);
      await sleep(5000);
    } finally {
      this.telegramPolling = false;
      if (!this.stopped) setTimeout(() => void this.pollTelegram(), 500);
    }
  }

  private async handleTelegramCommand(chatId: string, text: string): Promise<void> {
    if (text.startsWith('/start')) {
      const code = text.slice('/start'.length).trim();
      if (!code) {
        await this.sendTelegram(chatId, {
          title: '',
          body:
            'Bu bot bupcore.ai Foxy radar bildirimleri için. Bağlamak için ' +
            'sitede Foxy sayfasındaki bildirim panelinden "Telegram\'ı bağla" adımını kullan.',
        });
        return;
      }
      const rows = await this.prisma.$queryRawUnsafe<Array<{ user_id: string }>>(
        `UPDATE foxy_telegram_link
            SET consumed_at = NOW()
          WHERE code = $1
            AND consumed_at IS NULL
            AND created_at > NOW() - INTERVAL '1 hour'
        RETURNING user_id::text AS user_id`,
        code,
      );
      const userId = rows[0]?.user_id;
      if (!userId) {
        await this.sendTelegram(chatId, {
          title: '',
          body: 'Bu bağlantı kodu geçersiz ya da süresi dolmuş. Siteden yeni bir bağlantı al.',
        });
        return;
      }
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO foxy_radar_channel (user_id, kind, endpoint)
         VALUES ($1::uuid, 'telegram', $2)
         ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id`,
        userId,
        chatId,
      );
      await this.sendTelegram(chatId, {
        title: '',
        body:
          'Bağlandı 🦊 Takip ettiğin coinlerde sinyal dönünce ya da hacimli kırılım ' +
          'olunca buradan yazacağım. Kapatmak istersen /stop yeter.',
      });
      return;
    }
    if (text.startsWith('/stop')) {
      await this.prisma.$executeRawUnsafe(
        `DELETE FROM foxy_radar_channel WHERE kind = 'telegram' AND endpoint = $1`,
        chatId,
      );
      await this.sendTelegram(chatId, {
        title: '',
        body: 'Tamam, bildirimleri kapattım. Tekrar istersen siteden yeniden bağlanabilirsin.',
      });
    }
  }

  private async sendTelegram(
    chatId: string,
    msg: { title: string; body: string; url?: string },
  ): Promise<void> {
    if (!this.telegramToken) return;
    const lines = [msg.title, msg.body].filter(Boolean).join('\n');
    await this.telegramApi('sendMessage', {
      chat_id: chatId,
      text: msg.url ? `${lines}\n${msg.url}` : lines,
      disable_web_page_preview: true,
    });
  }

  private async telegramApi<T>(method: string, payload: unknown): Promise<T> {
    const res = await fetch(
      `https://api.telegram.org/bot${this.telegramToken}/${method}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        // getUpdates long-poll holds up to 25s server-side.
        signal: AbortSignal.timeout(35_000),
      },
    );
    const json = (await res.json()) as { ok: boolean; result?: T; description?: string };
    if (!json.ok) throw new Error(json.description ?? `telegram ${method} failed`);
    return json.result as T;
  }

  // ─── Helpers ───────────────────────────────────────────────────────

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

const SCAN_INTERVAL_MS = 60_000;
const COOLDOWN_HOURS = 2;
const MAX_FOLLOWS = 20;
/** Hard cap on distinct coins scanned per tick — one OKX candle fetch
 *  each; keeps a pathological follow spread from hammering OKX. */
const MAX_SCAN_COINS = 60;

export const RADAR_ALERT_COOLDOWN_MINUTES = COOLDOWN_HOURS * 60;

function normalizeCoin(input: string): string {
  const coin = String(input ?? '')
    .trim()
    .toUpperCase()
    .replace(/[-/]?USDT$/, '');
  if (!/^[A-Z0-9]{2,15}$/.test(coin)) {
    throw new BadRequestException('Geçersiz coin sembolü');
  }
  return coin;
}

/**
 * Notification copy — founder voice, plain Turkish, no indicator
 * jargon. The user should grasp "what happened + at what price" from
 * the lock screen alone.
 */
function radarMessage(item: FoxyRadarItem): { title: string; body: string; url: string } {
  const up = item.direction === 'LONG';
  const price = formatUsd(item.price);
  const url = `https://bupcore.ai/home/foxy?coin=${encodeURIComponent(item.coin)}`;
  if (item.kind === 'breakout') {
    const mult = item.vol_mult != null ? `${item.vol_mult}` : 'yüksek';
    return {
      title: `🔥 ${item.coin} ${up ? 'yukarı' : 'aşağı'} kırdı`,
      body: up
        ? `Fiyat son saatlerin tepesini ortalamanın ${mult} katı hacimle geçti. Şu an ${price}.`
        : `Fiyat son saatlerin dibini ortalamanın ${mult} katı hacimle kırdı. Şu an ${price}.`,
      url,
    };
  }
  const when =
    item.bars_ago === 0 ? 'az önce' : `${item.bars_ago * 5} dakika önce`;
  return {
    title: `🦊 ${item.coin} ${up ? 'yukarı' : 'aşağı'} döndü`,
    body: `5 dakikalık sinyal ${when} ${up ? 'yukarı' : 'aşağı'} döndü. Fiyat ${price}.`,
    url,
  };
}

function formatUsd(n: number): string {
  if (!Number.isFinite(n)) return '$?';
  if (n >= 1000) return `$${Math.round(n).toLocaleString('en-US')}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toPrecision(4)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
