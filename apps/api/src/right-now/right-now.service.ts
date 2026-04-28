import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { fetchKlines, type Tf } from './klines.js';
import { analyzePriceAction, type PriceActionRead } from './price-action.js';
import { computeSignal, type SignalKind, type TfSignal } from './signal-engine.js';
import { FoxyService } from '../foxy/foxy.service.js';

/**
 * Right Now — anlık AI yön sinyali. BTC + ETH için 5m / 15m / 1h
 * timeframe'lerinde deterministic bir confluence engine + AI prose
 * overlay üretir.
 *
 * Mimari:
 *   - `setInterval` her 60 saniyede bir tüm coin × TF kombosu için
 *     fresh kline çeker, derivatives + whale snapshot'ını da
 *     paralel olarak alır, signal-engine deterministic skoru üretir.
 *   - AI overlay (Claude Sonnet) her 5 dakikada bir aynı snapshot'tan
 *     Türkçe headline + invalidation cümlesi üretir. Bu sıklık,
 *     maliyeti ~$100/ay'da tutar.
 *   - Sonuç tek bir module-level cache'de tutulur ve `GET /me/right-now`
 *     bunu okur — yani kullanıcı kaç kez basarsa bassın upstream
 *     trafiği yok.
 */

const COINS = ['BTC', 'ETH'] as const;
const TFS: Tf[] = ['5m', '15m', '1h'];

const COMPUTE_INTERVAL_MS = 60_000; // 1 dk
const AI_OVERLAY_INTERVAL_MS = 5 * 60_000; // 5 dk

export interface RightNowTfBlock extends TfSignal {
  /** Last close used in this read. */
  last: number;
  /** Lightweight digest of the price-action read for the UI. */
  pa: {
    trend: PriceActionRead['trend'];
    structure: PriceActionRead['structure'];
    ema_aligned: PriceActionRead['ema_aligned'];
    rsi14: number | null;
  };
}

export interface RightNowAi {
  /** Tek cümle: BTC overall yön + tactical hint. */
  headline: string;
  /** "X seviyesi kırılırsa tez bozulur" tarzı tek cümle. */
  invalidation: string;
  /** Hangi snapshot timestamp'inden üretildi (ISO). */
  generated_at: string;
}

export interface RightNowAsset {
  coin: string;
  tf_5m: RightNowTfBlock | null;
  tf_15m: RightNowTfBlock | null;
  tf_1h: RightNowTfBlock | null;
  /** Combined direction across the three TFs. Used as the headline call. */
  combined: SignalKind;
  /** Combined confidence 0..1. */
  combined_confidence: number;
  /** AI-generated prose overlay; null until first AI tick lands. */
  ai: RightNowAi | null;
}

export interface RightNowPayload {
  assets: RightNowAsset[];
  /** ISO of the latest deterministic compute. */
  computed_at: string;
  /** ISO of the latest AI overlay (or null if AI never ran). */
  ai_at: string | null;
}

interface CacheEntry {
  /** Signal-only payload (deterministic), refreshed every 60s. */
  raw: Map<string, Omit<RightNowAsset, 'ai'>>;
  ai: Map<string, RightNowAi>;
  computed_at: number;
  ai_at: number | null;
}

@Injectable()
export class RightNowService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(RightNowService.name);
  private readonly client: Anthropic | null;

  private cache: CacheEntry = {
    raw: new Map(),
    ai: new Map(),
    computed_at: 0,
    ai_at: null,
  };

  private computeTimer: NodeJS.Timeout | null = null;
  private aiTimer: NodeJS.Timeout | null = null;
  private computing = false;
  private aiInflight = false;

  constructor(private readonly foxy: FoxyService) {
    const key = process.env.ANTHROPIC_API_KEY;
    this.client = key ? new Anthropic({ apiKey: key }) : null;
    if (!this.client) {
      this.log.warn('ANTHROPIC_API_KEY missing — Right Now will skip AI overlay');
    }
  }

  async onModuleInit(): Promise<void> {
    // Kick off an initial deterministic pass at boot so the first
    // viewer doesn't have to wait 60s for a cold cache.
    void this.runCompute();
    this.computeTimer = setInterval(() => void this.runCompute(), COMPUTE_INTERVAL_MS);
    if (this.client) {
      // First AI overlay 30s after boot so deterministic data exists.
      setTimeout(() => void this.runAiOverlay(), 30_000);
      this.aiTimer = setInterval(() => void this.runAiOverlay(), AI_OVERLAY_INTERVAL_MS);
    }
  }

  onModuleDestroy(): void {
    if (this.computeTimer) clearInterval(this.computeTimer);
    if (this.aiTimer) clearInterval(this.aiTimer);
  }

  /**
   * Public read — what `GET /me/right-now` returns.
   */
  snapshot(): RightNowPayload {
    const assets: RightNowAsset[] = COINS.map((coin) => {
      const raw = this.cache.raw.get(coin);
      const ai = this.cache.ai.get(coin) ?? null;
      if (!raw) {
        return {
          coin,
          tf_5m: null,
          tf_15m: null,
          tf_1h: null,
          combined: 'wait' as SignalKind,
          combined_confidence: 0,
          ai,
        };
      }
      return { ...raw, ai };
    });
    return {
      assets,
      computed_at: new Date(this.cache.computed_at || Date.now()).toISOString(),
      ai_at: this.cache.ai_at ? new Date(this.cache.ai_at).toISOString() : null,
    };
  }

  // -------------------------------------------------------------- compute

  private async runCompute(): Promise<void> {
    if (this.computing) return; // guard against overlap on slow ticks
    this.computing = true;
    try {
      const results = await Promise.all(
        COINS.map(async (coin) => {
          try {
            const asset = await this.computeAsset(coin);
            return { coin, asset };
          } catch (e) {
            this.log.error(`compute ${coin} failed: ${(e as Error).message}`);
            return null;
          }
        }),
      );
      for (const r of results) {
        if (r) this.cache.raw.set(r.coin, r.asset);
      }
      this.cache.computed_at = Date.now();
    } finally {
      this.computing = false;
    }
  }

  private async computeAsset(coin: string): Promise<Omit<RightNowAsset, 'ai'>> {
    const symbol = `${coin}USDT`;

    // Klines for 3 TFs in parallel, plus deriv + whales for the TF-blind side.
    const [k5, k15, k1h, derivatives, whales] = await Promise.all([
      fetchKlines(symbol, '5m', 200),
      fetchKlines(symbol, '15m', 200),
      fetchKlines(symbol, '1h', 200),
      this.foxy.derivativesByCoin(coin).catch(() => null),
      this.foxy.whalesByCoin(coin, { hours: 4 }).catch(() => null),
    ]);

    const tf5 = this.buildBlock(k5, '5m', derivatives, whales);
    const tf15 = this.buildBlock(k15, '15m', derivatives, whales);
    const tf1h = this.buildBlock(k1h, '1h', derivatives, whales);

    // Combined direction: 1h gets 50% weight, 15m 30%, 5m 20%.
    const score =
      directionToNum(tf1h.signal) * tf1h.confidence * 0.5 +
      directionToNum(tf15.signal) * tf15.confidence * 0.3 +
      directionToNum(tf5.signal) * tf5.confidence * 0.2;
    const combined: SignalKind =
      score > 0.15 ? 'long' : score < -0.15 ? 'short' : 'wait';
    const combined_confidence = Math.min(1, Math.abs(score));

    return {
      coin,
      tf_5m: tf5,
      tf_15m: tf15,
      tf_1h: tf1h,
      combined,
      combined_confidence: round(combined_confidence, 2),
    };
  }

  private buildBlock(
    klines: Awaited<ReturnType<typeof fetchKlines>>,
    tf: Tf,
    derivatives: Awaited<ReturnType<FoxyService['derivativesByCoin']>> | null,
    whales: Awaited<ReturnType<FoxyService['whalesByCoin']>> | null,
  ): RightNowTfBlock {
    const pa = analyzePriceAction(klines);
    const sig = computeSignal({ pa, derivatives, whales, tf });
    return {
      ...sig,
      last: pa.last,
      pa: {
        trend: pa.trend,
        structure: pa.structure,
        ema_aligned: pa.ema_aligned,
        rsi14: pa.rsi14,
      },
    };
  }

  // -------------------------------------------------------------- AI overlay

  private async runAiOverlay(): Promise<void> {
    if (!this.client || this.aiInflight) return;
    if (this.cache.raw.size === 0) return; // nothing to narrate yet
    this.aiInflight = true;
    try {
      // Build a compact context: only the fields the model needs.
      const context = COINS.map((coin) => {
        const raw = this.cache.raw.get(coin);
        if (!raw) return null;
        // Skip if any TF still null — partial computes happen mid-boot
        // and we don't want the model narrating an incomplete read.
        if (!raw.tf_5m || !raw.tf_15m || !raw.tf_1h) return null;
        return {
          coin,
          combined: raw.combined,
          combined_confidence: raw.combined_confidence,
          tfs: {
            '5m': digestForAi(raw.tf_5m),
            '15m': digestForAi(raw.tf_15m),
            '1h': digestForAi(raw.tf_1h),
          },
        };
      }).filter((x): x is NonNullable<typeof x> => x != null);
      if (context.length === 0) return;

      const res = await this.client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 600,
        system: AI_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              'Aşağıdaki sinyal snapshot\'ını oku ve her coin için tek',
              'cümlelik headline + tek cümlelik invalidation üret.',
              '',
              'Format JSON, başka şey yazma:',
              '{',
              '  "BTC": { "headline": "...", "invalidation": "..." },',
              '  "ETH": { "headline": "...", "invalidation": "..." }',
              '}',
              '',
              'Snapshot:',
              JSON.stringify(context, null, 2),
            ].join('\n'),
          },
        ],
      });

      const block = res.content.find((c) => c.type === 'text');
      const text = block && block.type === 'text' ? block.text : '';
      const parsed = parseAiJson(text);
      if (!parsed) {
        this.log.warn('AI overlay parse failed; keeping previous overlay');
        return;
      }
      const now = Date.now();
      for (const coin of COINS) {
        const v = parsed[coin];
        if (v) {
          this.cache.ai.set(coin, {
            headline: v.headline,
            invalidation: v.invalidation,
            generated_at: new Date(now).toISOString(),
          });
        }
      }
      this.cache.ai_at = now;
    } catch (e) {
      this.log.error(`AI overlay failed: ${(e as Error).message}`);
    } finally {
      this.aiInflight = false;
    }
  }
}

function directionToNum(s: SignalKind): number {
  return s === 'long' ? 1 : s === 'short' ? -1 : 0;
}

function digestForAi(tf: RightNowTfBlock): {
  signal: SignalKind;
  confidence: number;
  last: number;
  rsi: number | null;
  trend: string;
  structure: string;
  factors: string[];
  key_levels: TfSignal['key_levels'];
} {
  return {
    signal: tf.signal,
    confidence: tf.confidence,
    last: tf.last,
    rsi: tf.pa.rsi14,
    trend: tf.pa.trend,
    structure: tf.pa.structure,
    factors: tf.factors.map(
      (f) => `${f.weight > 0 ? '+' : ''}${f.weight} ${f.label}`,
    ),
    key_levels: tf.key_levels,
  };
}

function parseAiJson(
  text: string,
): Record<string, { headline: string; invalidation: string }> | null {
  // Tolerate code-fence wrappers and leading prose.
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const obj = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    const out: Record<string, { headline: string; invalidation: string }> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (
        v &&
        typeof v === 'object' &&
        typeof (v as { headline?: unknown }).headline === 'string' &&
        typeof (v as { invalidation?: unknown }).invalidation === 'string'
      ) {
        out[k.toUpperCase()] = {
          headline: String((v as { headline: string }).headline),
          invalidation: String((v as { invalidation: string }).invalidation),
        };
      }
    }
    return out;
  } catch {
    return null;
  }
}

function round(x: number, dp: number): number {
  const p = Math.pow(10, dp);
  return Math.round(x * p) / p;
}

const AI_SYSTEM_PROMPT = [
  'Sen Right Now — bottomUP\'ın anlık yön motoru. Bir desk analistisin.',
  'Sana 3 TF\'lik (5m/15m/1h) deterministic confluence skoru ve',
  'kombine yön verilir. Senin işin bunu trader\'a tek cümlelik',
  'aksiyonlanabilir bir görüş + tek cümlelik invalidation\'a çevirmek.',
  '',
  'Kurallar:',
  '  - Türkçe, profesyonel masa dili. Markdown YOK.',
  '  - Headline 1 cümle, max 18 kelime. Yön + neden + zaman dilimi.',
  '    İYİ: "BTC 1h\'de bos_up + funding ılımlı; 5m\'de minor pullback,',
  '    62300 üzeri tutarsa scalp long bias." (uzun ama ok, 18 kelime).',
  '    KÖTÜ: "BTC long sinyali var" (boş, neden yok).',
  '  - Invalidation 1 cümle, spesifik fiyat seviyesi şart. "X altında',
  '     kapanış tezi siler" formatında.',
  '  - Sayıları kullan (price, RSI, factor weight\'leri).',
  '  - "Şahsen ben olsam", "kesin", "garanti" YASAK.',
  '  - JSON dışında bir şey yazma — kod-fence bile.',
].join('\n');
