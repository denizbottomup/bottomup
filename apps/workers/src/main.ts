import { loadEnv, workersSchema } from '@bottomup/config';
import pino from 'pino';
import { Queue, type ConnectionOptions, type Worker } from 'bullmq';
import { z } from 'zod';
import { Pool } from 'pg';
import { QUEUE_NAMES, makeWorker } from './queues/index.js';
import { Replicator } from './replicator/replicator.js';
import { RealtimeBus } from './realtime-bus.js';
import { BinanceTicker } from './ticker/binance-ticker.js';
import {
  enqueueMissingTranslations,
  makeNewsTranslateProcessor,
  type NewsTranslateJobData,
  type NewsTranslateJobResult,
} from './news-translator/index.js';

/**
 * Workers bootstrap. Each processor is a stub for now — MVP lands with
 * registry and lifecycle, real handlers plug in one queue at a time.
 */
const workersEnvSchema = workersSchema.extend({
  // Legacy prod Postgres we replicate FROM (umay.bottomup.app).
  LEGACY_DATABASE_URL: z.string().url().optional(),
  REPLICATOR_INTERVAL_MS: z.coerce.number().int().positive().default(10_000),
  // News translator runs on Google Translate's free widget endpoint.
  // No API key required. Set to 'false' to disable in CI / local dev.
  NEWS_TRANSLATOR_ENABLED: z
    .string()
    .default('true')
    .transform((v) => v.toLowerCase() !== 'false'),
  NEWS_TRANSLATOR_INTERVAL_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(60_000),
  NEWS_TRANSLATOR_PER_TICK: z.coerce.number().int().positive().default(40),
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

  // ─── News translator ──────────────────────────────────────────────
  // Translates new articles into all 9 non-English locales as soon as
  // they arrive, writing into the `news_text` table. Backed by Google
  // Translate's free widget endpoint — no API key, no signup. Set
  // NEWS_TRANSLATOR_ENABLED=false to disable in CI.
  let newsTranslatorTimer: NodeJS.Timeout | null = null;
  let newsTranslatorPool: Pool | null = null;
  if (env.NEWS_TRANSLATOR_ENABLED) {
    newsTranslatorPool = new Pool({ connectionString: env.DATABASE_URL });
    const queue = new Queue<NewsTranslateJobData, NewsTranslateJobResult>(
      QUEUE_NAMES.newsTranslate,
      { connection },
    );
    workers.push(
      makeWorker<NewsTranslateJobData, NewsTranslateJobResult>(
        QUEUE_NAMES.newsTranslate,
        makeNewsTranslateProcessor({
          pool: newsTranslatorPool,
          log: log.child({ component: 'news-translator' }),
        }),
        connection,
        // 3 concurrent translations keeps us comfortably under the
        // unofficial Google endpoint's rate-limit window.
        3,
      ),
    );

    const enqueueTick = async (): Promise<void> => {
      try {
        const r = await enqueueMissingTranslations({
          pool: newsTranslatorPool!,
          queue,
          log: log.child({ component: 'news-translator' }),
          perTickLimit: env.NEWS_TRANSLATOR_PER_TICK,
        });
        if (r.enqueued > 0) {
          log.info({ enqueued: r.enqueued }, 'news-translator: enqueued');
        }
      } catch (err) {
        log.error({ err }, 'news-translator: tick crashed');
      }
    };
    void enqueueTick();
    newsTranslatorTimer = setInterval(
      enqueueTick,
      env.NEWS_TRANSLATOR_INTERVAL_MS,
    );
    log.info(
      { intervalMs: env.NEWS_TRANSLATOR_INTERVAL_MS },
      'news-translator: enabled',
    );
  } else {
    log.info('news-translator: disabled (NEWS_TRANSLATOR_ENABLED=false)');
  }

  // ─── Legacy DB replicator ──────────────────────────────────────────
  // Pulls fresh rows from umay.bottomup.app every N ms into Railway
  // Postgres. Skipped if LEGACY_DATABASE_URL is unset (useful in local
  // dev where only the target is reachable).
  let replicator: Replicator | null = null;
  let replicatorInterval: NodeJS.Timeout | null = null;
  let realtime: RealtimeBus | null = null;
  let ticker: BinanceTicker | null = null;
  if (env.LEGACY_DATABASE_URL) {
    realtime = new RealtimeBus(env.REDIS_URL, log.child({ component: 'realtime' }));
    await realtime.start();
    ticker = new BinanceTicker(realtime, log.child({ component: 'ticker' }));
    ticker.start();
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
    if (newsTranslatorTimer) clearInterval(newsTranslatorTimer);
    ticker?.stop();
    await Promise.all([
      ...workers.map((w) => w.close()),
      replicator?.stop() ?? Promise.resolve(),
      realtime?.stop() ?? Promise.resolve(),
      newsTranslatorPool?.end() ?? Promise.resolve(),
    ]);
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

void main();
