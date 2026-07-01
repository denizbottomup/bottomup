import { Redis } from 'ioredis';
import type { Logger } from 'pino';
import type { WsChannel } from '@bottomup/events';

/**
 * One subscriber connection handles ALL `ws:*` traffic using pattern subscribe
 * (`PSUBSCRIBE ws:*`). One publisher connection handles pub calls. Keeping
 * these separate is a Redis best practice — a subscribed connection can't
 * issue normal commands.
 */
export class RedisBus {
  private readonly sub: Redis;
  private readonly pub: Redis;
  private readonly handlers = new Set<(channel: WsChannel, id: string, payload: unknown) => void>();

  constructor(
    url: string,
    private readonly log: Logger,
  ) {
    // Mirror the workers realtime-bus resilience so a transient Redis
    // hiccup never crash-loops the ws process (Railway incident
    // 2026-06-27). `family: 0` resolves Railway's IPv6-only private DNS
    // (redis.railway.internal); retryStrategy keeps reconnecting; and —
    // critically — the per-client `error` handlers absorb events that
    // would otherwise be an unhandled 'error' → hard process crash.
    const opts = {
      lazyConnect: true,
      maxRetriesPerRequest: null,
      family: 0,
      retryStrategy: (times: number) => Math.min(1000 * Math.pow(2, times), 30_000),
      reconnectOnError: () => true,
    };
    this.sub = new Redis(url, opts);
    this.pub = new Redis(url, { ...opts, enableOfflineQueue: false });

    this.sub.on('error', (err) => this.log.warn({ err: err.message }, 'redis sub error'));
    this.pub.on('error', (err) => this.log.warn({ err: err.message }, 'redis pub error'));

    // Subscriptions are dropped on disconnect, so (re)subscribe on every
    // `ready` — keeps ws:* live across reconnects, not just first boot.
    this.sub.on('ready', () => {
      this.sub.psubscribe('ws:*').then(
        () => this.log.info('redis bus subscribed to ws:*'),
        (err: unknown) =>
          this.log.warn({ err: (err as Error).message }, 'redis psubscribe failed'),
      );
    });

    this.sub.on('pmessage', (_pattern: string, channel: string, message: string) => {
      const match = /^ws:([^:]+):(.+)$/.exec(channel);
      if (!match) return;
      const [, wsChannel, id] = match;
      if (!id) return;
      let payload: unknown;
      try {
        payload = JSON.parse(message);
      } catch {
        this.log.warn({ channel, message }, 'redis: dropped non-json pmessage');
        return;
      }
      for (const handler of this.handlers) {
        try {
          handler(wsChannel as WsChannel, id, payload);
        } catch (err) {
          this.log.error({ err }, 'redis: handler threw');
        }
      }
    });
  }

  async start(): Promise<void> {
    // Fire-and-forget connect: ioredis retries forever on its own and
    // the `error` handlers absorb transient ETIMEDOUTs. Awaiting here
    // (the old behaviour) is exactly what tore the process down at boot.
    this.sub.connect().catch((err) =>
      this.log.warn({ err: (err as Error).message }, 'redis sub connect failed; retrying'),
    );
    this.pub.connect().catch((err) =>
      this.log.warn({ err: (err as Error).message }, 'redis pub connect failed; retrying'),
    );
  }

  onMessage(handler: (channel: WsChannel, id: string, payload: unknown) => void): void {
    this.handlers.add(handler);
  }

  async publish(channel: WsChannel, id: string, payload: unknown): Promise<void> {
    await this.pub.publish(`ws:${channel}:${id.toLowerCase()}`, JSON.stringify(payload));
  }

  async stop(): Promise<void> {
    await Promise.all([this.sub.quit(), this.pub.quit()]);
  }
}
