import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { fetchKlines, type Tf } from './klines.js';
import { analyzePriceAction, type PriceActionRead } from './price-action.js';
import {
  classifyOiPriceRegime,
  computeSignal,
  type OiPriceRegime,
  type SignalKind,
  type TfSignal,
} from './signal-engine.js';
import {
  approximateLiqClusters,
  computeVwap,
  fetchBasis,
  fetchCrossAsset,
  fetchEtfFlow,
  fetchFundingVelocity,
  fetchMacro,
  type BasisRead,
  type CoverageRead,
  type CrossAssetRead,
  type EtfFlowRead,
  type FundingVelocityRead,
  type LiqClusterRead,
  type MacroRead,
  type SourceName,
  type VwapRead,
} from './market-context.js';
import { FoxyService, type FoxyPositioning } from '../foxy/foxy.service.js';
import { PushService } from './push.service.js';

/**
 * Right Now V2 — anlık AI yön sinyali.
 *
 * Kapsam:
 *   - 5 TF: 5m / 15m / 1h / 4h / 1d (scalp + swing aynı ekranda)
 *   - Price action: BOS/CHOCH, OB, FVG, EMA stack, RSI, ATR
 *   - Derivatives: OI, funding, L/S, liquidations
 *   - Whale flow (Arkham CEX in/out)
 *   - Smart vs retail positioning (top trader vs global account ratio)
 *   - OI ↔ Price 4-quadrant regime (24h)
 *   - Spot/perp basis (leverage-driven mu, spot-driven mi)
 *   - Funding velocity (3 günlük slope)
 *   - Liquidation cluster levels (kline range proxy)
 *   - ETF günlük net flow (Farside)
 *   - Macro: DXY + ES futures + risk regime
 *   - Sinyal flip tracker (5m short→long X dk önce)
 *   - Source coverage indicator (hangi besleme canlı / down)
 *
 * AI mimarisi iki katmanlı:
 *   - big_picture (15 dk'da bir): yapısal + makro yorum, 2 cümle
 *   - tactical_now (5 dk'da bir):  anlık aksiyon + invalidation, 2 cümle
 *   - 60 saniyede deterministic compute, AI dokunmuyor — direction
 *     ve confidence saniye düzeyinde fresh kalır.
 */

// Phase-1 Right Now ships with BTC + ETH only. SOL/BNB/XRP were
// briefly enabled in V2.5 but rolled back in V2.6 — the cognitive
// load on a 5-coin landing page outweighed the value while UX still
// being tuned. Add back as `RIGHT_NOW_COINS` once the per-asset
// surface is compact enough to scale.
const COINS = ['BTC', 'ETH'] as const;
/** ETF flow only published for the two US-listed spot ETF assets. */
const ETF_COINS = new Set(['BTC', 'ETH']);
const TFS_DEEP: Tf[] = ['5m', '15m', '1h', '4h', '1d'];

const COMPUTE_INTERVAL_MS = 60_000; // 1 dk
const TACTICAL_AI_INTERVAL_MS = 5 * 60_000; // 5 dk
const BIG_PICTURE_AI_INTERVAL_MS = 15 * 60_000; // 15 dk

// Slow context fetchers don't need 60s polling — refresh on a slower
// cadence and reuse the cached snapshot in between to stay under
// upstream rate limits.
const ETF_REFRESH_MS = 30 * 60_000; // 30 dk
const MACRO_REFRESH_MS = 5 * 60_000; // 5 dk

const FLIP_HISTORY_DEPTH = 8; // last N flips kept per asset+TF

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

export interface SignalFlip {
  /** Per-TF flips use the TF tag (5m/15m/1h/4h/1d). The combined-direction
   *  flip uses the literal 'combined' so the UI can highlight it specially
   *  (flash banner, tab title flicker, audio ping) — far more important
   *  to the trader than a single-TF blip. */
  tf: Tf | 'combined';
  from: SignalKind;
  to: SignalKind;
  /** ISO of when the flip was detected. */
  at: string;
}

export interface RightNowAi {
  /** 1-2 cümle yapısal + makro yorum. 15 dk'da bir refresh. */
  big_picture: string;
  /** Anlık aksiyon cümlesi. 5 dk'da bir refresh. */
  tactical_now: string;
  /** Spesifik fiyat seviyesi + koşul. 5 dk'da bir refresh. */
  invalidation: string;
  /** Üretildi (ISO). */
  generated_at: string;
}

export interface RightNowAsset {
  coin: string;
  tf_5m: RightNowTfBlock | null;
  tf_15m: RightNowTfBlock | null;
  tf_1h: RightNowTfBlock | null;
  tf_4h: RightNowTfBlock | null;
  tf_1d: RightNowTfBlock | null;
  /** Combined direction across all 5 TFs, weighted: 5m 8% / 15m 17% /
   *  1h 25% / 4h 30% / 1d 20%. */
  combined: SignalKind;
  combined_confidence: number;
  positioning: FoxyPositioning | null;
  regime: OiPriceRegime;
  oi_change_24h_pct: number | null;
  price_change_24h_pct: number | null;
  basis: BasisRead | null;
  funding_velocity: FundingVelocityRead | null;
  liq_clusters: LiqClusterRead;
  etf: EtfFlowRead | null;
  /** Volume-weighted average price (1h × 24 lookback) — institutional anchor. */
  vwap: VwapRead | null;
  /** Recent direction flips per TF (newest first). */
  flips: SignalFlip[];
  /**
   * Most recent *combined-direction* flip across all TFs, populated only
   * if it happened within the last 10 minutes. The UI uses this to drive
   * a flash banner + tab title flicker + audio ping. `null` outside that
   * window so the banner self-dismisses instead of staying pinned.
   */
  combined_flip: SignalFlip | null;
  ai: RightNowAi | null;
}

export interface RightNowPayload {
  assets: RightNowAsset[];
  /** Macro context is shared across assets. */
  macro: MacroRead | null;
  /** Cross-asset rotation read — also shared across all coin cards. */
  cross_asset: CrossAssetRead | null;
  /** Per-source coverage so the UI can show which feeds are live. */
  coverage: CoverageRead[];
  computed_at: string;
  ai_at: string | null;
}

interface CacheEntry {
  raw: Map<string, Omit<RightNowAsset, 'ai'>>;
  ai: Map<string, RightNowAi>;
  macro: MacroRead | null;
  crossAsset: CrossAssetRead | null;
  /** Per-source last-success timestamps (ms). 0 means never. */
  lastOk: Map<SourceName, number>;
  lastFail: Map<SourceName, number>;
  /** Per asset+TF rolling flip log. */
  flipHistory: Map<string, SignalFlip[]>;
  /** Memo of the previous tick's signal per asset+TF — used for
   *  flip detection. */
  prevSignals: Map<string, SignalKind>;
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
    macro: null,
    crossAsset: null,
    lastOk: new Map(),
    lastFail: new Map(),
    flipHistory: new Map(),
    prevSignals: new Map(),
    computed_at: 0,
    ai_at: null,
  };

  private computeTimer: NodeJS.Timeout | null = null;
  private tacticalTimer: NodeJS.Timeout | null = null;
  private bigPictureTimer: NodeJS.Timeout | null = null;
  private macroTimer: NodeJS.Timeout | null = null;
  private etfTimer: NodeJS.Timeout | null = null;
  private computing = false;
  private tacticalInflight = false;
  private bigPictureInflight = false;

  // Slow-cadence cached values reused across compute ticks.
  private cachedEtf: Map<string, EtfFlowRead | null> = new Map();

  constructor(
    private readonly foxy: FoxyService,
    private readonly push: PushService,
  ) {
    const key = process.env.ANTHROPIC_API_KEY;
    this.client = key ? new Anthropic({ apiKey: key }) : null;
    if (!this.client) {
      this.log.warn('ANTHROPIC_API_KEY missing — Right Now will skip AI overlays');
    }
  }

  async onModuleInit(): Promise<void> {
    // Slow-cadence sources first so the first compute has them populated.
    void this.refreshMacro();
    void this.refreshEtf();
    void this.refreshCrossAsset();
    this.macroTimer = setInterval(() => void this.refreshMacro(), MACRO_REFRESH_MS);
    this.etfTimer = setInterval(() => void this.refreshEtf(), ETF_REFRESH_MS);
    // CoinGecko global is rate-limited (50/min free tier) — 5dk cadence
    // is well under the cap and BTC.D doesn't move fast enough to need
    // anything tighter.
    setInterval(() => void this.refreshCrossAsset(), MACRO_REFRESH_MS);

    void this.runCompute();
    this.computeTimer = setInterval(() => void this.runCompute(), COMPUTE_INTERVAL_MS);

    if (this.client) {
      // Stagger the two AI overlays so they don't race the first compute.
      setTimeout(() => void this.runTacticalOverlay(), 30_000);
      setTimeout(() => void this.runBigPictureOverlay(), 45_000);
      this.tacticalTimer = setInterval(
        () => void this.runTacticalOverlay(),
        TACTICAL_AI_INTERVAL_MS,
      );
      this.bigPictureTimer = setInterval(
        () => void this.runBigPictureOverlay(),
        BIG_PICTURE_AI_INTERVAL_MS,
      );
    }
  }

  onModuleDestroy(): void {
    [
      this.computeTimer,
      this.tacticalTimer,
      this.bigPictureTimer,
      this.macroTimer,
      this.etfTimer,
    ].forEach((t) => t && clearInterval(t));
  }

  // ─────────────────────────────────────────────────────── public read

  /**
   * Translate the auth-guard viewer into a `user.id` UUID. Delegates
   * to FoxyService which already has the lookup wired against the
   * `user` table — keeps the resolution in one place.
   */
  resolveViewerId(viewer: import('../common/decorators/current-user.decorator.js').AuthedUser): Promise<string> {
    return (
      this.foxy as unknown as {
        resolveViewerId(v: typeof viewer): Promise<string>;
      }
    ).resolveViewerId(viewer);
  }

  snapshot(): RightNowPayload {
    const assets: RightNowAsset[] = COINS.map((coin) => {
      const raw = this.cache.raw.get(coin);
      const ai = this.cache.ai.get(coin) ?? null;
      if (!raw) return emptyAsset(coin, ai);
      return { ...raw, ai };
    });
    return {
      assets,
      macro: this.cache.macro,
      cross_asset: this.cache.crossAsset,
      coverage: this.coverageReport(),
      computed_at: new Date(this.cache.computed_at || Date.now()).toISOString(),
      ai_at: this.cache.ai_at ? new Date(this.cache.ai_at).toISOString() : null,
    };
  }

  // ───────────────────────────────────────────── slow-cadence refreshes

  private async refreshMacro(): Promise<void> {
    const m = await fetchMacro();
    if (m) {
      this.cache.macro = m;
      this.markOk('macro');
    } else {
      this.markFail('macro');
    }
  }

  private async refreshCrossAsset(): Promise<void> {
    const c = await fetchCrossAsset();
    if (c) {
      this.cache.crossAsset = c;
      this.markOk('cross_asset');
    } else {
      this.markFail('cross_asset');
    }
  }

  private async refreshEtf(): Promise<void> {
    for (const coin of COINS) {
      if (!ETF_COINS.has(coin)) {
        this.cachedEtf.set(coin, null);
        continue;
      }
      const v = await fetchEtfFlow(coin as 'BTC' | 'ETH');
      this.cachedEtf.set(coin, v);
      if (v) this.markOk('etf');
      else this.markFail('etf');
    }
  }

  // ─────────────────────────────────────────────────────────── compute

  private async runCompute(): Promise<void> {
    if (this.computing) return;
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

    // Five TFs of klines + the slower context blocks, all in parallel.
    // Keep limit=200 across the board — gives EMA200 room and enough
    // structure on 1d (~6 months of bars).
    const [k5, k15, k1h, k4h, k1d, derivatives, whales, positioning, basis, fundingVel] =
      await Promise.all([
        fetchKlines(symbol, '5m', 200).catch(() => {
          this.markFail('klines');
          return [];
        }),
        fetchKlines(symbol, '15m', 200).catch(() => []),
        fetchKlines(symbol, '1h', 200).catch(() => []),
        fetchKlines(symbol, '4h', 200).catch(() => []),
        fetchKlines(symbol, '1d', 200).catch(() => []),
        this.foxy.derivativesByCoin(coin).catch(() => null),
        this.foxy.whalesByCoin(coin, { hours: 4 }).catch(() => null),
        this.foxy.positioningByCoin(coin, '1h').catch(() => null),
        fetchBasis(coin),
        fetchFundingVelocity(coin),
      ]);

    if (k1h.length > 0) this.markOk('klines');
    this.trackCoverage(derivatives, 'derivatives');
    this.trackCoverage(whales, 'whales');
    this.trackCoverage(positioning, 'positioning');
    this.trackCoverage(basis, 'basis');
    this.trackCoverage(fundingVel, 'funding_velocity');

    const price_change_24h_pct = priceChangeFromKlines(k1h, 24);
    const oi_change_24h_pct = derivatives?.oi?.change_24h_pct ?? null;
    const regime = classifyOiPriceRegime(oi_change_24h_pct, price_change_24h_pct);

    const last1h = k1h.at(-1)?.c ?? 0;
    const liq_clusters = approximateLiqClusters(k1h, last1h);
    const vwap = computeVwap(k1h, 24);

    const tf5 = this.buildBlock(k5, '5m', derivatives, whales, positioning, regime);
    const tf15 = this.buildBlock(k15, '15m', derivatives, whales, positioning, regime);
    const tf1h = this.buildBlock(k1h, '1h', derivatives, whales, positioning, regime);
    const tf4h = this.buildBlock(k4h, '4h', derivatives, whales, positioning, regime);
    const tf1d = this.buildBlock(k1d, '1d', derivatives, whales, positioning, regime);

    // Combined direction: scalp 25%, mid 30%, swing 45%. TFs that
    // failed to compute (klines too short) contribute 0.
    const score =
      tfScore(tf5, 0.08) +
      tfScore(tf15, 0.17) +
      tfScore(tf1h, 0.25) +
      tfScore(tf4h, 0.3) +
      tfScore(tf1d, 0.2);
    const combined: SignalKind =
      score > 0.15 ? 'long' : score < -0.15 ? 'short' : 'wait';
    const combined_confidence = Math.min(1, Math.abs(score));

    // Flip detection — compare each TF's new signal with the previous
    // tick, plus the combined direction (which is the user-facing call
    // and therefore the most important flip to surface visibly).
    const flips = this.recordFlips(coin, {
      '5m': tf5?.signal ?? 'wait',
      '15m': tf15?.signal ?? 'wait',
      '1h': tf1h?.signal ?? 'wait',
      '4h': tf4h?.signal ?? 'wait',
      '1d': tf1d?.signal ?? 'wait',
      combined,
    });

    // Surface the most-recent combined flip if it landed in the past 10
    // minutes — long enough that a viewer who came back to the tab
    // doesn't miss it, short enough that the banner self-dismisses
    // instead of staying pinned all session.
    const recentCombined = flips.find((f) => f.tf === 'combined');
    const combined_flip =
      recentCombined && Date.now() - new Date(recentCombined.at).getTime() < 10 * 60_000
        ? recentCombined
        : null;

    // If a combined flip just landed *this* tick (≤90s old), broadcast
    // it to all Web Push subscribers for the coin. The 90s threshold
    // is wider than the 60s compute interval so we don't miss a slow
    // tick, but tight enough that we won't double-broadcast on reboot
    // (where flipHistory would be empty anyway).
    if (
      recentCombined &&
      Date.now() - new Date(recentCombined.at).getTime() < 90_000
    ) {
      void this.push.broadcastFlip(coin, {
        from: recentCombined.from,
        to: recentCombined.to,
        at: recentCombined.at,
        confidence: round(combined_confidence, 2),
      });
    }

    return {
      coin,
      tf_5m: tf5,
      tf_15m: tf15,
      tf_1h: tf1h,
      tf_4h: tf4h,
      tf_1d: tf1d,
      combined,
      combined_confidence: round(combined_confidence, 2),
      positioning,
      regime,
      oi_change_24h_pct: oi_change_24h_pct != null ? round(oi_change_24h_pct, 2) : null,
      price_change_24h_pct:
        price_change_24h_pct != null ? round(price_change_24h_pct, 2) : null,
      basis: basis ?? null,
      funding_velocity: fundingVel ?? null,
      liq_clusters,
      etf: this.cachedEtf.get(coin) ?? null,
      vwap,
      flips,
      combined_flip,
    };
  }

  private buildBlock(
    klines: Awaited<ReturnType<typeof fetchKlines>>,
    tf: Tf,
    derivatives: Awaited<ReturnType<FoxyService['derivativesByCoin']>> | null,
    whales: Awaited<ReturnType<FoxyService['whalesByCoin']>> | null,
    positioning: FoxyPositioning | null,
    regime: OiPriceRegime,
  ): RightNowTfBlock | null {
    if (!klines || klines.length < 30) return null;
    const pa = analyzePriceAction(klines);
    const sig = computeSignal({ pa, derivatives, whales, positioning, regime, tf });
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

  // ──────────────────────────────────────────────────── flip tracking

  private recordFlips(
    coin: string,
    current: Record<Tf, SignalKind> & { combined: SignalKind },
  ): SignalFlip[] {
    const now = new Date().toISOString();
    const tracked: Array<Tf | 'combined'> = [...TFS_DEEP, 'combined'];
    for (const tf of tracked) {
      const key = `${coin}:${tf}`;
      const prev = this.cache.prevSignals.get(key);
      const curr = current[tf];
      if (prev && prev !== curr) {
        const flip: SignalFlip = { tf, from: prev, to: curr, at: now };
        const list = this.cache.flipHistory.get(coin) ?? [];
        list.unshift(flip);
        this.cache.flipHistory.set(coin, list.slice(0, FLIP_HISTORY_DEPTH));
      }
      this.cache.prevSignals.set(key, curr);
    }
    return [...(this.cache.flipHistory.get(coin) ?? [])];
  }

  // ───────────────────────────────────────────── coverage bookkeeping

  private markOk(name: SourceName): void {
    this.cache.lastOk.set(name, Date.now());
  }
  private markFail(name: SourceName): void {
    this.cache.lastFail.set(name, Date.now());
  }
  private trackCoverage(value: unknown, name: SourceName): void {
    if (value != null) this.markOk(name);
    else this.markFail(name);
  }

  private coverageReport(): CoverageRead[] {
    const now = Date.now();
    const sources: SourceName[] = [
      'klines',
      'derivatives',
      'whales',
      'positioning',
      'basis',
      'funding_velocity',
      'etf',
      'macro',
      'cross_asset',
    ];
    return sources.map((source) => {
      const last = this.cache.lastOk.get(source) ?? 0;
      const ok = last > 0 && now - last < 15 * 60_000; // 15 dk fresh
      return { source, ok, age_s: last ? Math.floor((now - last) / 1000) : -1 };
    });
  }

  // ────────────────────────────────────────────────── tactical AI tick

  private async runTacticalOverlay(): Promise<void> {
    if (!this.client || this.tacticalInflight) return;
    if (this.cache.raw.size === 0) return;
    this.tacticalInflight = true;
    try {
      const context = this.buildAiContext();
      if (context.length === 0) return;

      const res = await this.client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 800,
        system: TACTICAL_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              'Aşağıdaki ham snapshot\'tan her coin için iki alan üret:',
              '  • tactical_now : 1-2 cümle anlık aksiyon görüşü',
              '  • invalidation : 1 cümle, spesifik fiyat seviyesi şart',
              '',
              'Format JSON, başka şey yazma:',
              '{',
              '  "BTC": { "tactical_now": "...", "invalidation": "..." },',
              '  "ETH": { "tactical_now": "...", "invalidation": "..." }',
              '}',
              '',
              JSON.stringify(context, null, 2),
            ].join('\n'),
          },
        ],
      });
      const text = textFromResponse(res);
      const parsed = parseTacticalJson(text);
      if (!parsed) {
        this.log.warn('tactical AI parse failed; keeping previous overlay');
        return;
      }
      const now = Date.now();
      for (const coin of COINS) {
        const v = parsed[coin];
        if (!v) continue;
        const prev = this.cache.ai.get(coin);
        this.cache.ai.set(coin, {
          big_picture: prev?.big_picture ?? '',
          tactical_now: v.tactical_now,
          invalidation: v.invalidation,
          generated_at: new Date(now).toISOString(),
        });
      }
      this.cache.ai_at = now;
    } catch (e) {
      this.log.error(`tactical AI failed: ${(e as Error).message}`);
    } finally {
      this.tacticalInflight = false;
    }
  }

  // ─────────────────────────────────────────────── big picture AI tick

  private async runBigPictureOverlay(): Promise<void> {
    if (!this.client || this.bigPictureInflight) return;
    if (this.cache.raw.size === 0) return;
    this.bigPictureInflight = true;
    try {
      const context = this.buildAiContext();
      if (context.length === 0) return;

      const res = await this.client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 700,
        system: BIG_PICTURE_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              'Aşağıdaki snapshot\'tan her coin için 1-2 cümlelik yapısal +',
              'makro yorum üret. ETF, DXY, regime, positioning hepsini',
              'birleştir. Tactical seviye verme — bu cümle 15 dakika',
              'sabit kalacak.',
              '',
              'Format JSON:',
              '{ "BTC": { "big_picture": "..." }, "ETH": { "big_picture": "..." } }',
              '',
              JSON.stringify(context, null, 2),
            ].join('\n'),
          },
        ],
      });
      const text = textFromResponse(res);
      const parsed = parseBigPictureJson(text);
      if (!parsed) {
        this.log.warn('big picture AI parse failed; keeping previous overlay');
        return;
      }
      const now = Date.now();
      for (const coin of COINS) {
        const v = parsed[coin];
        if (!v) continue;
        const prev = this.cache.ai.get(coin);
        this.cache.ai.set(coin, {
          big_picture: v.big_picture,
          tactical_now: prev?.tactical_now ?? '',
          invalidation: prev?.invalidation ?? '',
          generated_at: new Date(now).toISOString(),
        });
      }
      this.cache.ai_at = now;
    } catch (e) {
      this.log.error(`big picture AI failed: ${(e as Error).message}`);
    } finally {
      this.bigPictureInflight = false;
    }
  }

  // ──────────────────────────────────────────────── AI context builder

  private buildAiContext(): Array<Record<string, unknown>> {
    return COINS.map((coin) => {
      const raw = this.cache.raw.get(coin);
      if (!raw) return null;
      if (!raw.tf_1h || !raw.tf_4h) return null; // wait for the 1h/4h reads
      return {
        coin,
        combined: raw.combined,
        combined_confidence: raw.combined_confidence,
        regime: raw.regime,
        oi_24h_pct: raw.oi_change_24h_pct,
        price_24h_pct: raw.price_change_24h_pct,
        basis: raw.basis
          ? {
              premium_pct: raw.basis.premium_pct,
              bias: raw.basis.bias,
              spread_usd: raw.basis.spread_usd,
            }
          : null,
        funding_velocity: raw.funding_velocity,
        positioning: raw.positioning
          ? {
              divergence: raw.positioning.divergence,
              top_long_pct: raw.positioning.top_traders?.long_pct ?? null,
              retail_long_pct: raw.positioning.retail?.long_pct ?? null,
              spread: raw.positioning.spread,
            }
          : null,
        liq_clusters: {
          below: raw.liq_clusters.below
            ? raw.liq_clusters.below.price
            : null,
          above: raw.liq_clusters.above
            ? raw.liq_clusters.above.price
            : null,
        },
        etf: raw.etf,
        vwap: raw.vwap
          ? { deviation_pct: raw.vwap.deviation_pct, bias: raw.vwap.bias }
          : null,
        macro: this.cache.macro
          ? {
              dxy_pct: this.cache.macro.dxy?.change_pct ?? null,
              es_pct: this.cache.macro.es_futures?.change_pct ?? null,
              risk_regime: this.cache.macro.risk_regime,
            }
          : null,
        cross_asset: this.cache.crossAsset,
        flips: raw.flips.slice(0, 3).map((f) => `${f.tf}: ${f.from}→${f.to} @${f.at}`),
        tfs: {
          '5m': raw.tf_5m ? digestForAi(raw.tf_5m) : null,
          '15m': raw.tf_15m ? digestForAi(raw.tf_15m) : null,
          '1h': raw.tf_1h ? digestForAi(raw.tf_1h) : null,
          '4h': raw.tf_4h ? digestForAi(raw.tf_4h) : null,
          '1d': raw.tf_1d ? digestForAi(raw.tf_1d) : null,
        },
      };
    }).filter((x): x is NonNullable<typeof x> => x != null);
  }
}

// ──────────────────────────────────────────────────────────────────── helpers

function emptyAsset(coin: string, ai: RightNowAi | null): RightNowAsset {
  return {
    coin,
    tf_5m: null,
    tf_15m: null,
    tf_1h: null,
    tf_4h: null,
    tf_1d: null,
    combined: 'wait',
    combined_confidence: 0,
    positioning: null,
    regime: 'neutral',
    oi_change_24h_pct: null,
    price_change_24h_pct: null,
    basis: null,
    funding_velocity: null,
    liq_clusters: {
      below: null,
      above: null,
      long_notional_5pct: 0,
      short_notional_5pct: 0,
    },
    etf: null,
    vwap: null,
    flips: [],
    combined_flip: null,
    ai,
  };
}

function directionToNum(s: SignalKind): number {
  return s === 'long' ? 1 : s === 'short' ? -1 : 0;
}

function tfScore(tf: RightNowTfBlock | null, weight: number): number {
  if (!tf) return 0;
  return directionToNum(tf.signal) * tf.confidence * weight;
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

function textFromResponse(res: Anthropic.Messages.Message): string {
  const block = res.content.find((c) => c.type === 'text');
  return block && block.type === 'text' ? block.text : '';
}

function parseTacticalJson(
  text: string,
): Record<string, { tactical_now: string; invalidation: string }> | null {
  const obj = parseJsonLoose(text);
  if (!obj) return null;
  const out: Record<string, { tactical_now: string; invalidation: string }> = {};
  for (const [k, v] of Object.entries(obj)) {
    const o = v as Record<string, unknown>;
    if (
      o &&
      typeof o.tactical_now === 'string' &&
      typeof o.invalidation === 'string'
    ) {
      out[k.toUpperCase()] = {
        tactical_now: o.tactical_now,
        invalidation: o.invalidation,
      };
    }
  }
  return Object.keys(out).length ? out : null;
}

function parseBigPictureJson(
  text: string,
): Record<string, { big_picture: string }> | null {
  const obj = parseJsonLoose(text);
  if (!obj) return null;
  const out: Record<string, { big_picture: string }> = {};
  for (const [k, v] of Object.entries(obj)) {
    const o = v as Record<string, unknown>;
    if (o && typeof o.big_picture === 'string') {
      out[k.toUpperCase()] = { big_picture: o.big_picture };
    }
  }
  return Object.keys(out).length ? out : null;
}

function parseJsonLoose(text: string): Record<string, unknown> | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function round(x: number, dp: number): number {
  const p = Math.pow(10, dp);
  return Math.round(x * p) / p;
}

function priceChangeFromKlines(
  klines: Awaited<ReturnType<typeof fetchKlines>>,
  lookback: number,
): number | null {
  if (klines.length < lookback + 1) return null;
  const start = klines.at(-(lookback + 1))?.c;
  const end = klines.at(-1)?.c;
  if (!start || !end) return null;
  return ((end - start) / start) * 100;
}

// ───────────────────────────────────────────────────────── system prompts

const COMMON_FRAME = [
  'Sen Right Now — bottomUP\'ın anlık yön motorunda çalışan baş analist.',
  'Türkçe, profesyonel masa dili, markdown yok, emoji yok.',
  '',
  'Sana 5 TF\'lik (5m/15m/1h/4h/1d) deterministic confluence skoru,',
  'OI ↔ Price 24h regime, spot/perp basis, funding velocity, balina vs',
  'retail pozisyon kıyası, ETF günlük net flow, makro (DXY + ES futures',
  'risk regime), liq cluster fiyatları ve son sinyal flip\'leri verilir.',
  '',
  'Veri okuma kuralları:',
  '  • OI↑ + Px↑ = sağlıklı uptrend; taze long para',
  '  • OI↑ + Px↓ = bearish confirmation; taze short açılıyor',
  '  • OI↓ + Px↑ = short squeeze; weak rally, sürdürülemez',
  '  • OI↓ + Px↓ = long capitulation; exhaustion, dip yakın',
  '  • basis premium > +0.05% = leveraged long (kırılgan)',
  '  • basis < -0.05% = panik / spot front-run',
  '  • funding rising + retail long-heavy = top-heavy distribution',
  '  • smart_bulls + capitulation_setup = en güçlü long sinyali',
  '  • DXY↑ + ES↓ = risk off (kripto baskı)',
  '  • ETF günlük >$200M giriş = kurumsal momentum',
  '',
  '"Şahsen ben olsam", "kesin", "garanti", "moon", "FOMO" YASAK.',
  'Olasılıklı dil: "yüksek ihtimal", "fitili kurulu", "absorbe ediyor".',
  'JSON dışında bir şey yazma — kod-fence bile.',
].join('\n');

const TACTICAL_PROMPT = [
  COMMON_FRAME,
  '',
  'GÖREV: tactical_now + invalidation üret.',
  '',
  'TEMEL KURAL — YÖN MANTIĞI:',
  '  • LONG önerirken tetik "X üstüne kapanış" / "X üzeri break" formu.',
  '    Hedef X\'ten YUKARIDA olmak ZORUNDA.',
  '  • SHORT önerirken tetik "X altına kapanış" / "X altı break" formu.',
  '    Hedef X\'ten AŞAĞIDA olmak ZORUNDA.',
  '  • Bu mantığı bozmak yasak. "2,306 üzeri short" gibi çelişkili',
  '    cümleler asla üretme.',
  '',
  'TEMEL KURAL — ÇELİŞKİDE BEKLE:',
  '  Eğer combined direction "wait" ise, ya da TF\'ler birbiriyle',
  '  çelişiyorsa (örn. 1h BOS↑ ama 4h BOS↓), tactical zorla long/short',
  '  yazma. "Şu an yön net değil, X üstüne kapanış long teyit eder, Y',
  '  altına kapanış short açar; arada işlem alma" formuyla iki taraflı',
  '  bekleme önerisi yaz.',
  '',
  'TEMEL KURAL — DİL:',
  '  • Türkçe ve doğal akış. "satıyor", "düşüyor" şimdiki zaman.',
  '    "satar", "düşer" geniş zaman YASAK.',
  '  • İngilizce sıfat/zaman kalıbı kullanma: "rising" → "yükseliyor",',
  '    "leveraged" → "kaldıraçlı", "aligned" → "hizalı".',
  '    Sadece teknik terim İngilizce kalır: BOS, CHOCH, OI, funding, basis,',
  '    OB, FVG, CHOCH, scalp, swing.',
  '  • Confidence sayısı yazma ("0.74 conf" YASAK) — UI zaten %güven gösteriyor.',
  '',
  'TEMEL KURAL — ÜÇ SAYI:',
  '  Long/short verirken cümlede şu üçü olmak zorunda:',
  '    • giriş tetiği (örn "64,200 üstü kapanış")',
  '    • hedef seviyesi (örn "65,800 zone")',
  '    • zaman dilimi/horizon (scalp / swing)',
  '',
  'tactical_now formatı: 1-2 cümle, max 35 kelime.',
  '',
  'İYİ örnek (long, çelişkisiz):',
  '  "BTC 1d BOS↑ + balina akümülasyonu sürerken 4h 74,988-75,800',
  '   bandında konsolide; 76,138 üstü kapanışla scalp long → 77,655',
  '   hedef, swing için 1d teyit bekle."',
  '',
  'İYİ örnek (short, çelişkisiz):',
  '  "ETH 4h BOS↓ + 1h CHOCH↓ aligned, funding pozitife dönüyor ama',
  '   balina CEX\'e satıyor; 2,290 altına kapanışla scalp short → 2,250',
  '   hedef."',
  '',
  'İYİ örnek (BEKLE / çelişkili TF):',
  '  "ETH\'de 1h BOS↑ ile 4h BOS↓ çelişiyor, kombine yön net değil;',
  '   2,306 üstüne kapanış long açar, 2,275 altı kapanış short tetikler,',
  '   arada işlem riskli."',
  '',
  'KÖTÜ örnekler:',
  '  ✗ "2,306 üzeri 5m short → 2,263 hedef" (yön mantığı kırık)',
  '  ✗ "0.74 conf + funding rising ama balina satar" (sayı + İngilizce + geniş zaman)',
  '  ✗ "84 altında scalp uygun" (hedef yok)',
  '  ✗ "BTC long olabilir" (boş)',
  '',
  'invalidation (1 cümle):',
  '  "X seviyesi altında/üstünde 1h kapanış tezi siler" formatı.',
  '  Tactical long ise invalidation aşağı seviye, short ise yukarı.',
].join('\n');

const BIG_PICTURE_PROMPT = [
  COMMON_FRAME,
  '',
  'GÖREV: big_picture üret (1-2 cümle, max 35 kelime).',
  '',
  'Yapısal + makro yorum. Tactical seviye verme — bu cümle 15 dakika',
  'sabit kalacak. ETF, DXY, regime, positioning, funding velocity,',
  'basis okumalarını sentezle. Cümlenin amacı: kullanıcı tek bakışta',
  '"ortam ne, kim baskın, hangi rejimdeyiz" sorusunun cevabını alsın.',
  '',
  'İYİ: "BTC orta vadede sağlıklı uptrend; ETF +$340M ile kurumsal',
  'destek var, ancak top-heavy retail pozisyon ve perp premium kısa',
  'vadede squeeze riski oluşturuyor."',
  'KÖTÜ: "BTC yukarı yönlü." (boş, neden yok, makro yok)',
].join('\n');
