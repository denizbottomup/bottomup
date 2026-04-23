import { Redis } from 'ioredis';
import type { Logger } from 'pino';
import { redisKey, type WsChannel } from '@bottomup/events';

/**
 * Thin wrapper around a single Redis publisher connection. Replicator
 * calls publish(channel, id, payload) after a row is persisted and the
 * ws gateway fans it out to connected clients.
 *
 * Two dedup guards keep the wire quiet:
 *   1. We only PUBLISH the id-specific topic. The ws gateway already
 *      fans every (channel,id) frame out to both `setup:<id>` and
 *      `setup:*` topic subscribers, so publishing `*` ourselves would
 *      create a triple-send to wildcard clients (observed 3× during a
 *      live probe on 2026-04-23).
 *   2. Replicator re-upserts a row every tick whenever it falls inside
 *      CURSOR_SLACK_MS; before publishing we hash the payload and skip
 *      if it matches the last-seen hash for that (channel,id). That
 *      trims the stream to real content changes.
 */
export class RealtimeBus {
  private readonly pub: Redis;
  private readonly lastHash = new Map<string, string>();

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
    const key = `${channel}:${id}`;
    if (this.lastHash.get(key) === body) return;
    this.lastHash.set(key, body);
    // Bound the cache so a long-running process doesn't grow without limit.
    if (this.lastHash.size > 5000) {
      const firstKey = this.lastHash.keys().next().value as string | undefined;
      if (firstKey) this.lastHash.delete(firstKey);
    }
    void this.pub.publish(redisKey.wsPub(channel, id), body).catch((err) => {
      this.log.warn({ err: (err as Error).message, channel, id }, 'realtime-bus: publish failed');
    });
  }
}
