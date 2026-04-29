import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Live Macro V1.5 — client-side tab-audio capture + server-side
 * transcription + translation.
 *
 * Frontend opens `getDisplayMedia({ audio: true })`, records the
 * shared YouTube tab audio in 8-second chunks, and POSTs each chunk
 * (base64-encoded) to `/me/livecast/audio`. We:
 *   1. POST the chunk to OpenAI Whisper for English transcription.
 *   2. Hand the transcribed text to Claude Haiku with a finance-aware
 *      Turkish-translation system prompt.
 *   3. Return both strings so the frontend can paint a dual-language
 *      transcript pane (original on the left, Türkçe on the right).
 *
 * No yt-dlp / ffmpeg / Dockerfile changes required — the user's own
 * browser captures the audio. Trade-off: per-viewer cost. For one
 * Powell speech with a handful of users this is fine; production
 * scaling moves to server-side capture in V2.
 */
@Injectable()
export class LivecastService {
  private readonly log = new Logger(LivecastService.name);
  private readonly openaiKey: string | null;
  private readonly anthropic: Anthropic | null;

  constructor() {
    this.openaiKey = process.env.OPENAI_API_KEY ?? null;
    if (!this.openaiKey) {
      this.log.warn('OPENAI_API_KEY missing — transcription will fail');
    }
    const anthKey = process.env.ANTHROPIC_API_KEY;
    this.anthropic = anthKey ? new Anthropic({ apiKey: anthKey }) : null;
    if (!this.anthropic) {
      this.log.warn('ANTHROPIC_API_KEY missing — translation will be skipped');
    }
  }

  isReady(): boolean {
    return !!this.openaiKey;
  }

  /**
   * Transcribe an audio chunk via OpenAI Whisper. The buffer is
   * forwarded as `audio/webm` (the MIME the browser produces by
   * default). Whisper auto-detects English on a Powell speech, so
   * we don't pin `language` — keeps the same pipeline reusable for
   * ECB, BoE, BoJ later.
   */
  async transcribe(buf: Buffer, mime = 'audio/webm'): Promise<string> {
    if (!this.openaiKey) throw new Error('OPENAI_API_KEY not configured');
    const ext = mime.includes('mp4') ? 'mp4' : mime.includes('mpeg') ? 'mp3' : 'webm';

    // Native FormData on Node 20+ accepts Blob; we wrap the buffer.
    const fd = new FormData();
    // Cast through ArrayBuffer to avoid the lib.dom `BlobPart` type which
    // isn't in scope for our Node tsconfig — runtime accepts Buffer fine.
    const blob = new Blob(
      [new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)],
      { type: mime },
    );
    fd.append('file', blob, `chunk.${ext}`);
    fd.append('model', 'whisper-1');
    // Lightly-biased decoding for finance vocabulary — keeps "rate cut",
    // "balance sheet", proper-noun "Federal Reserve" intact.
    fd.append(
      'prompt',
      'Federal Reserve, FOMC, rate cut, balance sheet, dot plot, dual mandate, data-dependent.',
    );

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.openaiKey}`,
      },
      body: fd,
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Whisper ${res.status}: ${errText.slice(0, 200)}`);
    }
    const json = (await res.json()) as { text?: string };
    return (json.text ?? '').trim();
  }

  /**
   * Translate a single transcript chunk into the target language with
   * Claude Haiku. The system prompt locks the model into financial-
   * journalism Turkish (or whatever target) — no editorialising, no
   * disclaimers, no English glue words.
   */
  async translate(text: string, targetLang: string): Promise<string> {
    if (!text.trim()) return '';
    if (!this.anthropic) return '';
    const systemPrompt = buildTranslationPrompt(targetLang);
    const res = await this.anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Translate this Federal Reserve speech segment. Output only the translation, nothing else.\n\n---\n${text}\n---`,
        },
      ],
    });
    const block = res.content.find((c) => c.type === 'text');
    return block && block.type === 'text' ? block.text.trim() : '';
  }
}

const TARGET_LANG_NAMES: Record<string, string> = {
  tr: 'Turkish',
  es: 'Spanish (Castilian)',
  pt: 'Portuguese (Brazilian)',
  de: 'German',
  fr: 'French',
  ar: 'Arabic',
  ru: 'Russian',
  'zh-Hans': 'Simplified Chinese',
  ko: 'Korean',
  vi: 'Vietnamese',
  id: 'Indonesian',
};

function buildTranslationPrompt(targetLang: string): string {
  const langName = TARGET_LANG_NAMES[targetLang] ?? 'Turkish';
  return [
    `You are a simultaneous translator working a Federal Reserve / central-bank press conference in real time, rendering English into ${langName}.`,
    '',
    'Output rules:',
    '  • Output the translation ONLY. No quotation marks, no preamble, no editorial.',
    `  • Use ${langName} natural sentence rhythm. Don't transliterate; render meaning.`,
    '  • Keep proper nouns (Federal Reserve, FOMC, Treasury, Powell, Fed) and common',
    '    finance abbreviations (CPI, PCE, PMI, GDP, QT, QE, S&P 500) in English.',
    '  • Match speaker register — Powell speaks plainly, no academic flourish.',
    '  • If the input is a fragment that ends mid-sentence, translate the fragment',
    '    AS-IS (don\'t complete the thought). Streaming context will continue it.',
    '  • If the input is empty / inaudible / non-speech, output an empty string.',
  ].join('\n');
}
