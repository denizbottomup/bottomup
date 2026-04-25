import type Anthropic from '@anthropic-ai/sdk';
import type { Logger } from 'pino';
import { TRANSLATE_MODEL } from './anthropic-client.js';
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
 * Translate a single news article (title + summary) into a target
 * locale. Returns nulls for fields that were null in the source.
 *
 * Prompting rules:
 *   - Preserve ticker symbols ($BTC, $ETH, $BUP), proper nouns
 *     (BlackRock, OKX, Binance, BottomUP, Foxy AI), numbers, and units
 *     verbatim.
 *   - Use natural, idiomatic phrasing for the target language —
 *     translate the *meaning*, not word-for-word.
 *   - Never add commentary or markdown; emit pure JSON.
 */
export async function translateArticle(
  client: Anthropic,
  locale: TranslateLocale,
  input: TranslationInput,
  log: Logger,
): Promise<TranslationOutput | null> {
  if (!input.title && !input.text) return { title: null, text: null };

  const prompt = `You translate crypto news from English into ${locale.nativeName}.

Rules:
- Output ONLY a single JSON object: {"title": "...", "text": "..."}.
- If a field is null in the input, output null for it (no quotes).
- Never wrap your response in markdown fences.
- Translate the meaning into natural, idiomatic ${locale.nativeName}.
- Preserve verbatim: ticker symbols ($BTC, $ETH, $BUP, etc.), all numbers and percentages, proper nouns (company / project / person / exchange names like BlackRock, OKX, Binance, Coinbase, BottomUP, Foxy AI), and URLs.
- Do not soften, summarise, or add disclaimers.

Input:
${JSON.stringify({ title: input.title, text: input.text })}`;

  const max_tokens = 1024;
  let attempt = 0;
  while (attempt < 3) {
    attempt += 1;
    try {
      const res = await client.messages.create({
        model: TRANSLATE_MODEL,
        max_tokens,
        temperature: 0,
        messages: [{ role: 'user', content: prompt }],
      });
      const text = res.content
        .filter((c): c is Anthropic.TextBlock => c.type === 'text')
        .map((c) => c.text)
        .join('')
        .trim();
      const parsed = parseJsonObject(text);
      if (!parsed) {
        log.warn(
          { locale: locale.code, attempt, raw: text.slice(0, 200) },
          'translator: bad JSON, retrying',
        );
        continue;
      }
      return {
        title: typeof parsed.title === 'string' ? parsed.title : null,
        text: typeof parsed.text === 'string' ? parsed.text : null,
      };
    } catch (err) {
      log.warn({ err, locale: locale.code, attempt }, 'translator: call failed');
      // Exponential-ish backoff to ride out rate limits.
      await sleep(500 * attempt);
    }
  }
  return null;
}

function parseJsonObject(raw: string): { title?: unknown; text?: unknown } | null {
  // Strip ```json ... ``` fences if the model adds them.
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  }
  // Best-effort: pull the first {...} object out of the response.
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as { title?: unknown; text?: unknown };
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
