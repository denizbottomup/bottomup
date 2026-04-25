import type { Job, Queue } from 'bullmq';
import type { Logger } from 'pino';
import type { Pool } from 'pg';
import { TARGET_LOCALES, type TranslateLocale } from './locales.js';
import { translateArticle } from './translate.js';
import { randomUUID } from 'node:crypto';

export interface NewsTranslateJobData {
  newsId: string;
  locale: string;
}

export interface NewsTranslateJobResult {
  ok: boolean;
  newsId: string;
  locale: string;
  reason?: string;
}

const LOCALE_BY_CODE = new Map(TARGET_LOCALES.map((l) => [l.code, l]));

/**
 * Build a BullMQ processor that translates a single (news, locale)
 * pair and writes the result into the `news_text` table.
 *
 * The job is idempotent: if a translation already exists for the pair
 * we skip the LLM call entirely.
 */
export function makeNewsTranslateProcessor(opts: {
  pool: Pool;
  log: Logger;
}) {
  const { pool, log } = opts;
  return async (job: Job<NewsTranslateJobData>): Promise<NewsTranslateJobResult> => {
    const { newsId, locale } = job.data;
    const meta = LOCALE_BY_CODE.get(locale);
    if (!meta) {
      return { ok: false, newsId, locale, reason: 'unsupported_locale' };
    }

    const existing = await pool.query(
      'SELECT 1 FROM news_text WHERE news_id = $1::uuid AND language = $2 LIMIT 1',
      [newsId, locale],
    );
    if ((existing.rowCount ?? 0) > 0) {
      return { ok: true, newsId, locale, reason: 'already_translated' };
    }

    const src = await pool.query<{ title: string | null; text: string | null }>(
      'SELECT title, text FROM news WHERE id = $1::uuid AND is_deleted = FALSE LIMIT 1',
      [newsId],
    );
    const row = src.rows[0];
    if (!row) {
      return { ok: false, newsId, locale, reason: 'news_not_found' };
    }
    if (!row.title && !row.text) {
      return { ok: false, newsId, locale, reason: 'empty_source' };
    }

    const out = await translateArticle(
      meta as TranslateLocale,
      { title: row.title, text: row.text },
      log,
    );
    if (!out) {
      return { ok: false, newsId, locale, reason: 'translate_failed' };
    }

    await pool.query(
      `INSERT INTO news_text (id, news_id, language, title, text)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5)
       ON CONFLICT (news_id, language) DO NOTHING`,
      [randomUUID(), newsId, locale, out.title, out.text],
    );

    return { ok: true, newsId, locale };
  };
}

/**
 * Find news articles missing translations and enqueue jobs. Runs on a
 * timer from main.ts. Window is the last 14 days — older articles
 * aren't worth back-filling.
 */
export async function enqueueMissingTranslations(opts: {
  pool: Pool;
  queue: Queue<NewsTranslateJobData, NewsTranslateJobResult>;
  log: Logger;
  /** Cap per tick so we don't blow translation provider rate limits. */
  perTickLimit?: number;
}): Promise<{ enqueued: number }> {
  const { pool, queue, log, perTickLimit = 60 } = opts;

  const codes = TARGET_LOCALES.map((l) => l.code);
  const result = await pool.query<{ id: string; language: string }>(
    `WITH recent AS (
       SELECT id
         FROM news
        WHERE is_deleted = FALSE
          AND date >= NOW() - INTERVAL '14 days'
          AND (title IS NOT NULL OR text IS NOT NULL)
        ORDER BY date DESC NULLS LAST
        LIMIT 200
     ),
     wanted AS (
       SELECT r.id, l.lang AS language
         FROM recent r
         CROSS JOIN unnest($1::text[]) AS l(lang)
     )
     SELECT w.id::text AS id, w.language
       FROM wanted w
       LEFT JOIN news_text nt
              ON nt.news_id = w.id AND nt.language = w.language
      WHERE nt.news_id IS NULL
      LIMIT $2`,
    [codes, perTickLimit],
  );

  let enqueued = 0;
  for (const row of result.rows) {
    const jobId = `${row.id}:${row.language}`;
    try {
      await queue.add(
        'translate',
        { newsId: row.id, locale: row.language },
        {
          jobId,
          attempts: 3,
          removeOnComplete: { count: 200 },
          removeOnFail: { count: 200 },
          backoff: { type: 'exponential', delay: 5000 },
        },
      );
      enqueued += 1;
    } catch (err) {
      log.warn({ err, jobId }, 'news-translator: enqueue failed');
    }
  }
  return { enqueued };
}
