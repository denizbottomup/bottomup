import { Redis } from 'ioredis';
import type { Logger } from 'pino';
import { redisKey, type WsChannel } from '@bottomup/events';

/**
 * Thin wrapper around a single Redis publisher connection. Replicator
 * calls publish(channel, id, payload) after a row is persisted and the
 * ws gateway (subscribed to `ws:*` pattern) fans it out to clients.
 *
 * Single connection is fine — pub-only, no commands interleaved with
 * subscribe state. We also publish the wildcard `*` id so clients that
 * bound to `setup:*` receive every update without one bind per setup.
 */
export class RealtimeBus {
  private readonly pub: Redis;

  constructor(
    url: string,
    private readonly log: Logger,
  ) {
    this.pub = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: null });
    this.pub.on('error', (err) => this.log.warn({ err: err.message }, 'realtime-bus: redis error'));
  }

  async start(): Promise<void> {
    await this.pub.connect();
    this.log.info('realtime-bus: connected');
  }

  async stop(): Promise<void> {
    await this.pub.quit();
  }

  publish(channel: WsChannel, id: string, payload: unknown): void {
    const body = JSON.stringify(payload);
    // fire-and-forget — we don't await to keep replication hot. ioredis queues.
    void this.pub.publish(redisKey.wsPub(channel, id), body).catch((err) => {
      this.log.warn({ err: (err as Error).message, channel, id }, 'realtime-bus: publish failed');
    });
    void this.pub.publish(redisKey.wsPub(channel, '*'), body).catch(() => {});
  }
}
