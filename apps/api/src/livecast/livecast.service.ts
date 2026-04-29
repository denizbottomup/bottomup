import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

export interface LiveSearchHit {
  /** YouTube video id — used to build the embed URL. */
  video_id: string;
  /** YouTube embed src (caller-friendly, ready for iframe). */
  embed_url: string;
  title: string;
  channel: string;
  channel_url: string | null;
  thumbnail: string | null;
  /** Currently live broadcast — main filter target. */
  is_live: boolean;
  /** Approximate concurrent viewers, when YouTube exposes it. */
  viewers: number | null;
  /** ISO date the broadcast started (or scheduled), if known. */
  started_at: string | null;
}

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

  /**
   * Search YouTube for live broadcasts matching `q`. Two paths:
   *
   *   • If YOUTUBE_API_KEY is set, use the official Data API v3
   *     (`search.list?eventType=live`) which returns currently-live
   *     videos in real time and is the canonical answer.
   *   • Otherwise we fall back to a curated set of finance-relevant
   *     YouTube channels and resolve their "is currently live?" state
   *     via the no-key oEmbed endpoint. This keeps the search surface
   *     useful even when the API key isn't set yet — the user types a
   *     query, we filter the curated list by name match, and surface
   *     whichever channels are live right now.
   */
  async searchLive(q: string, maxResults = 12): Promise<LiveSearchHit[]> {
    const ytKey = process.env.YOUTUBE_API_KEY;
    if (ytKey) {
      try {
        return await this.searchLiveYouTubeApi(q, ytKey, maxResults);
      } catch (e) {
        this.log.warn(
          `YouTube Data API search failed, falling back to curated: ${(e as Error).message}`,
        );
      }
    }
    return this.curatedFallback(q);
  }

  private async searchLiveYouTubeApi(
    q: string,
    ytKey: string,
    maxResults: number,
  ): Promise<LiveSearchHit[]> {
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('eventType', 'live');
    url.searchParams.set('type', 'video');
    url.searchParams.set('maxResults', String(Math.min(50, maxResults)));
    url.searchParams.set('q', q);
    url.searchParams.set('key', ytKey);
    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`YT search ${res.status}: ${errText.slice(0, 200)}`);
    }
    const json = (await res.json()) as {
      items?: Array<{
        id?: { videoId?: string };
        snippet?: {
          title?: string;
          channelTitle?: string;
          channelId?: string;
          thumbnails?: { medium?: { url?: string }; high?: { url?: string } };
          publishedAt?: string;
        };
      }>;
    };
    const items = (json.items ?? [])
      .map((it) => {
        const id = it.id?.videoId;
        if (!id) return null;
        const sn = it.snippet ?? {};
        const thumb =
          sn.thumbnails?.high?.url ?? sn.thumbnails?.medium?.url ?? null;
        return {
          video_id: id,
          embed_url: `https://www.youtube.com/embed/${id}`,
          title: sn.title ?? '',
          channel: sn.channelTitle ?? '',
          channel_url: sn.channelId
            ? `https://www.youtube.com/channel/${sn.channelId}`
            : null,
          thumbnail: thumb,
          is_live: true,
          viewers: null,
          started_at: sn.publishedAt ?? null,
        } as LiveSearchHit;
      })
      .filter((x): x is LiveSearchHit => x != null);
    return items;
  }

  /**
   * Search-less fallback. Mostly useful as a "currently live finance
   * stations" board until YT_API_KEY is provisioned.
   */
  private async curatedFallback(q: string): Promise<LiveSearchHit[]> {
    const norm = q.toLowerCase().trim();
    const matched = norm
      ? CURATED_LIVE_CHANNELS.filter((c) =>
          [c.title, c.channel, ...(c.tags ?? [])]
            .some((s) => s.toLowerCase().includes(norm)),
        )
      : CURATED_LIVE_CHANNELS;
    const probed = await Promise.all(
      matched.map(async (c) => {
        const liveId = await probeChannelLive(c.channelId).catch(() => null);
        return {
          video_id: liveId ?? '',
          embed_url: liveId
            ? `https://www.youtube.com/embed/${liveId}`
            : `https://www.youtube.com/embed/live_stream?channel=${c.channelId}`,
          title: c.title,
          channel: c.channel,
          channel_url: `https://www.youtube.com/channel/${c.channelId}`,
          thumbnail: c.thumbnail ?? null,
          is_live: !!liveId,
          viewers: null,
          started_at: null,
        } satisfies LiveSearchHit;
      }),
    );
    // Live ones first, then upcoming/idle channels.
    return probed.sort((a, b) => Number(b.is_live) - Number(a.is_live));
  }
}

interface CuratedChannel {
  channelId: string;
  channel: string;
  title: string;
  thumbnail?: string;
  tags?: string[];
}

const CURATED_LIVE_CHANNELS: CuratedChannel[] = [
  {
    channelId: 'UCKc0c5DwIKjxN-AjYQwM6QQ',
    channel: 'Federal Reserve',
    title: 'Federal Reserve · live press conferences & FOMC',
    tags: ['fomc', 'powell', 'fed', 'usa', 'usd', 'rate'],
  },
  {
    channelId: 'UC7-tovHOMnYJp10IaTAa9Cg',
    channel: 'European Central Bank',
    title: 'ECB · Lagarde, monetary policy',
    tags: ['ecb', 'lagarde', 'eur', 'eurozone'],
  },
  {
    channelId: 'UCIALMKvObZNtJ6AmdCLP7Lg',
    channel: 'Bloomberg Television',
    title: 'Bloomberg TV · 24/7 financial news',
    tags: ['bloomberg', 'markets', 'news', 'finance'],
  },
  {
    channelId: 'UCvJJ_dzjViJCoLf5uKUTwoA',
    channel: 'CNBC',
    title: 'CNBC · 24/7 markets, economy',
    tags: ['cnbc', 'markets', 'economy', 'wall street'],
  },
  {
    channelId: 'UCnIaPiy0NZpUKD4VpabWNQg',
    channel: 'Yahoo Finance',
    title: 'Yahoo Finance · live trading day',
    tags: ['yahoo', 'finance', 'trading'],
  },
  {
    channelId: 'UChqUTb7kYRX8-EiaN3XFrSQ',
    channel: 'Reuters',
    title: 'Reuters · breaking news + live coverage',
    tags: ['reuters', 'news', 'live'],
  },
];

/**
 * YouTube exposes a small public metadata endpoint that returns the
 * current live video ID for a channel handle/ID without requiring
 * an API key. We hit it via the no-key oEmbed style URL — if a
 * channel isn't live, the request 4xxs and we report no live video.
 */
async function probeChannelLive(channelId: string): Promise<string | null> {
  try {
    // The public live_stream channel embed redirects to the video URL
    // when the channel is currently live. We follow redirects with HEAD
    // and parse the resulting `v=` param.
    const res = await fetch(
      `https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(channelId)}`,
      {
        redirect: 'manual',
        signal: AbortSignal.timeout(4000),
      },
    );
    const loc = res.headers.get('location');
    if (loc) {
      const m = /[?&]v=([A-Za-z0-9_-]{11})/.exec(loc);
      if (m) return m[1] ?? null;
    }
    // Fallback: hit the channel "live" page and look for a video id.
    const page = await fetch(
      `https://www.youtube.com/channel/${encodeURIComponent(channelId)}/live`,
      {
        signal: AbortSignal.timeout(4000),
        headers: {
          accept: 'text/html',
          'user-agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
      },
    );
    if (!page.ok) return null;
    const html = await page.text();
    const m = /"videoId":"([A-Za-z0-9_-]{11})"/.exec(html);
    return m ? (m[1] ?? null) : null;
  } catch {
    return null;
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
