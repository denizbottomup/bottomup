import { loadEnv, workersSchema } from '@bottomup/config';
import pino from 'pino';
import type { ConnectionOptions, Worker } from 'bullmq';
import { QUEUE_NAMES, makeWorker } from './queues/index.js';

/**
 * Workers bootstrap. Each processor is a stub for now — MVP lands with
 * registry and lifecycle, real handlers plug in one queue at a time.
 */
async function main(): Promise<void> {
  const env = loadEnv(workersSchema);
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

  log.info({ count: workers.length }, 'workers: started');

  const shutdown = async (signal: string): Promise<void> => {
    log.info({ signal }, 'workers: shutting down');
    await Promise.all(workers.map((w) => w.close()));
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

void main();
