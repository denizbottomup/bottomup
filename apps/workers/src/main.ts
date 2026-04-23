import { loadEnv, workersSchema } from '@bottomup/config';
import pino from 'pino';
import type { ConnectionOptions, Worker } from 'bullmq';
import { z } from 'zod';
import { QUEUE_NAMES, makeWorker } from './queues/index.js';
import { Replicator } from './replicator/replicator.js';
import { RealtimeBus } from './realtime-bus.js';

/**
 * Workers bootstrap. Each processor is a stub for now — MVP lands with
 * registry and lifecycle, real handlers plug in one queue at a time.
 */
const workersEnvSchema = workersSchema.extend({
  // Legacy prod Postgres we replicate FROM (umay.bottomup.app).
  LEGACY_DATABASE_URL: z.string().url().optional(),
  REPLICATOR_INTERVAL_MS: z.coerce.number().int().positive().default(10_000),
});

async function main(): Promise<void> {
  const env = loadEnv(workersEnvSchema);
  const log = pino({ level: env.LOG_LEVEL });
  const connection: ConnectionOptions = { url: env.REDIS_URL };

  const workers: Worker[] = [];

  workers.push(
    makeWorker(
      QUEUE_NAMES.notifications,
      async (job) => {
        log.info({ jobId: job.id, data: job.data }, 'notifications: received (stub)');
        return { ok: true };
      },
      connection,
      env.WORKERS_CONCURRENCY,
    ),
  );

  workers.push(
    makeWorker(
      QUEUE_NAMES.feedNews,
      async (job) => {
        log.info({ jobId: job.id }, 'feed.news: tick (stub)');
        return { ok: true };
      },
      connection,
      1,
    ),
  );

  // ─── Legacy DB replicator ──────────────────────────────────────────
  // Pulls fresh rows from umay.bottomup.app every N ms into Railway
  // Postgres. Skipped if LEGACY_DATABASE_URL is unset (useful in local
  // dev where only the target is reachable).
  let replicator: Replicator | null = null;
  let replicatorInterval: NodeJS.Timeout | null = null;
  let realtime: RealtimeBus | null = null;
  if (env.LEGACY_DATABASE_URL) {
    realtime = new RealtimeBus(env.REDIS_URL, log.child({ component: 'realtime' }));
    await realtime.start();
    replicator = new Replicator({
      sourceUrl: env.LEGACY_DATABASE_URL,
      targetUrl: env.DATABASE_URL,
      log: log.child({ component: 'replicator' }),
      realtime,
    });
    await replicator.start();
    const tick = async (): Promise<void> => {
      try {
        const r = await replicator!.tickAll();
        if (Object.keys(r.synced).length > 0 || Object.keys(r.errors).length > 0) {
          log.info(r, 'replicator: tick');
        }
      } catch (err) {
        log.error({ err }, 'replicator: tick crashed');
      }
    };
    void tick();
    replicatorInterval = setInterval(tick, env.REPLICATOR_INTERVAL_MS);
    log.info({ intervalMs: env.REPLICATOR_INTERVAL_MS }, 'replicator: enabled');
  } else {
    log.info('replicator: disabled (set LEGACY_DATABASE_URL to enable)');
  }

  log.info({ count: workers.length, replicator: !!replicator }, 'workers: started');

  const shutdown = async (signal: string): Promise<void> => {
    log.info({ signal }, 'workers: shutting down');
    if (replicatorInterval) clearInterval(replicatorInterval);
    await Promise.all([
      ...workers.map((w) => w.close()),
      replicator?.stop() ?? Promise.resolve(),
      realtime?.stop() ?? Promise.resolve(),
    ]);
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

void main();
