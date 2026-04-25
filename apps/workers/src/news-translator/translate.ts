import type { Logger } from 'pino';
import type { TranslateLocale } from './locales.js';

export interface TranslationInput {
  title: string | null;
  text: string | null;
}

export interface TranslationOutput {
  title: string | null;
  text: string | null;
}

/**
 * Free Google Translate widget endpoint (the one translate.google.com
 * uses internally). No API key, no signup, but:
 *   - It's not officially supported, so the surface can shift.
 *   - Rate limits are generous for low volume but undocumented; we
 *     space requests out and retry with backoff.
 *   - Quality is fine for marketing-tier news previews. Ticker symbols
 *     and proper nouns (BlackRock, OKX, $BTC) survive in 8 of 9 target
 *     locales tested.
 *
 * If/when this stops working, swap for DeepL Free (eu-tier langs) or
 * Cloud Translation API.
 */
const ENDPOINT = 'https://translate.googleapis.com/translate_a/single';

/** Map our internal locale codes to the codes Google expects. */
function googleCode(code: string): string {
  if (code === 'zh') return 'zh-CN';
  return code;
}

export async function translateArticle(
  locale: TranslateLocale,
  input: TranslationInput,
  log: Logger,
): Promise<TranslationOutput | null> {
  if (!input.title && !input.text) return { title: null, text: null };

  const tl = googleCode(locale.code);

  const [title, text] = await Promise.all([
    input.title ? translateString(input.title, tl, log) : Promise.resolve(null),
    input.text ? translateString(input.text, tl, log) : Promise.resolve(null),
  ]);

  // If the API call failed for a non-null source, surface failure so the
  // job can retry rather than persisting a half-translated row.
  if (input.title && title == null) return null;
  if (input.text && text == null) return null;

  return { title, text };
}

async function translateString(
  text: string,
  tl: string,
  log: Logger,
): Promise<string | null> {
  // Google's free endpoint truncates at ~5K characters per request.
  // News summaries are well under that, but guard just in case.
  const trimmed = text.length > 4500 ? text.slice(0, 4500) : text;
  const url = new URL(ENDPOINT);
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', 'en');
  url.searchParams.set('tl', tl);
  url.searchParams.set('dt', 't');
  url.searchParams.set('q', trimmed);

  let attempt = 0;
  while (attempt < 4) {
    attempt += 1;
    try {
      const res = await fetch(url, {
        // Some POPs return 403 without a browsery UA on this endpoint.
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'application/json,text/plain,*/*',
        },
      });
      if (res.status === 429 || res.status === 503) {
        // Rate-limited / temporarily unavailable. Back off.
        const wait = 1000 * attempt * attempt;
        log.warn({ tl, attempt, status: res.status }, 'translator: rate-limited');
        await sleep(wait);
        continue;
      }
      if (!res.ok) {
        log.warn({ tl, attempt, status: res.status }, 'translator: http error');
        await sleep(500 * attempt);
        continue;
      }
      const json = (await res.json()) as unknown;
      const out = extractTranslation(json);
      if (out == null) {
        log.warn({ tl, attempt }, 'translator: empty response');
        await sleep(500 * attempt);
        continue;
      }
      return out;
    } catch (err) {
      log.warn({ err, tl, attempt }, 'translator: fetch failed');
      await sleep(500 * attempt);
    }
  }
  return null;
}

/**
 * Google's response shape is `[[[<translated>, <orig>, ...], ...], ...]`.
 * One source paragraph can be split across several segments — we
 * concatenate them.
 */
function extractTranslation(raw: unknown): string | null {
  if (!Array.isArray(raw)) return null;
  const segments = raw[0];
  if (!Array.isArray(segments)) return null;
  let out = '';
  for (const seg of segments) {
    if (Array.isArray(seg) && typeof seg[0] === 'string') out += seg[0];
  }
  return out.length > 0 ? out : null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
