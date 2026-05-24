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
    this.pub = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: null,
      // Railway internal hostnames (`*.railway.internal`) resolve to
      // IPv6 first. Default Node DNS lookup returns A only, which
      // succeeds in form (EAI_AGAIN windowed retry) but fails to
      // connect on the IPv6-only side — the symptom is a thundering
      // herd of ETIMEDOUT events. `family: 0` lets ioredis use both
      // IPv4 and IPv6 records, picking whichever the network has.
      family: 0,
      // Don't give up on the connection; ioredis applies exponential
      // backoff and keeps trying so a transient Redis or DNS hiccup
      // never tears the workers process down.
      retryStrategy: (times) => Math.min(1000 * Math.pow(2, times), 30_000),
      reconnectOnError: () => true,
    });
    this.pub.on('error', (err) => this.log.warn({ err: err.message }, 'realtime-bus: redis error'));
  }

  async start(): Promise<void> {
    // Fire-and-forget connect: ioredis retries forever on its own
    // (the `error` handler already absorbs transient ETIMEDOUTs), so
    // awaiting here would crash the entire workers process whenever
    // Redis is briefly slow at boot. Publishes are buffered until the
    // client reaches `ready`, so callers don't observe the lag.
    this.pub.connect().then(
      () => this.log.info('realtime-bus: connected'),
      (err) =>
        this.log.warn(
          { err: (err as Error).message },
          'realtime-bus: initial connect failed; ioredis will retry',
        ),
    );
  }

  async stop(): Promise<void> {
    await this.pub.quit();
  }

  stats(): { lastHashSize: number; lastHashBytes: number } {
    let bytes = 0;
    for (const [k, v] of this.lastHash) bytes += k.length + v.length;
    return { lastHashSize: this.lastHash.size, lastHashBytes: bytes * 2 };
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

  /**
   * Bypass-dedup variant. Use for channels where the receiver needs a
   * proof-of-life frame on every tick (e.g. the analyst directory's
   * LIVE badge), not just on data change. Skips the hash cache so an
   * unchanged payload still hits the wire.
   */
  publishAlways(channel: WsChannel, id: string, payload: unknown): void {
    const body = JSON.stringify(payload);
    void this.pub.publish(redisKey.wsPub(channel, id), body).catch((err) => {
      this.log.warn({ err: (err as Error).message, channel, id }, 'realtime-bus: publish failed');
    });
  }
}
