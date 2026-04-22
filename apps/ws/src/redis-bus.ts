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
    this.sub = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: null });
    this.pub = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: null });
  }

  async start(): Promise<void> {
    await Promise.all([this.sub.connect(), this.pub.connect()]);
    await this.sub.psubscribe('ws:*');
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
    this.log.info('redis bus connected, subscribed to ws:*');
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
