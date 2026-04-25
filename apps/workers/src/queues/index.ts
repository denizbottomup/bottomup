import { Queue, QueueEvents, Worker } from 'bullmq';
import type { ConnectionOptions, Processor } from 'bullmq';

/**
 * Queue registry. Each queue is a named background job lane backed by Redis.
 *
 * MVP lanes:
 *   - notifications      → FCM push (replaces notification-service)
 *   - feed.news          → periodic news fetch (replaces feed-data-fetcher/extract_news)
 *   - feed.calendar      → periodic calendar fetch
 *   - setup.checker      → OKX ticker → setup TP/SL/entry evaluation (replaces checker/)
 *   - exchange.okx       → OKX WS consumer (replaces okx-ws-node)
 *   - exchange.bybit     → Bybit WS consumer (replaces bottomup-web-socket)
 *
 * This file only defines queue names. Processors are wired in `main.ts`.
 */
export const QUEUE_NAMES = {
  notifications: 'notifications',
  feedNews: 'feed.news',
  feedCalendar: 'feed.calendar',
  setupChecker: 'setup.checker',
  exchangeOkx: 'exchange.okx',
  exchangeBybit: 'exchange.bybit',
  newsTranslate: 'news.translate',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export function makeQueue(name: QueueName, connection: ConnectionOptions): Queue {
  return new Queue(name, { connection });
}

export function makeWorker<Data, Result>(
  name: QueueName,
  processor: Processor<Data, Result>,
  connection: ConnectionOptions,
  concurrency = 5,
): Worker<Data, Result> {
  return new Worker<Data, Result>(name, processor, { connection, concurrency });
}

export function makeQueueEvents(name: QueueName, connection: ConnectionOptions): QueueEvents {
  return new QueueEvents(name, { connection });
}
