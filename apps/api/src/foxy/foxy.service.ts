import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleInit,
} from '@nestjs/common';
import type { PrismaClient } from '@bottomup/db';
import Anthropic from '@anthropic-ai/sdk';
import { PRISMA } from '../common/prisma.module.js';
import { MarketIntelService } from '../market-intel/market-intel.service.js';
import {
  EntitlementService,
  type Entitlement,
} from '../entitlement/entitlement.service.js';
import type { AuthedUser } from '../common/decorators/current-user.decorator.js';
import { okxClient } from '../okx/okx.client.js';

export interface FoxyVerdict {
  risk_score: number;         // 0..100 (0 = low risk)
  verdict: 'TP_LIKELY' | 'NEUTRAL' | 'STOP_LIKELY';
  confidence: number;         // 0..100
  comment: string;            // Turkish, 1-2 sentences
}

export interface FoxyChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Result row for the BottomUp setups card on /home/foxy. Each row is
 * either an `incoming` (entry not yet hit) or `active` (live
 * position) — closed setups roll up into the `recent` aggregates,
 * not into this list.
 */
export interface FoxyCoinSetup {
  id: string;
  status: string;
  position: 'long' | 'short' | null;
  entry_value: number | null;
  stop_value: number | null;
  profit_taking_1: number | null;
  r_value: number | null;
  trader_id: string | null;
  trader_name: string | null;
  trader_image: string | null;
  created_at: Date | null;
  last_acted_at: Date | null;
}

export interface FoxySetupsByCoin {
  coin: string;
  active: FoxyCoinSetup[];
  /** Closed setups in the last 30 days, with simple aggregates. */
  recent: {
    count: number;
    wins: number;
    losses: number;
    break_even: number;
    win_rate: number | null;
    total_r: number;
  };
}

export interface FoxyWhaleTransfer {
  id: string;
  ts: string; // ISO timestamp
  chain: string; // 'ethereum', 'bsc', ...
  token_symbol: string;
  unit_value: number; // raw token amount
  usd_value: number; // historical USD
  from: { name: string; address: string; type: string | null };
  to: { name: string; address: string; type: string | null };
  /**
   * Direction relative to centralized exchanges. 'cex_in' means tokens
   * moved INTO an exchange (often pre-sell signal); 'cex_out' is the
   * opposite (often pre-hold). 'between' = neither side is a CEX.
   */
  flow: 'cex_in' | 'cex_out' | 'between';
  tx_hash: string;
}

export interface FoxyWhales {
  coin: string;
  /** Inputs reflected back so the UI can label the time window. */
  window_hours: number;
  min_usd: number;
  /** Total number of transfers Arkham knows about over the window. */
  total: number;
  /** Top transfers (by USD desc) we kept on the wire — capped to keep
   *  payloads small. */
  transfers: FoxyWhaleTransfer[];
  /** Aggregated CEX in/out totals across the full window. */
  flows: {
    cex_in_usd: number;
    cex_out_usd: number;
    between_usd: number;
  };
}

export interface FoxyQuotaState {
  used: number;
  limit: number;
  /** ISO of the start of the current ISO-week window (Monday 00:00 UTC). */
  window_starts_at: string;
  /** Convenience: epoch ms of the same window. */
  resets_at: string;
}

/**
 * Structured Claude verdict for the `/me/foxy/query` UI. The product
 * has to give a clear AL/SAT/BEKLE call — not a confluence score the
 * user has to interpret. We coerce Claude into emitting JSON so the
 * UI can render the call as a hero badge above the reasoning.
 */
export interface FoxyAnalysis {
  /** AL = buy now, SAT = sell/short, BEKLE = wait — no other values. */
  verdict: 'AL' | 'SAT' | 'BEKLE';
  /** One-sentence plain-Turkish headline that fits in a hero card.
   *  Founder voice, NO jargon — a normal user must grasp it instantly. */
  headline: string;
  /**
   * The single most important field: one short plain-Turkish paragraph
   * telling the user what to actually DO and why, with zero jargon.
   * This is the "🦊 Senin için" line — the answer to "ben ne yapayım".
   * Example: "Şu fiyattan alma. Yükseliş çok hızlı oldu ve onu taşıyan
   * büyük para yok; satış gelirse hızlı düşer. Elinde varsa kârını al."
   */
  takeaway: string;
  /**
   * 3–6 bullet reasons in PLAIN Turkish. Each pairs a plain-language
   * explanation with the hard number — never a bare metric or an
   * English term. Prefer "Yukarı oynayanlar kalabalık ama yükselişe
   * büyük cüzdanlardan giriş yok (24 saatte sıfır)" over "OI -4.5%".
   */
  reasons: string[];
  /** Single PLAIN-Turkish sentence describing what would flip the call
   *  ("ne zaman fikrim değişir"). May be empty for BEKLE. */
  invalidation: string;
  /**
   * Directional lean, REQUIRED even on BEKLE — "hangi tarafa yatkın".
   * BEKLE without a bias taught the model to hide behind neutrality;
   * the UI renders this as an "Eğilim" chip next to the verdict.
   */
  bias: 'up' | 'down' | 'neutral';
}

export interface FoxyQueryReply {
  prompt: string;
  coin: string | null;
  /** Structured AL/SAT/BEKLE verdict + takeaway + reasons + invalidation. */
  analysis: FoxyAnalysis;
  /**
   * The same supporting data the AI model reasoned over, surfaced so
   * the user sees a full decision board — not just the verdict. Each
   * source degrades to null independently; the UI hides empty panels.
   */
  market: FoxyAssetMarket | null;
  derivatives: FoxyDerivatives | null;
  whales: FoxyWhales | null;
  setups: FoxySetupsByCoin | null;
  /** OKX live order-book snapshot (top levels) for the "canlı tahta" panel. */
  orderbook: FoxyOrderBook | null;
  /** Foxy's own 5-15 min scalp setup: direction + entry/stop/TP levels. */
  signal: FoxyScalpSignal | null;
  quota: FoxyQuotaState;
  /** Echoed for the UI to show the tier badge. */
  entitlement: Entitlement;
}

export interface FoxyAssetMarket {
  price: number;
  change_24h_pct: number;
  high_24h: number | null;
  low_24h: number | null;
  quote_volume_24h: number | null;
}

export interface FoxyOrderBookLevel {
  /** Price level. */
  px: number;
  /** Size at this level, in base units (e.g. BTC). */
  sz: number;
}

export interface FoxyOrderBook {
  /** Trading pair, e.g. "BTC-USDT". */
  inst_id: string;
  /** Exchanges that contributed to this aggregated book (e.g. ["OKX",
   *  "Binance", "Bybit", "Bitget", "Coinbase"]). */
  sources: string[];
  /** Best asks first (ascending price). Size summed across exchanges. */
  asks: FoxyOrderBookLevel[];
  /** Best bids first (descending price). Size summed across exchanges. */
  bids: FoxyOrderBookLevel[];
  /** Midpoint between best bid/ask. */
  mid: number;
  /** Best ask − best bid, absolute. */
  spread: number;
  /** Spread as a percent of mid. */
  spread_pct: number;
  /** Snapshot epoch ms. */
  ts: number;
}

/** One price band in the depth profile. */
export interface FoxyDepthBucket {
  px_low: number;
  px_high: number;
  px_mid: number;
  /** Resting size in base units, summed across venues. */
  size: number;
  /** Approx USD value of the resting size. */
  usd: number;
  /** usd ÷ the side's uniform per-bucket share — 1.0 is "average". */
  strength: number;
  /** True when this band holds a disproportionate pile (≥3× share). */
  is_wall: boolean;
}

/**
 * Where resting bids/asks concentrate around the mid — the "walls"
 * view. Built from DEEP books (hundreds of levels per venue), unlike
 * the ladder's top-8, and bucketed into equal % bands.
 */
export interface FoxyDepthProfile {
  coin: string;
  inst_id: string;
  sources: string[];
  mid: number;
  /** Band coverage on each side, e.g. 2.5 (= ±2.5%). */
  range_pct: number;
  buckets_per_side: number;
  /** Sorted nearest-to-mid first (descending price for bids). */
  bids: FoxyDepthBucket[];
  /** Sorted nearest-to-mid first (ascending price for asks). */
  asks: FoxyDepthBucket[];
  /** Nearest wall below the mid (buyers defending) — null if none. */
  support_wall: FoxyDepthBucket | null;
  /** Nearest wall above the mid (sellers capping) — null if none. */
  resistance_wall: FoxyDepthBucket | null;
  ts: number;
}

/** One technical factor contributing to a confluence zone. */
export interface FoxyZoneFactor {
  kind: 'order_block' | 'fvg' | 'ema' | 'wall';
  /** Timeframe the factor came from ('1W','1D','4H','15m','5m') or 'defter'. */
  tf: string;
  /** Human chip text, e.g. "1D OB", "4H FVG", "EMA200 1D", "DUVAR $1.8M". */
  detail: string;
  weight: number;
}

/** A price band where independent technical evidence stacks up. */
export interface FoxyZone {
  low: number;
  high: number;
  mid: number;
  /** demand = buy interest below price; supply = sell interest above. */
  side: 'demand' | 'supply';
  /** Σ factor weights — higher = more independent evidence. */
  score: number;
  /** Signed % distance of the zone mid from the current price. */
  dist_pct: number;
  factors: FoxyZoneFactor[];
}

/** Per-timeframe price-action snapshot — trend regime + momentum. */
export interface FoxyTfTrend {
  tf: string;
  /** EMA alignment: up (price above 20/50), down (below), else range. */
  regime: 'up' | 'down' | 'range';
  rsi14: number | null;
  above_ema20: boolean | null;
  above_ema50: boolean | null;
  above_ema200: boolean | null;
  /** % move over the last 20 bars of this timeframe. */
  change20_pct: number | null;
}

/**
 * Multi-timeframe confluence map: order blocks + fair value gaps +
 * the most-used EMAs (20/50/200) across 1W/1D/4H/15m/5m, overlaid
 * with the live depth walls, clustered into scored buy/sell zones.
 */
export interface FoxyConfluence {
  coin: string;
  price: number;
  /** Strongest zones, demand and supply mixed — sort/filter client-side. */
  zones: FoxyZone[];
  /** Price-action summary per timeframe (largest first). */
  trend: FoxyTfTrend[];
  ts: number;
}

/** One take-profit level on a scalp signal. */
export interface FoxyScalpTarget {
  /** Price for this take-profit. */
  price: number;
  /** R multiple (reward ÷ risk) this level pays. */
  r: number;
  /** Signed % move from entry to this level. */
  pct: number;
}

/**
 * A concrete, tradeable scalp setup Foxy generates itself — not a
 * relayed trader setup. Levels are computed algorithmically off OKX
 * 5-minute candles (ATR for the stop distance, R-multiples for the
 * targets) so the numbers are deterministic and never LLM-hallucinated.
 * Direction comes from a transparent multi-factor confluence score
 * (trend / momentum / order-book imbalance / funding). When confluence
 * is weak the direction is 'NONE' — an honest "no clean trade, wait".
 */
export interface FoxyScalpSignal {
  coin: string;
  /** LONG, SHORT, or NONE (no clean edge right now → wait). */
  direction: 'LONG' | 'SHORT' | 'NONE';
  /** Intended holding window, e.g. "5-15 dk". */
  timeframe: string;
  /** Reference price at signal time (last 5m close). */
  price: number;
  /** Suggested entry (mid of the entry zone). Null when NONE. */
  entry: number | null;
  /** [low, high] entry band — scalps fill on a small zone, not a tick. */
  entry_zone: [number, number] | null;
  /** Protective stop. Null when NONE. */
  stop: number | null;
  /** Take-profit ladder (TP1..TP3), nearest first. Empty when NONE. */
  targets: FoxyScalpTarget[];
  /** |entry − stop| in quote currency (the "1R" distance). */
  risk_per_unit: number | null;
  /** Reward:risk to the furthest target. */
  rr: number | null;
  /** Confluence confidence, 0–100. */
  confidence: number;
  /** Plain-Turkish one-liner: what to do. */
  headline: string;
  /** 2–4 plain-Turkish confluence reasons, each with its hard number. */
  reasons: string[];
  /** Plain-Turkish: the single thing that kills this setup. */
  invalidation: string;
  /** ISO timestamp the signal was generated. */
  generated_at: string;
  /** Indicator snapshot powering the call (transparency row). */
  meta: {
    rsi: number | null;
    ema_fast: number | null;
    ema_slow: number | null;
    atr: number | null;
    trend: 'up' | 'down' | 'flat';
    /** Order-book bid/ask imbalance, −1 (all asks) … +1 (all bids). */
    ob_imbalance: number | null;
  };
}

export interface FoxyOverviewAsset {
  coin: string;
  market: FoxyAssetMarket | null;
  derivatives: FoxyDerivatives | null;
  whales: FoxyWhales | null;
  /**
   * Claude-generated 2-3 paragraph Turkish briefing. Synthesises
   * leverage stacking, funding bias, liquidation pressure, whale
   * accumulation/distribution, and gives a tactical "şu an nereden
   * trade alınır" call-out.
   */
  ai_brief: string;
}

export interface FoxyOverview {
  assets: FoxyOverviewAsset[];
  generated_at: string;
  /** Server-side cache TTL (seconds). The whole response is shared
   *  across all viewers — no per-user counter is consumed. */
  cached_for_seconds: number;
}

export interface FoxyDerivatives {
  /** Bare symbol echoed back (e.g. "ETH"). */
  coin: string;
  /** Aggregated across exchanges (CoinGlass `coin-list`). */
  liquidation: {
    long_24h_usd: number;
    short_24h_usd: number;
    total_24h_usd: number;
    total_4h_usd: number;
    total_1h_usd: number;
  } | null;
  /** Open interest across exchanges (CoinGlass aggregate). */
  oi: {
    oi_usd: number;
    change_4h_pct: number | null;
    change_24h_pct: number | null;
  } | null;
  /** Binance global long/short account ratio (1h window). */
  long_short: {
    long_ratio: number;
    short_ratio: number;
    ts: number;
  } | null;
  /** Binance perpetual funding rate. */
  funding: {
    rate: number;
    annualized_pct: number;
    next_funding_ts: number | null;
  } | null;
}

/**
 * Smart-money vs retail kıyası — Binance'in iki ayrı public
 * endpoint'inden besleniyor:
 *
 *   • topTraders → `topLongShortPositionRatio` — Binance hesaplarının
 *     pozisyon büyüklüğüne göre top %20 dilimi. Whale proxy'si.
 *   • retail    → `globalLongShortAccountRatio`  — TÜM hesapların
 *     long/short oranı. Retail proxy'si.
 *
 * Aralarındaki spread (top_long - retail_long) klasik bir distribution
 * / accumulation göstergesidir:
 *   spread > +0.1 → balinalar belirgin bullish, retail temkinli (smart bulls)
 *   spread < -0.1 → balinalar belirgin bearish, retail bullish (top heavy)
 */
export interface FoxyPositioning {
  coin: string;
  /** "1h" | "5m" | "15m" — hangi pencere üzerinden okundu. */
  period: string;
  ts: number;
  retail: { long_pct: number; short_pct: number; ratio: number } | null;
  top_traders: { long_pct: number; short_pct: number; ratio: number } | null;
  /** top_long - retail_long; pozitif → balinalar daha bullish. */
  spread: number | null;
  /**
   * Yorumlanmış divergence durumu. UI bunu rozet ve renkler için
   * okur, AI prompt'larında da bağlam olarak kullanılır.
   *
   *   smart_bulls          : top long-heavy, retail temkinli
   *   smart_bears          : top short-heavy, retail bullish (en kuvvetli ters sinyal)
   *   top_heavy            : retail long-heavy, top temkinli/bearish — distribution riski
   *   capitulation_setup   : retail short-heavy, top long-heavy — squeeze fitili
   *   aligned_long         : ikisi de long-heavy
   *   aligned_short        : ikisi de short-heavy
   *   neutral              : iki taraf da %50'ye yakın
   */
  divergence:
    | 'smart_bulls'
    | 'smart_bears'
    | 'top_heavy'
    | 'capitulation_setup'
    | 'aligned_long'
    | 'aligned_short'
    | 'neutral';
}

interface SetupRow {
  id: string;
  coin_name: string;
  category: string;
  position: string | null;
  order_type: string;
  entry_value: number;
  entry_value_end: number | null;
  stop_value: number | null;
  profit_taking_1: number | null;
  profit_taking_2: number | null;
  profit_taking_3: number | null;
  r_value: number | null;
  created_at: Date | null;
  status: string;
  trader_name: string | null;
}

// 5-minute in-process cache. Foxy output should only refresh when market
// moves meaningfully; this keeps us off the Anthropic quota during
// dev/poll-heavy UX.
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; value: FoxyVerdict }>();

@Injectable()
export class FoxyService implements OnModuleInit {
  private readonly log = new Logger(FoxyService.name);
  private readonly client: Anthropic | null;

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly marketIntel: MarketIntelService,
    private readonly entitlement: EntitlementService,
  ) {
    const key = process.env.ANTHROPIC_API_KEY;
    this.client = key ? new Anthropic({ apiKey: key }) : null;
    if (!this.client) {
      this.log.warn('ANTHROPIC_API_KEY not set — FoxyService will return stub verdicts');
    }
  }

  /**
   * Lazy-create the `foxy_query_log` table on first boot. Avoids
   * shipping a Prisma migration just for the Foxy weekly quota — the
   * table is self-contained, indexed by (user_id, created_at), and
   * shape only ever appended-to. If the table already exists this is
   * a no-op.
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS foxy_query_log (
          id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id     uuid        NOT NULL,
          prompt      text        NOT NULL,
          coin        varchar(16),
          tier        varchar(16) NOT NULL,
          created_at  timestamptz NOT NULL DEFAULT NOW()
        );
      `);
      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS ix_foxy_query_log_user_week
          ON foxy_query_log (user_id, created_at DESC);
      `);
    } catch (err) {
      this.log.warn(
        { err: (err as Error).message },
        'foxy_query_log bootstrap failed (will try again next boot)',
      );
    }
  }

  async analyze(setupId: string): Promise<FoxyVerdict> {
    const cached = cache.get(setupId);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

    const setup = await this.loadSetup(setupId);
    if (!setup) throw new NotFoundException('Setup not found');

    const market = await this.fetchMarket(setup.coin_name).catch((err) => {
      this.log.warn({ err: (err as Error).message, coin: setup.coin_name }, 'binance fetch failed');
      return null;
    });

    const verdict = this.client
      ? await this.askClaude(setup, market)
      : this.fallback(setup, market);

    cache.set(setupId, { at: Date.now(), value: verdict });
    return verdict;
  }

  /**
   * Free-form chat with Foxy. Mobile's BupAI calls OpenAI directly from
   * the client with a key fetched out of Firebase Remote Config; we proxy
   * through the backend so the key never hits the browser. System prompt
   * is product-scoped (crypto/trading context) and turns are limited to
   * 20 round-trips so history doesn't grow unbounded.
   */
  async chat(messages: FoxyChatMessage[]): Promise<string> {
    if (!this.client) {
      return 'Foxy AI anahtarı ayarlı değil. Yöneticiyle iletişime geç.';
    }
    const trimmed = messages
      .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-20)
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content.slice(0, 4000),
      }));

    const res = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      system:
        'You are Foxy AI, the in-app assistant for bottomUP — a crypto trading-signal community. ' +
        'Users are active traders asking about markets, indicators, setup interpretation, risk, ' +
        'or platform usage. Answer in Turkish unless the user writes in another language. ' +
        'Stay concise (2-5 short paragraphs max), never give direct financial advice disclaimers ' +
        'longer than one sentence, and never output code unless explicitly asked. If a question is ' +
        'outside crypto/trading/platform scope, redirect briefly without being preachy.',
      messages: trimmed,
    });

    const block = res.content.find((c) => c.type === 'text');
    if (!block || block.type !== 'text') {
      return 'Foxy şu an cevap veremedi, bir dakika sonra tekrar dener misin?';
    }
    return block.text.trim();
  }

  /**
   * BottomUp setups for a given coin — backs the "BottomUp setups"
   * card on /home/foxy. Caller passes the bare symbol (e.g. "ETH")
   * or the full pair name ("ETHUSDT"); we normalize to the
   * `<SYMBOL>USDT` form the setup table stores.
   *
   * Returns the live (incoming + active) setups individually plus a
   * 30-day rollup of closed setups so the UI can answer "how has
   * this coin been performing across BottomUp recently?" without
   * a second round-trip.
   */
  async setupsByCoin(coinInput: string): Promise<FoxySetupsByCoin> {
    const coinName = normalizeCoinName(coinInput);
    const active = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT s.id::text                  AS id,
              s.status::text              AS status,
              s.position::text            AS position,
              s.entry_value               AS entry_value,
              s.stop_value                AS stop_value,
              s.profit_taking_1           AS profit_taking_1,
              s.r_value                   AS r_value,
              s.trader_id::text           AS trader_id,
              u.name                      AS trader_name,
              u.image                     AS trader_image,
              s.created_at                AS created_at,
              s.last_acted_at             AS last_acted_at
         FROM setup s
         LEFT JOIN "user" u ON u.id = s.trader_id
        WHERE s.is_deleted = FALSE
          AND s.coin_name  = $1
          AND s.category   = 'futures'::categories_type
          AND s.status IN ('incoming'::statuses_type, 'active'::statuses_type)
        ORDER BY s.last_acted_at DESC NULLS LAST
        LIMIT 24`,
      coinName,
    );

    const recentRows = await this.prisma.$queryRawUnsafe<Array<{
      status: string | null;
      r_value: number | string | null;
    }>>(
      `SELECT s.status::text AS status,
              s.r_value      AS r_value
         FROM setup s
        WHERE s.is_deleted = FALSE
          AND s.coin_name  = $1
          AND s.category   = 'futures'::categories_type
          AND s.status IN ('success'::statuses_type,'stopped'::statuses_type,'closed'::statuses_type)
          AND COALESCE(s.close_date, s.stop_date, s.tp1_date, s.last_acted_at) >= NOW() - INTERVAL '30 days'`,
      coinName,
    );

    let wins = 0;
    let losses = 0;
    let breakEven = 0;
    let totalR = 0;
    for (const row of recentRows) {
      const r = Number(row.r_value ?? 0);
      if (Number.isFinite(r)) totalR += r;
      if (row.status === 'success') wins += 1;
      else if (row.status === 'stopped') losses += 1;
      else breakEven += 1;
    }
    const scored = wins + losses;
    const winRate = scored > 0 ? wins / scored : null;

    // Freshness guard. The source DB can carry setups that are still
    // flagged `active`/`incoming` long after they became irrelevant —
    // a long whose stop the market blew through weeks ago, or a limit
    // resting 40% away from spot. Those show entry/stop/target levels
    // that no longer mean anything ("bu işlemlerin hiçbiri güncel
    // değil"). We reconcile against the live price and drop the dead
    // ones so the panel only ever shows tradeable setups.
    // NOTE: coinName is already pair-formatted ("SOLUSDT") — appending
    // another USDT produced "SOLUSDTUSDT", both venues returned null and
    // the guard silently never fired (May setups kept rendering $97
    // entries with SOL at $81).
    const live = await this.fetchMarket24h(coinName).catch(() => null);
    const price = live?.price ?? null;
    const isStale = (
      position: 'long' | 'short' | null,
      entry: number | null,
      stop: number | null,
    ): boolean => {
      if (price == null || price <= 0) return false; // no price → can't judge, keep
      // Stop already breached → the position would have closed.
      if (stop != null && stop > 0) {
        if (position === 'long' && price <= stop) return true;
        if (position === 'short' && price >= stop) return true;
      }
      // Levels sitting absurdly far from spot are no longer meaningful.
      if (entry != null && entry > 0) {
        if (Math.abs(price - entry) / entry > 0.35) return true;
      }
      return false;
    };

    return {
      coin: coinName,
      active: active
        .map((r) => ({
          id: r.id as string,
          status: String(r.status ?? ''),
          position:
            r.position === 'long' || r.position === 'short'
              ? (r.position as 'long' | 'short')
              : null,
          entry_value: r.entry_value == null ? null : Number(r.entry_value),
          stop_value: r.stop_value == null ? null : Number(r.stop_value),
          profit_taking_1: r.profit_taking_1 == null ? null : Number(r.profit_taking_1),
          r_value: r.r_value == null ? null : Number(r.r_value),
          trader_id: (r.trader_id as string | null) ?? null,
          trader_name: (r.trader_name as string | null) ?? null,
          trader_image: (r.trader_image as string | null) ?? null,
          created_at: (r.created_at as Date | null) ?? null,
          last_acted_at: (r.last_acted_at as Date | null) ?? null,
        }))
        .filter((s) => !isStale(s.position, s.entry_value, s.stop_value)),
      recent: {
        count: recentRows.length,
        wins,
        losses,
        break_even: breakEven,
        win_rate: winRate,
        total_r: Math.round(totalR * 100) / 100,
      },
    };
  }

  /**
   * Derivatives card on /home/foxy: liquidations 24h, open interest,
   * long/short account ratio, and funding rate — all per-coin.
   *
   * Liquidation + OI come from CoinGlass via the existing
   * MarketIntelService (cached, key-rotated). L/S ratio + funding
   * rate come from Binance's free `fapi` endpoints because they
   * accept arbitrary `<SYMBOL>USDT` pairs without exhausting our
   * CoinGlass credits.
   *
   * Each block fetches in parallel and degrades independently — if
   * Binance's fundingRate API hiccups, we still return liquidation
   * and OI data alongside `funding: null`.
   */
  async derivativesByCoin(coinInput: string): Promise<FoxyDerivatives> {
    const coinName = normalizeCoinName(coinInput); // e.g. ETHUSDT
    const bare = coinName.replace(/USDT$/i, ''); // e.g. ETH

    const [liqRows, oiRows, ls, funding] = await Promise.all([
      this.marketIntel.liquidationSummary(30).catch((err) => {
        this.log.warn(
          { err: (err as Error).message, coin: bare },
          'foxy liquidation summary failed',
        );
        return [];
      }),
      this.marketIntel.openInterest([bare]).catch((err) => {
        this.log.warn(
          { err: (err as Error).message, coin: bare },
          'foxy open interest failed',
        );
        return [];
      }),
      this.fetchLongShort(coinName).catch((err) => {
        this.log.warn(
          { err: (err as Error).message, coin: coinName },
          'foxy long/short failed',
        );
        return null;
      }),
      this.fetchFunding(coinName).catch((err) => {
        this.log.warn(
          { err: (err as Error).message, coin: coinName },
          'foxy funding failed',
        );
        return null;
      }),
    ]);

    // CoinGlass returns liquidation rows keyed by bare symbol.
    const liqRow = liqRows.find(
      (r) => r.symbol.toUpperCase() === bare.toUpperCase(),
    );
    const oiRow = oiRows[0];

    return {
      coin: bare,
      liquidation: liqRow
        ? {
            long_24h_usd: liqRow.long_24h_usd,
            short_24h_usd: liqRow.short_24h_usd,
            total_24h_usd: liqRow.total_24h_usd,
            total_4h_usd: liqRow.total_4h_usd,
            total_1h_usd: liqRow.total_1h_usd,
          }
        : null,
      oi: oiRow
        ? {
            oi_usd: oiRow.oi_usd,
            change_4h_pct: oiRow.oi_change_4h_pct,
            change_24h_pct: oiRow.oi_change_24h_pct,
          }
        : null,
      long_short: ls,
      funding,
    };
  }

  /** Single-symbol long/short pull from Binance (the existing
   *  `MarketIntelService.longShort` helper hard-codes a top-coin
   *  list, so we duplicate the request here for arbitrary pairs).
   */
  private async fetchLongShort(symbol: string): Promise<FoxyDerivatives['long_short']> {
    const res = await fetch(
      `https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${encodeURIComponent(
        symbol,
      )}&period=1h&limit=1`,
      { signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as Array<{
      longAccount?: string;
      shortAccount?: string;
      timestamp?: number;
    }>;
    const first = Array.isArray(json) ? json[0] : null;
    if (!first) return null;
    const long = Number(first.longAccount ?? 0);
    const short = Number(first.shortAccount ?? 0);
    if (!Number.isFinite(long) || !Number.isFinite(short)) return null;
    return { long_ratio: long, short_ratio: short, ts: Number(first.timestamp ?? Date.now()) };
  }

  /** Binance perpetual funding rate (premiumIndex returns the live
   *  forecasted rate plus the next-funding timestamp). Annualised
   *  to make the number comparable to traditional yield. */
  private async fetchFunding(symbol: string): Promise<FoxyDerivatives['funding']> {
    const res = await fetch(
      `https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${encodeURIComponent(symbol)}`,
      { signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      lastFundingRate?: string;
      nextFundingTime?: number;
    };
    const rate = Number(json.lastFundingRate ?? 0);
    if (!Number.isFinite(rate)) return null;
    // Funding is paid every 8h, so annualised = rate × 3 × 365.
    const annualised = rate * 3 * 365 * 100;
    return {
      rate,
      annualized_pct: Math.round(annualised * 100) / 100,
      next_funding_ts: json.nextFundingTime ?? null,
    };
  }

  /**
   * Whale moves card on /home/foxy: large-USD on-chain transfers for
   * the asset, courtesy of Arkham. We pull the top N transfers in
   * the last 24h above the configured USD floor (default $1M) and
   * also aggregate net CEX in/out flow over the same window — that
   * second number is the actual signal traders care about ("did
   * whales send ETH to Binance to sell?").
   *
   * Auth: API-Key header. Key lives in ARKHAM_API_KEY (Railway env).
   */
  async whalesByCoin(
    coinInput: string,
    opts: { minUsd?: number; hours?: number; limit?: number } = {},
  ): Promise<FoxyWhales> {
    const symbol = normalizeCoinName(coinInput).replace(/USDT$/i, '');
    const slug = ARKHAM_SLUG[symbol] ?? null;
    const minUsd = Math.max(50_000, Math.floor(opts.minUsd ?? 1_000_000));
    const hours = Math.max(1, Math.min(168, Math.floor(opts.hours ?? 24)));
    const limit = Math.max(1, Math.min(50, Math.floor(opts.limit ?? 20)));

    if (!slug) {
      // Coin we don't have an Arkham id for yet — return an empty
      // result so the card renders a clean empty state instead of an
      // error. Mapping additions land in ARKHAM_SLUG below.
      return {
        coin: symbol,
        window_hours: hours,
        min_usd: minUsd,
        total: 0,
        transfers: [],
        flows: { cex_in_usd: 0, cex_out_usd: 0, between_usd: 0 },
      };
    }

    const apiKey = process.env.ARKHAM_API_KEY;
    if (!apiKey) {
      this.log.warn('ARKHAM_API_KEY not set — whales card will be empty');
      return {
        coin: symbol,
        window_hours: hours,
        min_usd: minUsd,
        total: 0,
        transfers: [],
        flows: { cex_in_usd: 0, cex_out_usd: 0, between_usd: 0 },
      };
    }

    const url = new URL('https://api.arkm.com/transfers');
    url.searchParams.set('tokens', slug);
    url.searchParams.set('usdGte', String(minUsd));
    url.searchParams.set('timeLast', `${hours}h`);
    url.searchParams.set('sortKey', 'usd');
    url.searchParams.set('sortDir', 'desc');
    // Over-fetch: one on-chain transaction often shows up as several
    // legs (a $129M Uniswap arb cycle is 4 rows of the same amount),
    // and after per-tx dedup below we still want `limit` real rows.
    url.searchParams.set('limit', String(Math.min(100, limit * 5)));

    const res = await fetch(url, {
      headers: { 'API-Key': apiKey, accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      this.log.warn(
        { status: res.status, coin: symbol },
        'arkham transfers failed',
      );
      return {
        coin: symbol,
        window_hours: hours,
        min_usd: minUsd,
        total: 0,
        transfers: [],
        flows: { cex_in_usd: 0, cex_out_usd: 0, between_usd: 0 },
      };
    }
    const json = (await res.json()) as {
      count?: number;
      transfers?: Array<Record<string, unknown>>;
    };

    // Parse every leg first; grouping happens below.
    const legs: FoxyWhaleTransfer[] = [];
    for (const t of json.transfers ?? []) {
      const fromAddr = t.fromAddress as Record<string, unknown> | undefined;
      const toAddr = t.toAddress as Record<string, unknown> | undefined;
      const fromEntity = fromAddr?.arkhamEntity as Record<string, unknown> | undefined;
      const toEntity = toAddr?.arkhamEntity as Record<string, unknown> | undefined;
      const fromType = (fromEntity?.type as string | undefined) ?? null;
      const toType = (toEntity?.type as string | undefined) ?? null;
      const fromIsCex = fromType === 'cex';
      const toIsCex = toType === 'cex';
      const usd = Number(t.historicalUSD ?? 0);

      let flow: FoxyWhaleTransfer['flow'] = 'between';
      if (toIsCex && !fromIsCex) flow = 'cex_in';
      else if (fromIsCex && !toIsCex) flow = 'cex_out';

      legs.push({
        id: String(t.id ?? `${t.transactionHash}-${t.tokenSymbol}`),
        ts: String(t.blockTimestamp ?? ''),
        chain: String(t.chain ?? ''),
        token_symbol: String(t.tokenSymbol ?? ''),
        unit_value: Number(t.unitValue ?? 0),
        usd_value: usd,
        from: {
          name:
            (fromEntity?.name as string | undefined) ??
            (fromAddr?.address as string | undefined) ??
            '—',
          address: (fromAddr?.address as string | undefined) ?? '',
          type: fromType,
        },
        to: {
          name:
            (toEntity?.name as string | undefined) ??
            (toAddr?.address as string | undefined) ??
            '—',
          address: (toAddr?.address as string | undefined) ?? '',
          type: toType,
        },
        flow,
        tx_hash: String(t.transactionHash ?? ''),
      });
    }

    // One on-chain transaction, one row. Arkham reports every hop of a
    // transaction as a separate transfer, so a single Uniswap arb cycle
    // (WETH contract → router → pool → router → WETH contract) showed
    // up as four identical "$129.6M whale moves" and quadruple-counted
    // the flow totals. Group by tx hash, then:
    //  - if the tx's tokens net out to ~zero per address, it's a swap /
    //    arb / flash cycle — drop it entirely (no economic transfer);
    //  - otherwise keep ONE representative leg: a CEX-touching leg if
    //    any (that's the signal we chart), else the largest leg.
    const byTx = new Map<string, FoxyWhaleTransfer[]>();
    for (const leg of legs) {
      const key = leg.tx_hash || leg.id;
      const arr = byTx.get(key);
      if (arr) arr.push(leg);
      else byTx.set(key, [leg]);
    }

    const transfers: FoxyWhaleTransfer[] = [];
    let cexIn = 0;
    let cexOut = 0;
    let between = 0;
    for (const group of byTx.values()) {
      let pick: FoxyWhaleTransfer;
      if (group.length === 1) {
        pick = group[0]!;
      } else {
        // Net token movement per address across the tx's legs.
        const net = new Map<string, number>();
        let maxLeg = 0;
        for (const leg of group) {
          maxLeg = Math.max(maxLeg, leg.unit_value);
          if (leg.from.address)
            net.set(leg.from.address, (net.get(leg.from.address) ?? 0) - leg.unit_value);
          if (leg.to.address)
            net.set(leg.to.address, (net.get(leg.to.address) ?? 0) + leg.unit_value);
        }
        const maxNet = Math.max(0, ...[...net.values()].map(Math.abs));
        // Everything returned to where it started → cycle, not a transfer.
        if (maxLeg > 0 && maxNet < maxLeg * 0.15) continue;
        pick =
          group.find((l) => l.flow !== 'between') ??
          group.reduce((a, b) => (b.usd_value > a.usd_value ? b : a));
      }
      transfers.push(pick);
      if (pick.flow === 'cex_in') cexIn += pick.usd_value;
      else if (pick.flow === 'cex_out') cexOut += pick.usd_value;
      else between += pick.usd_value;
    }
    transfers.sort((a, b) => b.usd_value - a.usd_value);
    const capped = transfers.slice(0, limit);

    return {
      coin: symbol,
      window_hours: hours,
      min_usd: minUsd,
      total: capped.length,
      transfers: capped,
      flows: {
        cex_in_usd: Math.round(cexIn),
        cex_out_usd: Math.round(cexOut),
        between_usd: Math.round(between),
      },
    };
  }

  /**
   * Smart-money vs retail positioning — Binance'in iki ayrı public
   * data endpoint'inden besleniyor. İki tarafın long/short %'ine ek
   * olarak interpretive bir `divergence` etiketi döndürür; bunu hem
   * `/me/foxy/positioning/:coin` hem de Right Now signal engine
   * tüketir.
   *
   * Period default 1h çünkü Right Now zaten 5m/15m/1h üzerinden bakıyor
   * ve bu method TF-blind cross-source bağlam veriyor — daha kısa
   * pencerede oran daha gürültülü.
   */
  async positioningByCoin(
    coinInput: string,
    period: '5m' | '15m' | '1h' = '1h',
  ): Promise<FoxyPositioning> {
    const symbol = normalizeCoinName(coinInput);
    const bare = symbol.replace(/USDT$/i, '');
    const [topRow, retailRow] = await Promise.all([
      this.fetchPositionRatio('topLongShortPositionRatio', symbol, period).catch(
        () => null,
      ),
      this.fetchPositionRatio('globalLongShortAccountRatio', symbol, period).catch(
        () => null,
      ),
    ]);

    const top = topRow
      ? {
          long_pct: topRow.long,
          short_pct: topRow.short,
          ratio: topRow.long / Math.max(0.0001, topRow.short),
        }
      : null;
    const retail = retailRow
      ? {
          long_pct: retailRow.long,
          short_pct: retailRow.short,
          ratio: retailRow.long / Math.max(0.0001, retailRow.short),
        }
      : null;

    const spread =
      top && retail ? round(top.long_pct - retail.long_pct, 4) : null;

    const divergence = classifyDivergence(top, retail, spread);

    return {
      coin: bare,
      period,
      ts: topRow?.ts ?? retailRow?.ts ?? Date.now(),
      retail,
      top_traders: top,
      spread,
      divergence,
    };
  }

  /**
   * Single-shot fetcher used by both top and retail position ratio.
   * Both endpoints have the same response shape, so the call site
   * just picks which path to hit.
   */
  private async fetchPositionRatio(
    path: 'topLongShortPositionRatio' | 'globalLongShortAccountRatio',
    symbol: string,
    period: string,
  ): Promise<{ long: number; short: number; ts: number } | null> {
    const url = `https://fapi.binance.com/futures/data/${path}?symbol=${encodeURIComponent(symbol)}&period=${period}&limit=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const json = (await res.json()) as Array<{
      longAccount?: string;
      shortAccount?: string;
      longPosition?: string;
      shortPosition?: string;
      timestamp?: number;
    }>;
    const first = Array.isArray(json) ? json[0] : null;
    if (!first) return null;
    // The two endpoints use slightly different field names — the
    // position-ratio endpoint emits longPosition/shortPosition, the
    // account-ratio one emits longAccount/shortAccount.
    const long = Number(first.longAccount ?? first.longPosition ?? 0);
    const short = Number(first.shortAccount ?? first.shortPosition ?? 0);
    if (!Number.isFinite(long) || !Number.isFinite(short)) return null;
    if (long <= 0 && short <= 0) return null;
    return { long, short, ts: Number(first.timestamp ?? Date.now()) };
  }

  /**
   * The /home/foxy "Analiz et" button hits this. We:
   *   1. Resolve the viewer's tier and check the weekly quota
   *      (5 free / 100 trial / 100 premium per ISO-week).
   *   2. Fetch the same data the cards already show (setups,
   *      derivatives, whales) — they cache server-side, so this is
   *      essentially free even on a cold cache.
   *   3. Hand the bundle + the user's prompt to Claude with a
   *      tightly-scoped Turkish system prompt.
   *   4. Insert a row in `foxy_query_log` so the next call sees
   *      this query in its weekly count.
   * Quota is enforced in step 1; we throw 403 with the latest
   * counter so the UI can render an "upgrade" CTA instead of a
   * generic error.
   */
  async query(
    viewer: AuthedUser,
    prompt: string,
    coinHint?: string | null,
  ): Promise<FoxyQueryReply> {
    const ent = await this.entitlement.forUser(viewer);
    const userId = await this.resolveViewerId(viewer);
    const limit = quotaLimitFor(ent);

    const quota = await this.currentQuota(userId, limit);
    if (quota.used >= quota.limit) {
      throw new ForbiddenException({
        code: 'FOXY_QUOTA_EXCEEDED',
        message:
          ent.tier === 'free'
            ? 'Bu hafta 5 ücretsiz Foxy sorgunu tamamladın. Premium ile daha fazla sor.'
            : 'Bu hafta Foxy sorgu limitine ulaştın.',
        quota,
        entitlement: ent,
      });
    }

    // Coin resolution is scoped to OKX's full tradable universe, not a
    // curated table — anything OKX lists should be askable. We trust the
    // client's hint only when it's a real OKX coin, otherwise resolve
    // straight from the prompt text (handles lowercase tickers, full
    // names, and coins the frontend doesn't know).
    const universe = await this.okxUniverse().catch(() => new Set<string>());
    const hinted = coinHint
      ? normalizeCoinName(coinHint).replace(/USDT$/i, '').toUpperCase()
      : '';
    let coinNorm: string | null = null;
    if (hinted && (universe.size === 0 || universe.has(hinted))) {
      coinNorm = hinted;
    }
    if (!coinNorm) {
      coinNorm = resolveCoinFromPrompt(prompt, universe);
    }

    // Pull the same context the cards do PLUS the live spot market —
    // without current price, Claude was treating stale setup
    // entry/stop levels as the active price band (May 2026 incident:
    // setups frozen at $81-83K targets while BTC was actually at $77K).
    // Each call independently degrades to null/empty; we still send
    // the prompt to Claude even if some sources are down.
    const [setups, derivatives, whales, market, orderbook, signal, zones] =
      await Promise.all([
        coinNorm
          ? this.setupsByCoin(coinNorm).catch(() => null)
          : Promise.resolve(null),
        coinNorm
          ? this.derivativesByCoin(coinNorm).catch(() => null)
          : Promise.resolve(null),
        coinNorm
          ? this.whalesByCoin(coinNorm).catch(() => null)
          : Promise.resolve(null),
        coinNorm
          ? this.fetchMarket24h(`${coinNorm}USDT`).catch(() => null)
          : Promise.resolve(null),
        coinNorm
          ? this.compoundOrderBook(coinNorm).catch(() => null)
          : Promise.resolve(null),
        coinNorm
          ? this.scalpSignal(coinNorm).catch(() => null)
          : Promise.resolve(null),
        coinNorm
          ? this.confluenceZones(coinNorm).catch(() => null)
          : Promise.resolve(null),
      ]);

    // AI failure must not take the board down — every other panel is
    // live data the user can trade on. Degrade to the offline analysis
    // and log why.
    const analysis = this.client
      ? await this.askClaudeForVerdict(
          prompt,
          coinNorm,
          market,
          setups,
          derivatives,
          whales,
          signal,
          zones,
          orderbook,
        ).catch((err) => {
          this.log.warn(
            { err: (err as Error).message, coin: coinNorm },
            'foxy verdict failed — serving offline analysis',
          );
          return foxyOfflineAnalysis();
        })
      : foxyOfflineAnalysis();

    // Log the query last — only successful, non-rate-limited calls
    // count toward the quota. (Claude failures still count to avoid
    // people retrying as a way around the limit.)
    await this.logQuery(userId, prompt, coinNorm, ent.tier).catch((err) =>
      this.log.warn({ err: (err as Error).message }, 'foxy log insert failed'),
    );

    return {
      prompt,
      coin: coinNorm,
      analysis,
      // Surface the bundle the model reasoned over so the UI can render
      // a full decision board next to the verdict.
      market,
      derivatives,
      whales,
      setups,
      orderbook,
      signal,
      quota: {
        ...quota,
        used: quota.used + 1, // reflect the row we just inserted
      },
      entitlement: ent,
    };
  }

  /**
   * Every base symbol OKX lists a USDT spot market for, as an uppercase
   * set (BTC, ETH, JTO, WIF…). Cached hourly so coin resolution can
   * accept anything tradable on OKX, not just a curated table. Returns
   * an empty set if OKX is unreachable — callers degrade gracefully.
   */
  private async okxUniverse(): Promise<Set<string>> {
    const cached = okxUniverseCache;
    if (cached && Date.now() - cached.at < OKX_UNIVERSE_TTL_MS) {
      return cached.set;
    }
    try {
      const rows = await okxClient.publicGet<
        Array<{ baseCcy?: string; quoteCcy?: string; state?: string }>
      >('/api/v5/public/instruments?instType=SPOT');
      const set = new Set<string>();
      for (const r of rows) {
        if (r.quoteCcy === 'USDT' && r.baseCcy && r.state === 'live') {
          set.add(r.baseCcy.toUpperCase());
        }
      }
      if (set.size > 0) {
        okxUniverseCache = { at: Date.now(), set };
        return set;
      }
    } catch (err) {
      this.log.warn(
        { err: (err as Error).message },
        'okx instruments fetch failed — coin resolution degrades to ticker shape',
      );
    }
    return cached?.set ?? new Set<string>();
  }

  /**
   * Compound "canlı tahta" — an aggregated order book stitched from up to
   * five exchanges (OKX, Binance, Bybit, Bitget, Coinbase). Each book is
   * fetched in parallel from the venue's public REST endpoint (no auth);
   * exchanges that don't list the coin or time out are skipped. Levels
   * are bucketed to a price tick and summed across venues so the ladder
   * reflects true market-wide depth, with best bid/ask taken across all
   * venues. Returns null only when no exchange responded.
   */
  async compoundOrderBook(coinInput: string): Promise<FoxyOrderBook | null> {
    const key = normalizeCoinName(coinInput).replace(/USDT$/i, '');
    const cached = orderbookCache.get(key);
    if (cached && Date.now() - cached.at < ORDERBOOK_TTL_MS) return cached.value;
    const value = await this.buildOrderBook(coinInput);
    orderbookCache.set(key, { at: Date.now(), value });
    return value;
  }

  /**
   * Foxy's own 5-15 minute scalp signal. Everything numeric is computed
   * deterministically off OKX 5m candles — ATR sets the stop distance,
   * R-multiples set the take-profits — so the levels can never be an LLM
   * hallucination. Direction is a transparent confluence score across
   * trend (EMA9/EMA21), momentum (RSI), live order-book imbalance and
   * funding. When nothing lines up the direction is NONE — an honest
   * "no clean scalp right now, wait for a signal".
   */
  async scalpSignal(coinInput: string): Promise<FoxyScalpSignal | null> {
    const coin = normalizeCoinName(coinInput).replace(/USDT$/i, '').toUpperCase();
    const candles = await this.fetchOkxCandles(coin, '5m', 120).catch(() => null);
    if (!candles || candles.length < 40) return null;

    const closes = candles.map((c) => c.close);
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const price = closes[closes.length - 1] ?? 0;
    if (!Number.isFinite(price) || price <= 0) return null;

    const emaFast = computeEma(closes, 9);
    const emaSlow = computeEma(closes, 21);
    const rsi = computeRsi(closes, 14);
    const atr = computeAtr(highs, lows, closes, 14);

    // Reuse the board's live sources; both degrade to neutral on failure.
    const [ob, deriv] = await Promise.all([
      this.compoundOrderBook(coin).catch(() => null),
      this.derivativesByCoin(coin).catch(() => null),
    ]);
    const obImb = orderBookImbalance(ob); // −1 (asks) … +1 (bids)
    const funding = deriv?.funding?.rate ?? null;

    // Confluence score — positive leans long, negative leans short.
    let score = 0;
    const reasons: string[] = [];
    let trend: 'up' | 'down' | 'flat' = 'flat';
    if (emaFast != null && emaSlow != null) {
      if (emaFast > emaSlow && price > emaFast) {
        trend = 'up';
        score += 2;
        reasons.push("Kısa vade trend yukarı — fiyat EMA9 ve EMA21'in üstünde");
      } else if (emaFast < emaSlow && price < emaFast) {
        trend = 'down';
        score -= 2;
        reasons.push("Kısa vade trend aşağı — fiyat EMA9 ve EMA21'in altında");
      }
    }
    if (rsi != null) {
      if (rsi >= 55 && rsi < 72) {
        score += 1;
        if (trend !== 'down') reasons.push(`RSI ${rsi} — momentum yukarı, henüz aşırı alım değil`);
      } else if (rsi <= 45 && rsi > 28) {
        score -= 1;
        if (trend !== 'up') reasons.push(`RSI ${rsi} — momentum aşağı, henüz aşırı satım değil`);
      } else if (rsi >= 72) {
        score -= 0.5; // overbought → fade long conviction
        reasons.push(`RSI ${rsi} — aşırı alımda, yukarısı riskli`);
      } else if (rsi <= 28) {
        score += 0.5;
        reasons.push(`RSI ${rsi} — aşırı satımda, tepki gelebilir`);
      }
    }
    if (obImb != null && Math.abs(obImb) > 0.15) {
      if (obImb > 0) {
        score += 1;
        reasons.push(`Deftere alış baskısı ağır (~%${Math.round((0.5 + obImb / 2) * 100)} alış)`);
      } else {
        score -= 1;
        reasons.push(`Deftere satış baskısı ağır (~%${Math.round((0.5 - obImb / 2) * 100)} satış)`);
      }
    }
    if (funding != null) {
      if (funding > 0.0005 && score > 0)
        reasons.push('Funding pozitif — long taraf kalabalık, stopa sıkı uy');
      else if (funding < -0.0005 && score < 0)
        reasons.push('Funding negatif — short taraf kalabalık, stopa sıkı uy');
    }

    const generated_at = new Date().toISOString();
    const meta = {
      rsi,
      ema_fast: emaFast == null ? null : roundPrice(emaFast, price),
      ema_slow: emaSlow == null ? null : roundPrice(emaSlow, price),
      atr: atr == null ? null : roundPrice(atr, price),
      trend,
      ob_imbalance: obImb == null ? null : Math.round(obImb * 100) / 100,
    };

    const direction: 'LONG' | 'SHORT' | 'NONE' =
      atr != null && atr > 0 && score >= 2 ? 'LONG'
      : atr != null && atr > 0 && score <= -2 ? 'SHORT'
      : 'NONE';

    if (direction === 'NONE' || atr == null) {
      return {
        coin,
        direction: 'NONE',
        timeframe: '5-15 dk',
        price: roundPrice(price, price),
        entry: null,
        entry_zone: null,
        stop: null,
        targets: [],
        risk_per_unit: null,
        rr: null,
        confidence: Math.min(40, Math.round(Math.abs(score) * 15)),
        headline: 'Şu an net bir scalp sinyali yok — sinyal bekle',
        reasons: reasons.length ? reasons : ['Sinyaller karışık; yön verecek konfluans yok'],
        invalidation: "EMA9/EMA21 net ayrışıp fiyat bir tarafa kaçarsa yeni sinyal doğar",
        generated_at,
        meta,
      };
    }

    const long = direction === 'LONG';
    const half = Math.max(atr * 0.1, price * 0.0005);
    const entry = price;
    const entry_zone: [number, number] = [
      roundPrice(entry - half, price),
      roundPrice(entry + half, price),
    ];
    const swingLow = Math.min(...lows.slice(-12));
    const swingHigh = Math.max(...highs.slice(-12));
    const stopRaw = long
      ? Math.min(entry - atr * 1.2, swingLow - atr * 0.1)
      : Math.max(entry + atr * 1.2, swingHigh + atr * 0.1);
    const stop = roundPrice(stopRaw, price);
    const risk = Math.abs(entry - stop);
    // Trade-viability gate. In a volatility squeeze ATR collapses and
    // the mechanically-derived levels get microscopic — an ETH short
    // with a 0.15% 1R needs a ~90% hit rate just to break even after
    // round-trip taker fees (~0.10%) + spread, and the stop sits inside
    // a single 5m candle's wick so noise stop-outs are near-certain.
    // A real scalper doesn't trade a squeeze; neither do we. Floor:
    // 1R must be at least 0.30% of price (≈2.5× round-trip cost).
    const MIN_RISK_PCT = 0.003;
    if (risk <= 0 || stop === roundPrice(entry, price) || risk < price * MIN_RISK_PCT) {
      const riskPct = price > 0 ? (risk / price) * 100 : 0;
      return {
        coin,
        direction: 'NONE',
        timeframe: '5-15 dk',
        price: roundPrice(price, price),
        entry: null,
        entry_zone: null,
        stop: null,
        targets: [],
        risk_per_unit: null,
        rr: null,
        confidence: 0,
        headline: 'Oynaklık çok düşük — işlem maliyeti olası kârı yer, işlem önerilmez',
        reasons: [
          riskPct > 0
            ? `Stop mesafesi sadece %${riskPct.toFixed(2)} — komisyon + makas (~%0.12 gidiş-dönüş) bu darlıkta kârın çoğunu götürür`
            : 'Fiyat hareket aralığı seviye çizemeyecek kadar dar',
          'Bu kadar dar stop tek bir 5 dakikalık mumun fitiliyle gider — gürültüyle stop olma ihtimali çok yüksek',
          'Fiyat sıkışmada; kırılım gelip oynaklık artınca sinyal tekrar açılır',
        ],
        invalidation: '',
        generated_at,
        meta,
      };
    }
    let targets: FoxyScalpTarget[] = [1, 1.6, 2.6].map((m) => {
      const tp = long ? entry + risk * m : entry - risk * m;
      return {
        price: roundPrice(tp, price),
        r: m,
        pct: Math.round(((tp - entry) / entry) * 10000) / 100,
      };
    });

    // Zone-aware targets: if a strong opposing confluence zone sits in
    // the trade's path, price tends to stall there — asking for a TP
    // beyond it is wishful. Clip extended targets to just in front of
    // the zone edge (never below ~1R, so TP1's economics stay intact).
    // confluenceZones is cached 45s, so this poll stays cheap.
    const zonesData = await this.confluenceZones(coin).catch(() => null);
    if (zonesData) {
      const opposing = zonesData.zones
        .filter((z) =>
          long ? z.side === 'supply' && z.low > entry : z.side === 'demand' && z.high < entry,
        )
        .sort((a, b) => (long ? a.low - b.low : b.high - a.high))[0];
      if (opposing) {
        const edge = long ? opposing.low * 0.9995 : opposing.high * 1.0005;
        const edgeFarEnough = long ? edge >= entry + risk : edge <= entry - risk;
        let clipped = false;
        if (edgeFarEnough) {
          for (const t of targets) {
            const beyond = long ? t.price > edge : t.price < edge;
            if (t.r > 1 && beyond) {
              t.price = roundPrice(edge, price);
              t.r = Math.round((Math.abs(t.price - entry) / risk) * 10) / 10;
              t.pct = Math.round(((t.price - entry) / entry) * 10000) / 100;
              clipped = true;
            }
          }
        }
        if (clipped) {
          // Collapsed duplicates (TP2 and TP3 both hitting the edge)
          // render as one level.
          const seen = new Set<number>();
          targets = targets.filter((t) => {
            if (seen.has(t.price)) return false;
            seen.add(t.price);
            return true;
          });
          reasons.push(
            `${long ? 'Üstte güçlü satış' : 'Altta güçlü alım'} bölgesi var (${fmtNum(
              long ? opposing.low : opposing.high,
              price,
            )}) — hedefler bölgenin önüne çekildi`,
          );
        }
      }
    }
    const rr = targets.length ? targets[targets.length - 1]!.r : null;
    const confidence = Math.min(92, 45 + Math.round(Math.abs(score) * 11));
    const dirTr = long ? 'LONG (al)' : 'SHORT (sat)';

    return {
      coin,
      direction,
      timeframe: '5-15 dk',
      price: roundPrice(price, price),
      entry: roundPrice(entry, price),
      entry_zone,
      stop,
      targets,
      risk_per_unit: roundPrice(risk, price),
      rr,
      confidence,
      headline: `${coin} ${dirTr} · giriş ${fmtNum(entry, price)} · stop ${fmtNum(stop, price)} · ilk hedef ${fmtNum(targets[0]!.price, price)}`,
      // 5, not 4 — the zone-clip note (pushed last) must survive the cap.
      reasons: reasons.slice(0, 5),
      invalidation: long
        ? `Fiyat ${fmtNum(stop, price)} altına 5dk kapanış yaparsa setup geçersiz — çık`
        : `Fiyat ${fmtNum(stop, price)} üstüne 5dk kapanış yaparsa setup geçersiz — çık`,
      generated_at,
      meta,
    };
  }

  /**
   * Public candle feed for the board's live chart. Same OKX source the
   * scalp engine computes its levels from, so the chart, the signal
   * card and the order book all describe the same market. Short cache
   * keeps a polling chart from hammering OKX.
   */
  async candles(
    coinInput: string,
    bar: string,
    limit: number,
  ): Promise<{
    coin: string;
    bar: string;
    candles: Array<{ ts: number; open: number; high: number; low: number; close: number }>;
  }> {
    const coin = normalizeCoinName(coinInput).replace(/USDT$/i, '').toUpperCase();
    const key = `${coin}:${bar}:${limit}`;
    const cached = candlesCache.get(key);
    if (cached && Date.now() - cached.at < CANDLES_TTL_MS) return cached.value;
    const rows = await this.fetchOkxCandles(coin, bar, limit);
    const value = { coin, bar, candles: rows };
    candlesCache.set(key, { at: Date.now(), value });
    return value;
  }

  /** OKX candles → oldest-first OHLC rows. `bar` is an OKX interval. */
  private async fetchOkxCandles(
    coin: string,
    bar: string,
    limit: number,
  ): Promise<Array<{ ts: number; open: number; high: number; low: number; close: number }>> {
    const json = await fetchJson<{ data?: string[][] }>(
      `https://www.okx.com/api/v5/market/candles?instId=${encodeURIComponent(`${coin}-USDT`)}&bar=${encodeURIComponent(bar)}&limit=${limit}`,
    );
    const rows = json.data ?? [];
    // OKX returns newest-first; reverse to chronological order.
    return rows
      .map((r) => ({
        ts: Number(r[0]),
        open: Number(r[1]),
        high: Number(r[2]),
        low: Number(r[3]),
        close: Number(r[4]),
      }))
      .filter((c) => Number.isFinite(c.close) && c.close > 0)
      .reverse();
  }

  private async buildOrderBook(coinInput: string): Promise<FoxyOrderBook | null> {
    const symbol = normalizeCoinName(coinInput).replace(/USDT$/i, '');
    const pair = `${symbol}-USDT`;
    const sym = `${symbol}USDT`;
    const TIMEOUT = 3500;

    const jget = async (url: string): Promise<unknown> => {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    };
    const okxGet = async (): Promise<{ asks: string[][]; bids: string[][] } | null> => {
      try {
        const d = await okxClient.publicGet<
          Array<{ asks: string[][]; bids: string[][] }>
        >(`/api/v5/market/books?instId=${pair}&sz=20`);
        return Array.isArray(d) ? d[0] ?? null : null;
      } catch {
        return null;
      }
    };

    const num = (rows: unknown): Array<[number, number]> =>
      Array.isArray(rows)
        ? (rows as unknown[][])
            .map((r): [number, number] => [Number(r[0]), Number(r[1])])
            .filter((l) => Number.isFinite(l[0]) && Number.isFinite(l[1]))
        : [];

    const [okx, binance, bybit, bitget, coinbase] = await Promise.all([
      okxGet(),
      jget(`https://api.binance.com/api/v3/depth?symbol=${sym}&limit=20`),
      jget(`https://api.bybit.com/v5/market/orderbook?category=spot&symbol=${sym}&limit=25`),
      jget(`https://api.bitget.com/api/v2/spot/market/orderbook?symbol=${sym}&limit=25`),
      jget(`https://api.exchange.coinbase.com/products/${pair}/book?level=2`),
    ]);

    const bn = binance as { asks?: unknown; bids?: unknown } | null;
    const bb = bybit as { result?: { a?: unknown; b?: unknown } } | null;
    const bg = bitget as { data?: { asks?: unknown; bids?: unknown } } | null;
    const cb = coinbase as { asks?: unknown; bids?: unknown } | null;

    const raws: Array<{
      name: string;
      asks: Array<[number, number]>;
      bids: Array<[number, number]>;
    }> = [];
    if (okx) raws.push({ name: 'OKX', asks: num(okx.asks), bids: num(okx.bids) });
    if (bn?.asks) raws.push({ name: 'Binance', asks: num(bn.asks), bids: num(bn.bids) });
    if (bb?.result?.a) raws.push({ name: 'Bybit', asks: num(bb.result.a), bids: num(bb.result.b) });
    if (bg?.data?.asks) raws.push({ name: 'Bitget', asks: num(bg.data.asks), bids: num(bg.data.bids) });
    if (cb?.asks) raws.push({ name: 'Coinbase', asks: num(cb.asks), bids: num(cb.bids) });

    if (raws.length === 0) return null;

    const allBidPx = raws.flatMap((r) => r.bids.map((l) => l[0] as number));
    const allAskPx = raws.flatMap((r) => r.asks.map((l) => l[0] as number));
    if (!allBidPx.length || !allAskPx.length) return null;
    const bestBid = Math.max(...allBidPx);
    const bestAsk = Math.min(...allAskPx);
    const mid = (bestBid + bestAsk) / 2;
    const tick = tickFor(mid);
    const dec = decimalsFor(tick);
    const round = (n: number) => Number(n.toFixed(dec));
    const bucket = (px: number) => round(Math.round(px / tick) * tick);

    const askMap = new Map<number, number>();
    const bidMap = new Map<number, number>();
    for (const r of raws) {
      for (const [px, sz] of r.asks) {
        const b = bucket(px);
        askMap.set(b, (askMap.get(b) ?? 0) + sz);
      }
      for (const [px, sz] of r.bids) {
        const b = bucket(px);
        bidMap.set(b, (bidMap.get(b) ?? 0) + sz);
      }
    }

    const DEPTH = 8;
    const asks = [...askMap.entries()]
      .map(([px, sz]) => ({ px, sz }))
      .sort((a, b) => a.px - b.px)
      .slice(0, DEPTH);
    const bids = [...bidMap.entries()]
      .map(([px, sz]) => ({ px, sz }))
      .sort((a, b) => b.px - a.px)
      .slice(0, DEPTH);

    const spread = Math.max(0, bestAsk - bestBid);
    return {
      inst_id: pair,
      sources: raws.map((r) => r.name),
      asks,
      bids,
      mid: round(mid),
      spread: round(spread),
      spread_pct: mid > 0 ? (spread / mid) * 100 : 0,
      ts: Date.now(),
    };
  }

  /**
   * Depth profile ("duvar haritası") — where resting orders concentrate
   * around the mid. The ladder shows the top of the book; this pulls
   * DEEP books (hundreds of levels per venue), buckets them into equal
   * % bands within ±RANGE, and flags the disproportionate piles as
   * walls. Public + cached (~2.5s) so the panel can poll.
   */
  async depthProfile(coinInput: string): Promise<FoxyDepthProfile | null> {
    const key = normalizeCoinName(coinInput);
    const cached = depthCache.get(key);
    if (cached && Date.now() - cached.at < DEPTH_TTL_MS) return cached.value;
    const value = await this.buildDepthProfile(coinInput);
    depthCache.set(key, { at: Date.now(), value });
    return value;
  }

  private async buildDepthProfile(coinInput: string): Promise<FoxyDepthProfile | null> {
    const symbol = normalizeCoinName(coinInput).replace(/USDT$/i, '');
    const pair = `${symbol}-USDT`;
    const sym = `${symbol}USDT`;
    const TIMEOUT = 4000;
    // Band ceiling — the ACTUAL band adapts to how deep the venues'
    // books really reach (measured live: BTC spot books span only
    // ±0.1–0.3% even at 400–1000 levels). A fixed ±2.5% band left the
    // outer 90% of buckets empty-for-lack-of-data and made the nearest
    // bucket a permanent fake "wall".
    const RANGE_MAX = 0.025;
    const RANGE_MIN = 0.001;
    const BUCKETS = 18; // per side

    const jget = async (url: string): Promise<unknown> => {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    };
    const okxGet = async (): Promise<{ asks: string[][]; bids: string[][] } | null> => {
      try {
        const d = await okxClient.publicGet<
          Array<{ asks: string[][]; bids: string[][] }>
        >(`/api/v5/market/books?instId=${pair}&sz=400`);
        return Array.isArray(d) ? d[0] ?? null : null;
      } catch {
        return null;
      }
    };
    const num = (rows: unknown): Array<[number, number]> =>
      Array.isArray(rows)
        ? (rows as unknown[][])
            .map((r): [number, number] => [Number(r[0]), Number(r[1])])
            .filter((l) => Number.isFinite(l[0]) && Number.isFinite(l[1]) && l[1] > 0)
        : [];

    const [okx, binance, bybit, bitget, coinbase] = await Promise.all([
      okxGet(),
      jget(`https://api.binance.com/api/v3/depth?symbol=${sym}&limit=500`),
      jget(`https://api.bybit.com/v5/market/orderbook?category=spot&symbol=${sym}&limit=200`),
      jget(`https://api.bitget.com/api/v2/spot/market/orderbook?symbol=${sym}&limit=150`),
      jget(`https://api.exchange.coinbase.com/products/${pair}/book?level=2`),
    ]);

    const bn = binance as { asks?: unknown; bids?: unknown } | null;
    const bb = bybit as { result?: { a?: unknown; b?: unknown } } | null;
    const bg = bitget as { data?: { asks?: unknown; bids?: unknown } } | null;
    const cb = coinbase as { asks?: unknown; bids?: unknown } | null;

    const raws: Array<{
      name: string;
      asks: Array<[number, number]>;
      bids: Array<[number, number]>;
    }> = [];
    if (okx) raws.push({ name: 'OKX', asks: num(okx.asks), bids: num(okx.bids) });
    if (bn?.asks) raws.push({ name: 'Binance', asks: num(bn.asks), bids: num(bn.bids) });
    if (bb?.result?.a) raws.push({ name: 'Bybit', asks: num(bb.result.a), bids: num(bb.result.b) });
    if (bg?.data?.asks) raws.push({ name: 'Bitget', asks: num(bg.data.asks), bids: num(bg.data.bids) });
    if (cb?.asks) raws.push({ name: 'Coinbase', asks: num(cb.asks), bids: num(cb.bids) });
    if (raws.length === 0) return null;

    const allBidPx = raws.flatMap((r) => r.bids.map((l) => l[0] as number));
    const allAskPx = raws.flatMap((r) => r.asks.map((l) => l[0] as number));
    if (!allBidPx.length || !allAskPx.length) return null;
    const mid = (Math.max(...allBidPx) + Math.min(...allAskPx)) / 2;
    if (!Number.isFinite(mid) || mid <= 0) return null;

    // Adaptive band: use the median venue's actual reach per side so
    // the profile only covers price ranges the data genuinely covers.
    // (Median, not min/max — one shallow venue shouldn't clip the band,
    // one deep venue shouldn't stretch it into single-venue territory.)
    const median = (xs: number[]): number => {
      if (!xs.length) return 0;
      const s = [...xs].sort((a, b) => a - b);
      return s[Math.floor(s.length / 2)]!;
    };
    const bidReach = median(
      raws
        .filter((r) => r.bids.length >= 10)
        .map((r) => (mid - Math.min(...r.bids.map((l) => l[0] as number))) / mid),
    );
    const askReach = median(
      raws
        .filter((r) => r.asks.length >= 10)
        .map((r) => (Math.max(...r.asks.map((l) => l[0] as number)) - mid) / mid),
    );
    const range = Math.max(
      RANGE_MIN,
      Math.min(RANGE_MAX, Math.min(bidReach || RANGE_MAX, askReach || RANGE_MAX)),
    );

    const bandWidth = (mid * range) / BUCKETS;
    const bidSize = new Array<number>(BUCKETS).fill(0);
    const askSize = new Array<number>(BUCKETS).fill(0);
    for (const r of raws) {
      for (const [px, sz] of r.bids) {
        const idx = Math.floor((mid - px) / bandWidth);
        if (idx >= 0 && idx < BUCKETS) bidSize[idx] = (bidSize[idx] ?? 0) + sz;
      }
      for (const [px, sz] of r.asks) {
        const idx = Math.floor((px - mid) / bandWidth);
        if (idx >= 0 && idx < BUCKETS) askSize[idx] = (askSize[idx] ?? 0) + sz;
      }
    }

    const mkSide = (sizes: number[], side: 'bid' | 'ask'): FoxyDepthBucket[] => {
      const buckets = sizes.map((size, i) => {
        const off = i * bandWidth;
        const pxNear = side === 'bid' ? mid - off : mid + off;
        const pxFar = side === 'bid' ? mid - off - bandWidth : mid + off + bandWidth;
        const pxLow = Math.min(pxNear, pxFar);
        const pxHigh = Math.max(pxNear, pxFar);
        const pxMid = (pxLow + pxHigh) / 2;
        return {
          px_low: roundPrice(pxLow, mid),
          px_high: roundPrice(pxHigh, mid),
          px_mid: roundPrice(pxMid, mid),
          size: Math.round(size * 1000) / 1000,
          usd: Math.round(size * pxMid),
          strength: 0,
          is_wall: false,
        };
      });
      // Wall baseline = the side's MEDIAN non-empty bucket, not the
      // mean: books naturally pile up near the mid, so a mean-based
      // threshold flags the nearest bucket forever. A wall is a pile
      // ≥3× the typical band AND a meaningful share of the side.
      const nonzero = buckets.filter((b) => b.usd > 0).map((b) => b.usd);
      const base = median(nonzero);
      const total = buckets.reduce((a, b) => a + b.usd, 0);
      for (const b of buckets) {
        b.strength = base > 0 ? Math.round((b.usd / base) * 10) / 10 : 0;
        b.is_wall = base > 0 && b.usd >= base * 3 && b.usd >= total * 0.1;
      }
      return buckets;
    };

    const bids = mkSide(bidSize, 'bid');
    const asks = mkSide(askSize, 'ask');
    const value: FoxyDepthProfile = {
      coin: symbol,
      inst_id: pair,
      sources: raws.map((r) => r.name),
      mid: roundPrice(mid, mid),
      range_pct: Math.round(range * 100 * 100) / 100,
      buckets_per_side: BUCKETS,
      bids,
      asks,
      support_wall: bids.find((b) => b.is_wall) ?? null,
      resistance_wall: asks.find((b) => b.is_wall) ?? null,
      ts: Date.now(),
    };
    return value;
  }

  /**
   * Confluence zones — the "en doğru bölgeler" engine. Pulls candles
   * for 1W/1D/4H/15m/5m, extracts order blocks, unfilled fair value
   * gaps and the most-used EMAs (20/50/200) from each, overlays the
   * live depth walls, and clusters everything into scored buy/sell
   * bands. Higher timeframes weigh more (1W×5 … 5m×1); a zone only
   * publishes when at least two independent factors stack (or one
   * very heavy one). Cached ~45s — the inputs move on candle scale.
   */
  async confluenceZones(coinInput: string): Promise<FoxyConfluence | null> {
    const key = normalizeCoinName(coinInput);
    const cached = zonesCache.get(key);
    if (cached && Date.now() - cached.at < ZONES_TTL_MS) return cached.value;
    // In-flight dedupe: the query flow triggers this concurrently (once
    // directly, once via scalpSignal) — without sharing the build, both
    // fire 5 candle fetches + a deep-book build at the same instant and
    // double the burst against OKX.
    const inflight = zonesInFlight.get(key);
    if (inflight) return inflight;
    const build = this.buildConfluence(coinInput)
      .then((value) => {
        zonesCache.set(key, { at: Date.now(), value });
        return value;
      })
      .finally(() => zonesInFlight.delete(key));
    zonesInFlight.set(key, build);
    return build;
  }

  private async buildConfluence(coinInput: string): Promise<FoxyConfluence | null> {
    const symbol = normalizeCoinName(coinInput).replace(/USDT$/i, '');
    const TFS: Array<{ tf: string; bar: string; limit: number; weight: number }> = [
      { tf: '1W', bar: '1W', limit: 80, weight: 5 },
      { tf: '1D', bar: '1D', limit: 150, weight: 4 },
      { tf: '4H', bar: '4H', limit: 180, weight: 3 },
      { tf: '15m', bar: '15m', limit: 200, weight: 2 },
      { tf: '5m', bar: '5m', limit: 200, weight: 1 },
    ];

    const [candleSets, depth] = await Promise.all([
      Promise.all(
        TFS.map((t) =>
          this.fetchOkxCandles(symbol, t.bar, t.limit).catch(
            () => [] as Array<{ ts: number; open: number; high: number; low: number; close: number }>,
          ),
        ),
      ),
      this.depthProfile(coinInput).catch(() => null),
    ]);

    const m5 = candleSets[TFS.length - 1] ?? [];
    const price = m5.length ? m5[m5.length - 1]!.close : depth?.mid ?? 0;
    if (!Number.isFinite(price) || price <= 0) return null;

    interface RawZone {
      low: number;
      high: number;
      factor: FoxyZoneFactor;
    }
    const raw: RawZone[] = [];
    // Individual factor bands wider than this swallow everything when
    // clustering — clamp around their own mid.
    const MAX_W = price * 0.015;
    const clamp = (low: number, high: number): [number, number] => {
      if (high - low <= MAX_W) return [low, high];
      const mid = (low + high) / 2;
      return [mid - MAX_W / 2, mid + MAX_W / 2];
    };
    const push = (low: number, high: number, factor: FoxyZoneFactor) => {
      if (!Number.isFinite(low) || !Number.isFinite(high) || high <= 0) return;
      const [l, h] = clamp(Math.min(low, high), Math.max(low, high));
      // Only zones near the action matter: ±12% of spot.
      const mid = (l + h) / 2;
      if (Math.abs(mid - price) / price > 0.12) return;
      raw.push({ low: l, high: h, factor });
    };

    const trend: FoxyTfTrend[] = [];
    for (let k = 0; k < TFS.length; k++) {
      const { tf, weight } = TFS[k]!;
      const candles = candleSets[k] ?? [];
      if (candles.length < 30) continue;
      const closes = candles.map((c) => c.close);
      const highs = candles.map((c) => c.high);
      const lows = candles.map((c) => c.low);
      const atr = computeAtr(highs, lows, closes, 14);
      if (!atr || atr <= 0) continue;

      // EMAs — the most-used dynamic S/R levels. Thin band (±0.1%).
      const emas: Record<number, number | null> = { 20: null, 50: null, 200: null };
      for (const p of [20, 50, 200] as const) {
        const v = computeEma(closes, p);
        emas[p] = v;
        if (v != null && v > 0) {
          push(v * 0.999, v * 1.001, {
            kind: 'ema',
            tf,
            detail: `EMA${p} ${tf}`,
            weight,
          });
        }
      }

      // Price-action snapshot for this timeframe — feeds the verdict so
      // it reasons over the actual trend structure, not just a 24h %.
      const last = closes[closes.length - 1] ?? 0;
      const ago20 = closes[closes.length - 21] ?? null;
      const above = (v: number | null | undefined): boolean | null =>
        v != null && v > 0 ? last > v : null;
      const a20 = above(emas[20]);
      const a50 = above(emas[50]);
      const regime: FoxyTfTrend['regime'] =
        a20 === true && a50 === true ? 'up' : a20 === false && a50 === false ? 'down' : 'range';
      trend.push({
        tf,
        regime,
        rsi14: computeRsi(closes, 14),
        above_ema20: a20,
        above_ema50: a50,
        above_ema200: above(emas[200]),
        change20_pct:
          ago20 != null && ago20 > 0
            ? Math.round(((last - ago20) / ago20) * 10000) / 100
            : null,
      });

      for (const ob of findOrderBlocks(candles, atr)) {
        push(ob.low, ob.high, {
          kind: 'order_block',
          tf,
          detail: `${tf} OB`,
          weight: weight * 1.2, // OBs are the strongest PA evidence
        });
      }
      for (const gap of findFairValueGaps(candles)) {
        push(gap.low, gap.high, {
          kind: 'fvg',
          tf,
          detail: `${tf} FVG`,
          weight,
        });
      }
    }

    // Depth walls — live resting liquidity stacked on the technical map.
    if (depth) {
      for (const b of [...depth.bids, ...depth.asks]) {
        if (!b.is_wall) continue;
        push(b.px_low, b.px_high, {
          kind: 'wall',
          tf: 'defter',
          detail: `DUVAR $${(b.usd / 1e6).toFixed(1)}M`,
          weight: 2.5,
        });
      }
    }

    if (raw.length === 0) {
      return { coin: symbol, price: roundPrice(price, price), zones: [], trend, ts: Date.now() };
    }

    // Cluster overlapping bands (0.2% glue) and score by Σ weights.
    // A width cap stops chain-merging: without it, everything hugging
    // the spot price (5m/15m EMAs by definition sit there) fused into
    // one giant "we are here" band with a monster score.
    raw.sort((a, b) => a.low - b.low);
    const GLUE = price * 0.002;
    const MAX_CLUSTER_W = price * 0.012;
    const clusters: Array<{ low: number; high: number; factors: FoxyZoneFactor[] }> = [];
    for (const z of raw) {
      const cur = clusters[clusters.length - 1];
      if (
        cur &&
        z.low <= cur.high + GLUE &&
        Math.max(cur.high, z.high) - Math.min(cur.low, z.low) <= MAX_CLUSTER_W
      ) {
        cur.high = Math.max(cur.high, z.high);
        cur.low = Math.min(cur.low, z.low);
        cur.factors.push(z.factor);
      } else {
        clusters.push({ low: z.low, high: z.high, factors: [z.factor] });
      }
    }

    const zones: FoxyZone[] = clusters
      .map((c) => {
        const mid = (c.low + c.high) / 2;
        const score = Math.round(c.factors.reduce((a, f) => a + f.weight, 0) * 10) / 10;
        return {
          low: roundPrice(c.low, price),
          high: roundPrice(c.high, price),
          mid: roundPrice(mid, price),
          side: (mid < price ? 'demand' : 'supply') as FoxyZone['side'],
          score,
          dist_pct: Math.round(((mid - price) / price) * 10000) / 100,
          factors: c.factors.sort((a, b) => b.weight - a.weight),
        };
      })
      // A zone needs real confluence: ≥2 independent factors, or one
      // factor heavy enough to matter alone (1W/1D order block).
      .filter((z) => z.factors.length >= 2 || z.score >= 4.5)
      // The band containing the current price is "we are here", not a
      // level to place orders at — drop it.
      .filter((z) => !(z.low - price * 0.001 <= price && price <= z.high + price * 0.001));

    const demand = zones
      .filter((z) => z.side === 'demand')
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    const supply = zones
      .filter((z) => z.side === 'supply')
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return {
      coin: symbol,
      price: roundPrice(price, price),
      zones: [...demand, ...supply],
      trend,
      ts: Date.now(),
    };
  }

  /**
   * Auto-generated market briefing across BTC + ETH. Shared response
   * cached server-side for 5 min so the page is cheap to load even
   * under traffic — no Foxy quota consumed. Phase 1 covers BTC and
   * ETH; widen `OVERVIEW_COINS` once the wording proves out.
   */
  async overview(): Promise<FoxyOverview> {
    const cached = overviewCache;
    if (cached && Date.now() - cached.at < OVERVIEW_TTL_MS) {
      return cached.value;
    }

    const assets = await Promise.all(
      OVERVIEW_COINS.map(async (coin) => this.gatherAsset(coin)),
    );

    const ai_briefs = this.client
      ? await this.askClaudeForOverview(assets)
      : assets.map(() => 'Foxy AI anahtarı ayarlı değil. Yöneticiyle iletişime geç.');

    const value: FoxyOverview = {
      assets: assets.map((a, i) => ({
        ...a,
        ai_brief: ai_briefs[i] ?? '',
      })),
      generated_at: new Date().toISOString(),
      cached_for_seconds: Math.floor(OVERVIEW_TTL_MS / 1000),
    };
    overviewCache = { at: Date.now(), value };
    return value;
  }

  private async gatherAsset(coin: string): Promise<{
    coin: string;
    market: FoxyAssetMarket | null;
    derivatives: FoxyDerivatives | null;
    whales: FoxyWhales | null;
  }> {
    const [market, derivatives, whales] = await Promise.all([
      this.fetchMarket24h(`${coin}USDT`).catch(() => null),
      this.derivativesByCoin(coin).catch(() => null),
      this.whalesByCoin(coin).catch(() => null),
    ]);
    return { coin, market, derivatives, whales };
  }

  /**
   * 24h ticker — OKX first, Binance as fallback.
   *
   * Callers pass a Binance-style `<COIN>USDT` symbol. We resolve the
   * price against OKX because the whole Foxy coin universe (and the
   * traders' setups) are OKX-based. Ticker symbols collide across
   * venues: Binance `LITUSDT` is Litentry (~$0.74, effectively dead),
   * while OKX `LIT-USDT` is a different asset at ~$2.05 — pricing an
   * OKX coin off Binance showed a wildly wrong number ("fiyat su an
   * 2.02 lerde"). OKX spot keeps the price consistent with the setups
   * and the compound order book; Binance is only a fallback for coins
   * OKX doesn't list (no collision risk there, since such a coin was
   * never surfaced from the OKX universe).
   */
  private async fetchMarket24h(symbol: string): Promise<FoxyAssetMarket | null> {
    // Strip ALL trailing USDT repetitions — callers pass a mix of bare
    // ("SOL"), pair ("SOLUSDT") and, historically, double-suffixed
    // ("SOLUSDTUSDT") symbols; a single strip left the last of those
    // unresolvable on both venues.
    const base = symbol.replace(/(USDT)+$/i, '').replace(/[-_/]/g, '');
    const okx = await this.fetchMarketOkx(base).catch(() => null);
    if (okx) return okx;
    return this.fetchMarketBinance(`${base}USDT`).catch(() => null);
  }

  /** OKX spot 24h ticker for `<base>-USDT`. */
  private async fetchMarketOkx(base: string): Promise<FoxyAssetMarket | null> {
    const json = await fetchJson<{
      data?: Array<{
        last?: string;
        open24h?: string;
        high24h?: string;
        low24h?: string;
        volCcy24h?: string;
      }>;
    }>(
      `https://www.okx.com/api/v5/market/ticker?instId=${encodeURIComponent(`${base}-USDT`)}`,
    );
    const row = json.data?.[0];
    if (!row) return null;
    const price = Number(row.last ?? 0);
    const open = Number(row.open24h ?? 0);
    if (!Number.isFinite(price) || price <= 0) return null;
    return {
      price,
      change_24h_pct:
        Number.isFinite(open) && open > 0 ? ((price - open) / open) * 100 : 0,
      high_24h: row.high24h == null ? null : Number(row.high24h),
      low_24h: row.low24h == null ? null : Number(row.low24h),
      quote_volume_24h: row.volCcy24h == null ? null : Number(row.volCcy24h),
    };
  }

  /** Binance spot 24h ticker — fallback for coins OKX doesn't list. */
  private async fetchMarketBinance(symbol: string): Promise<FoxyAssetMarket | null> {
    const json = await fetchJson<{
      lastPrice?: string;
      priceChangePercent?: string;
      highPrice?: string;
      lowPrice?: string;
      quoteVolume?: string;
    }>(
      `https://api.binance.com/api/v3/ticker/24hr?symbol=${encodeURIComponent(symbol)}`,
    );
    const price = Number(json.lastPrice ?? 0);
    if (!Number.isFinite(price) || price <= 0) return null;
    return {
      price,
      change_24h_pct: Number(json.priceChangePercent ?? 0),
      high_24h: json.highPrice == null ? null : Number(json.highPrice),
      low_24h: json.lowPrice == null ? null : Number(json.lowPrice),
      quote_volume_24h:
        json.quoteVolume == null ? null : Number(json.quoteVolume),
    };
  }

  /**
   * Single Claude call with both assets bundled — gives the model a
   * chance to draw cross-asset comparisons ('ETH OI yüzdesel olarak
   * BTC'den daha hızlı arttı, beta yüksek') without spending two
   * round-trips. Returns one text block per asset, in the same order
   * they were sent.
   */
  private async askClaudeForOverview(
    assets: Awaited<ReturnType<FoxyService['gatherAsset']>>[],
  ): Promise<string[]> {
    if (!this.client) return assets.map(() => '');

    const context = JSON.stringify(
      assets.map((a) => ({
        coin: a.coin,
        market: a.market,
        derivatives: a.derivatives,
        whales: a.whales
          ? {
              window_hours: a.whales.window_hours,
              total_count: a.whales.total,
              flows: a.whales.flows,
              top: a.whales.transfers.slice(0, 6).map((t) => ({
                from: t.from.name,
                to: t.to.name,
                usd: t.usd_value,
                flow: t.flow,
                ts: t.ts,
              })),
            }
          : null,
      })),
      null,
      2,
    );

    const res = await this.client.messages.create({
      // Sonnet for the daily brief — Haiku tends to recite data instead
      // of synthesise it. Sonnet draws cross-source confluences and
      // resolves conflicting signals (long-heavy positioning vs. whale
      // CEX inflow, etc.) the way a real desk analyst would.
      model: 'claude-sonnet-4-5',
      max_tokens: 2200,
      system: FOXY_OVERVIEW_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            'Aşağıdaki ham verileri kullanarak her coin için ayrı bir',
            'analist yorumu yaz. Şablonu aynen uygula:',
            '',
            '===<COIN>===',
            '<3-4 paragraf Türkçe analiz>',
            '===END===',
            '',
            'Veri tekrar etme — sentez yap. Çelişen sinyalleri',
            'açıkça çöz, regime ne ona karar ver, BTC-ETH arasında',
            'beta kıyası yap (ikisini birlikte değerlendir).',
            '',
            'Veriler:',
            context,
          ].join('\n'),
        },
      ],
    });

    const block = res.content.find((c) => c.type === 'text');
    const text = block && block.type === 'text' ? block.text : '';
    return assets.map((a) => extractBriefSection(text, a.coin));
  }

  private async resolveViewerId(viewer: AuthedUser): Promise<string> {
    if (viewer.kind === 'jwt') return viewer.sub;
    const rows = await this.prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id::text AS id FROM "user" WHERE uid = $1 LIMIT 1`,
      viewer.uid,
    );
    const row = rows[0];
    if (!row) throw new NotFoundException(`Viewer not found for uid ${viewer.uid}`);
    return row.id;
  }

  private async currentQuota(userId: string, limit: number): Promise<FoxyQuotaState> {
    const window = isoWeekStart(new Date());
    const rows = await this.prisma.$queryRawUnsafe<Array<{ n: bigint | number }>>(
      `SELECT COUNT(*)::bigint AS n
         FROM foxy_query_log
        WHERE user_id    = $1::uuid
          AND created_at >= $2::timestamptz`,
      userId,
      window.toISOString(),
    );
    const used = Number(rows[0]?.n ?? 0);
    return {
      used,
      limit,
      window_starts_at: window.toISOString(),
      resets_at: nextIsoWeekStart(window).toISOString(),
    };
  }

  private async logQuery(
    userId: string,
    prompt: string,
    coin: string | null,
    tier: Entitlement['tier'],
  ): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO foxy_query_log (user_id, prompt, coin, tier)
       VALUES ($1::uuid, $2, $3, $4)`,
      userId,
      prompt.slice(0, 2000),
      coin,
      tier,
    );
  }

  /**
   * Sends the per-coin context bundle to Claude and parses back the
   * structured verdict. Always returns a `FoxyAnalysis` — on parse
   * failures we fall back to BEKLE with a generic headline so the UI
   * never has to special-case null analysis.
   */
  private async askClaudeForVerdict(
    prompt: string,
    coin: string | null,
    market: FoxyAssetMarket | null,
    setups: FoxySetupsByCoin | null,
    derivatives: FoxyDerivatives | null,
    whales: FoxyWhales | null,
    signal: FoxyScalpSignal | null,
    zones: FoxyConfluence | null,
    orderbook: FoxyOrderBook | null,
  ): Promise<FoxyAnalysis> {
    if (!this.client) return foxyOfflineAnalysis();

    const now = Date.now();
    const context = JSON.stringify(
      {
        coin,
        // Current spot truth — every other block describes the world
        // around this price. Without it the model defaults to whatever
        // entry/stop levels appear in setups.
        market,
        derivatives,
        whales: whales
          ? {
              window_hours: whales.window_hours,
              min_usd: whales.min_usd,
              total_count: whales.total,
              flows: whales.flows,
              top: whales.transfers.slice(0, 8).map((t) => ({
                from: t.from.name,
                to: t.to.name,
                usd: t.usd_value,
                flow: t.flow,
                ts: t.ts,
              })),
            }
          : null,
        // Foxy's own deterministic scalp signal (EMA/RSI/ATR/order-book
        // confluence). The verdict must not contradict the signal card
        // rendered right below it — if the engine says LONG while the
        // verdict says BEKLE, explain the divergence explicitly (e.g.
        // "kısa vade momentum long ama büyük resim belirsiz").
        foxy_scalp_signal: signal
          ? {
              direction: signal.direction,
              timeframe: signal.timeframe,
              entry: signal.entry,
              stop: signal.stop,
              targets: signal.targets,
              confidence: signal.confidence,
              reasons: signal.reasons,
              meta: signal.meta,
            }
          : null,
        // Multi-timeframe price action — trend regime, EMA alignment,
        // RSI and 20-bar momentum per timeframe. THIS is the primary
        // direction evidence; the 24h % in `market` is just a headline.
        price_action: zones?.trend ?? null,
        // Live aggregated order book: resting-size imbalance over the
        // top levels (−1…+1, positive = bid-heavy) and the spread.
        order_book: orderbook
          ? {
              imbalance: orderBookImbalance(orderbook),
              spread_pct: Math.round(orderbook.spread_pct * 1000) / 1000,
              sources: orderbook.sources,
            }
          : null,
        // Foxy's multi-timeframe confluence map (OB + FVG + EMA +
        // walls). When the verdict suggests a level to enter or wait
        // for, it must reference THESE bands — not an invented number.
        confluence_zones: zones
          ? zones.zones.map((z) => ({
              side: z.side,
              low: z.low,
              high: z.high,
              score: z.score,
              dist_pct: z.dist_pct,
              evidence: z.factors.map((f) => f.detail),
            }))
          : null,
        // Community sentiment from BottomUp traders. Each entry carries
        // its age so a setup opened weeks ago (with price targets that
        // no longer reflect the live market) is visibly stale to the
        // model rather than treated as a fresh active position.
        community_setups: setups
          ? {
              active_count: setups.active.length,
              recent_30d: setups.recent,
              top_active: setups.active.slice(0, 8).map((s) => ({
                trader: s.trader_name,
                position: s.position,
                status: s.status,
                entry: s.entry_value,
                stop: s.stop_value,
                tp1: s.profit_taking_1,
                r: s.r_value,
                created_at: s.created_at?.toISOString() ?? null,
                age_days: s.created_at
                  ? Math.floor((now - s.created_at.getTime()) / 86_400_000)
                  : null,
              })),
            }
          : null,
      },
      null,
      2,
    );

    // Fable 5 for verdict synthesis — the strongest desk-analyst voice
    // and cross-signal reasoning (scalp signal vs whales vs positioning).
    // Fable specifics: thinking is always on (no `thinking` param — an
    // explicit config 400s), so max_tokens must cover thinking + text;
    // `effort: medium` keeps the interactive board snappy; and safety
    // classifiers can decline with stop_reason "refusal", so we declare
    // a server-side fallback to Opus 4.8 — a declined request is re-run
    // on the fallback model inside the same call.
    const res = await this.client.beta.messages.create(
      {
        model: 'claude-fable-5',
        max_tokens: 8000,
        output_config: { effort: 'medium' },
        betas: ['server-side-fallback-2026-06-01'],
        fallbacks: [{ model: 'claude-opus-4-8' }],
        system: FOXY_QUERY_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              `Kullanıcı sorusu: ${prompt}`,
              '',
              'Bağlam (Foxy scalp sinyali, BottomUp setupları, türev verileri, balina hareketleri):',
              context,
              '',
              'Yukarıdaki bağlamı kullanarak istenen JSON formatında yanıt ver.',
            ].join('\n'),
          },
        ],
      },
      // Hard latency budget: without it the SDK waits up to 10 min per
      // attempt with 2 retries — an Anthropic slowdown froze the whole
      // query with the user staring at a spinner. One attempt, 60s;
      // the caller degrades to the offline analysis on failure and the
      // board still renders every live panel.
      { timeout: 60_000, maxRetries: 1 },
    );

    // Whole chain refused (Fable AND the Opus fallback) — degrade to the
    // offline analysis instead of reading an empty content array.
    if (res.stop_reason === 'refusal') return foxyOfflineAnalysis();

    const block = res.content.find((c) => c.type === 'text');
    if (!block || block.type !== 'text') return foxyOfflineAnalysis();

    return parseFoxyAnalysis(block.text);
  }

  private async loadSetup(id: string): Promise<SetupRow | null> {
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT s.id::text AS id, s.coin_name, s.category::text AS category,
              s.position::text AS position, s.order_type::text AS order_type,
              s.entry_value, s.entry_value_end,
              s.stop_value, s.profit_taking_1, s.profit_taking_2, s.profit_taking_3,
              s.r_value, s.created_at, s.status::text AS status,
              u.name AS trader_name
         FROM "setup" s
         LEFT JOIN "user" u ON u.id = s.trader_id
        WHERE s.id = $1::uuid
        LIMIT 1`,
      id,
    );
    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id as string,
      coin_name: r.coin_name as string,
      category: r.category as string,
      position: (r.position as string | null) ?? null,
      order_type: r.order_type as string,
      entry_value: Number(r.entry_value),
      entry_value_end: r.entry_value_end != null ? Number(r.entry_value_end) : null,
      stop_value: r.stop_value != null ? Number(r.stop_value) : null,
      profit_taking_1: r.profit_taking_1 != null ? Number(r.profit_taking_1) : null,
      profit_taking_2: r.profit_taking_2 != null ? Number(r.profit_taking_2) : null,
      profit_taking_3: r.profit_taking_3 != null ? Number(r.profit_taking_3) : null,
      r_value: r.r_value != null ? Number(r.r_value) : null,
      created_at: (r.created_at as Date | null) ?? null,
      status: r.status as string,
      trader_name: (r.trader_name as string | null) ?? null,
    };
  }

  private async fetchMarket(symbol: string): Promise<MarketSnapshot | null> {
    // Binance quotes futures symbols identically on spot for the big pairs.
    // Coin_name in the db is already in BINANCE format (e.g. BTCUSDT, XAUUSDT).
    const price = await fetchJson<{ price: string }>(
      `https://api.binance.com/api/v3/ticker/price?symbol=${encodeURIComponent(symbol)}`,
    );
    const klines = await fetchJson<Array<Array<number | string>>>(
      `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=1h&limit=100`,
    );

    const closes = klines.map((k) => Number(k[4]));
    const rsi = computeRsi(closes, 14);
    const last = closes[closes.length - 1] ?? 0;
    const prev24 = (closes.length >= 24 ? closes[closes.length - 24] : closes[0]) ?? 0;
    const changePct = prev24 ? ((last - prev24) / prev24) * 100 : 0;

    return {
      current_price: Number(price.price),
      rsi_14_1h: rsi,
      change_24h_pct: changePct,
    };
  }

  private async askClaude(setup: SetupRow, market: MarketSnapshot | null): Promise<FoxyVerdict> {
    if (!this.client) return this.fallback(setup, market);

    const prompt = buildPrompt(setup, market);
    const res = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: FOXY_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const block = res.content.find((c) => c.type === 'text');
    if (!block || block.type !== 'text') return this.fallback(setup, market);

    try {
      // Model usually returns raw JSON; trim any fencing just in case.
      const text = block.text.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');
      const parsed = JSON.parse(text) as FoxyVerdict;
      return {
        risk_score: clampPct(parsed.risk_score),
        verdict: parsed.verdict === 'TP_LIKELY' || parsed.verdict === 'STOP_LIKELY'
          ? parsed.verdict
          : 'NEUTRAL',
        confidence: clampPct(parsed.confidence),
        comment: String(parsed.comment ?? '').slice(0, 280),
      };
    } catch (err) {
      this.log.warn({ err: (err as Error).message, raw: block.text.slice(0, 200) }, 'foxy parse failed');
      return this.fallback(setup, market);
    }
  }

  private fallback(setup: SetupRow, market: MarketSnapshot | null): FoxyVerdict {
    const derived = computeDerived(setup, market);

    if (derived.breakeven_stop) {
      return {
        risk_score: 15,
        verdict: 'TP_LIKELY',
        confidence: 70,
        comment:
          'Stop girişe çekilmiş, pozisyon şu an risksiz — kaybetmeden TP1 hedefine gidiyor.',
      };
    }

    const price = market?.current_price ?? setup.entry_value;
    const isLong = setup.position === 'long';
    const stop = setup.stop_value ?? (isLong ? setup.entry_value * 0.97 : setup.entry_value * 1.03);
    const tp1 = setup.profit_taking_1 ?? (isLong ? setup.entry_value * 1.05 : setup.entry_value * 0.95);

    const toStop = Math.abs(price - stop);
    const toTp = Math.abs(price - tp1);
    const ratio = toStop / (toTp + toStop);
    const trendAlign = market ? (isLong ? market.change_24h_pct : -market.change_24h_pct) : 0;

    let risk = 50 - (ratio - 0.5) * 80;
    risk -= Math.max(-20, Math.min(20, trendAlign));
    risk = Math.max(0, Math.min(100, Math.round(risk)));

    const verdict: FoxyVerdict['verdict'] =
      risk < 35 ? 'TP_LIKELY' : risk > 65 ? 'STOP_LIKELY' : 'NEUTRAL';

    return {
      risk_score: risk,
      verdict,
      confidence: market ? 55 : 35,
      comment:
        verdict === 'TP_LIKELY'
          ? 'Mesafeler ve son trend tarafında; ilk TP ulaşılabilir görünüyor.'
          : verdict === 'STOP_LIKELY'
            ? 'Stop seviyesi şu anki fiyata yakın; trend de setup yönüyle çelişiyor.'
            : 'Risk-ödül dengeli, piyasa yönü netleşene kadar tedbirli takip mantıklı.',
    };
  }
}

/**
 * Pre-compute structured signals that Claude consistently mishandles when left
 * to raw numbers alone (breakeven stop being the big one). Passed both into
 * the prompt and into the fallback heuristic.
 */
function computeDerived(setup: SetupRow, market: MarketSnapshot | null): {
  is_active: boolean;
  breakeven_stop: boolean;
  in_profit: boolean | null;
  stop_distance_pct: number | null;
  tp1_distance_pct: number | null;
  current_vs_entry_pct: number | null;
} {
  const isLong = setup.position === 'long';
  const entry = setup.entry_value;
  const stop = setup.stop_value;
  const tp1 = setup.profit_taking_1;
  const price = market?.current_price ?? null;

  // Stop within ±0.5% of entry while position is live → breakeven move.
  const breakevenStop =
    setup.status === 'active' &&
    stop != null &&
    entry > 0 &&
    Math.abs(stop - entry) / entry < 0.005;

  const pct = (from: number, to: number): number =>
    Math.round(((to - from) / from) * 10_000) / 100;

  const currentVsEntry = price != null ? pct(entry, price) : null;
  const inProfit =
    price != null
      ? isLong
        ? price > entry
        : price < entry
      : null;
  const stopDistPct =
    price != null && stop != null ? Math.abs(pct(price, stop)) : null;
  const tp1DistPct =
    price != null && tp1 != null ? Math.abs(pct(price, tp1)) : null;

  return {
    is_active: setup.status === 'active',
    breakeven_stop: breakevenStop,
    in_profit: inProfit,
    stop_distance_pct: stopDistPct,
    tp1_distance_pct: tp1DistPct,
    current_vs_entry_pct: currentVsEntry,
  };
}

interface MarketSnapshot {
  current_price: number;
  rsi_14_1h: number | null;
  change_24h_pct: number;
}

const FOXY_SYSTEM_PROMPT = [
  'You are Foxy AI — a concise crypto trade risk evaluator inside the bottomUP app.',
  'You are given a trader-published setup (entry, stop, TPs), its current status, and',
  'a live market snapshot. You judge how likely the first TP will be hit before the stop.',
  '',
  'Conventions you MUST respect (they matter for the score and comment):',
  '',
  "1. status='incoming' means the entry has NOT been filled yet — the order is waiting.",
  "   status='active' means entry was filled, a real position is open right now.",
  '',
  "2. BREAKEVEN STOP. When status='active' AND stop is within ±0.5% of entry, the trader",
  '   has already moved the stop to breakeven. This is RISK REMOVAL, not risk — from the',
  '   current moment downside is ~0 and the remaining question is whether TP1 gets hit or',
  '   the position flatlines out at breakeven. Score this LOW risk (typically ≤25) and',
  '   say so in the comment (e.g. "Stop girişe çekilmiş, pozisyon risksiz — TP1 hedefte").',
  "   Do NOT call a breakeven setup 'risky' just because current price is close to stop.",
  '',
  '3. An active position whose current price has already moved in the setup direction',
  "   is 'in profit' and should bias toward TP_LIKELY with lower risk, regardless of how",
  '   much the stop has been moved.',
  '',
  '4. r_value is the original published R-multiple; after a stop move it overestimates',
  '   remaining risk. Trust the live distances to stop/TP over r_value.',
  '',
  '5. When ambiguous, stay NEUTRAL. Do not invent patterns.',
  '',
  'Output STRICT JSON only. No markdown, no code fences, no preamble.',
  'Schema: { "risk_score": 0-100 (lower=TP likely), "verdict": "TP_LIKELY" | "NEUTRAL" | "STOP_LIKELY",',
  '          "confidence": 0-100, "comment": Turkish 1-2 sentences, no emojis, no markdown }',
].join('\n');

function buildPrompt(setup: SetupRow, market: MarketSnapshot | null): string {
  const setupFmt = {
    symbol: setup.coin_name,
    category: setup.category,
    position: setup.position ?? 'unknown',
    order_type: setup.order_type,
    entry: setup.entry_value,
    entry_high: setup.entry_value_end,
    stop: setup.stop_value,
    tp1: setup.profit_taking_1,
    tp2: setup.profit_taking_2,
    tp3: setup.profit_taking_3,
    r_value: setup.r_value,
    published_at: setup.created_at?.toISOString() ?? null,
    status: setup.status,
    trader: setup.trader_name,
  };

  const derived = computeDerived(setup, market);

  return [
    'Setup:',
    JSON.stringify(setupFmt, null, 2),
    '',
    'Market snapshot (Binance, 1h):',
    market ? JSON.stringify(market, null, 2) : '(unavailable)',
    '',
    'Derived signals (already pre-computed; treat as authoritative):',
    JSON.stringify(derived, null, 2),
    '',
    'Respond with JSON only:',
    '{',
    '  "risk_score": 0-100 (lower = TP likely, higher = stop likely),',
    '  "verdict": "TP_LIKELY" | "NEUTRAL" | "STOP_LIKELY",',
    '  "confidence": 0-100,',
    '  "comment": "Turkish, 1-2 sentences, no markdown"',
    '}',
  ].join('\n');
}

async function fetchJson<T>(url: string): Promise<T> {
  // Hard timeout: without it a single stalled venue connection hangs
  // every Promise.all that awaits it (the /me/foxy/query hang was a
  // stuck upstream socket with no abort). 8s turns a stall into a
  // caught error the callers already degrade on.
  const res = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return (await res.json()) as T;
}

function computeRsi(closes: number[], period: number): number | null {
  if (closes.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = (closes[i] ?? 0) - (closes[i - 1] ?? 0);
    if (d > 0) gains += d;
    else losses -= d;
  }
  gains /= period;
  losses /= period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = (closes[i] ?? 0) - (closes[i - 1] ?? 0);
    gains = (gains * (period - 1) + Math.max(0, d)) / period;
    losses = (losses * (period - 1) + Math.max(0, -d)) / period;
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return Math.round((100 - 100 / (1 + rs)) * 10) / 10;
}

/** Exponential moving average — returns the latest value (or null). */
function computeEma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  // Seed with the SMA of the first `period` values.
  let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i++) {
    ema = (values[i] ?? ema) * k + ema * (1 - k);
  }
  return ema;
}

/** Wilder's ATR over OHLC — returns the latest value (or null). */
function computeAtr(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number,
): number | null {
  const n = closes.length;
  if (n < period + 1) return null;
  const trs: number[] = [];
  for (let i = 1; i < n; i++) {
    const h = highs[i] ?? 0;
    const l = lows[i] ?? 0;
    const pc = closes[i - 1] ?? 0;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  if (trs.length < period) return null;
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + (trs[i] ?? atr)) / period;
  }
  return atr;
}

type OhlcRow = { ts: number; open: number; high: number; low: number; close: number };

/**
 * Order blocks (price-action / SMC): the last opposite-direction candle
 * right before an impulsive move — the footprint of the aggressive
 * player whose leftover orders tend to defend that band on a retest.
 * Detection: a 3-candle move ≥1.5×ATR marks an impulse; the OB is the
 * last counter-candle's BODY at the impulse origin. Only unmitigated
 * blocks survive (price hasn't closed through the far side since), and
 * only the freshest 2 per direction are returned.
 */
function findOrderBlocks(
  candles: OhlcRow[],
  atr: number,
): Array<{ low: number; high: number; dir: 'demand' | 'supply' }> {
  const out: Array<{ low: number; high: number; dir: 'demand' | 'supply'; idx: number }> = [];
  const n = candles.length;
  for (let i = 1; i < n - 3; i++) {
    const move = (candles[i + 3]?.close ?? 0) - (candles[i]?.close ?? 0);
    if (Math.abs(move) < atr * 1.5) continue;
    const wantBearishCandle = move > 0; // demand OB = last red candle before an up-impulse
    const pick = [i, i - 1].find((j) => {
      const c = candles[j];
      if (!c) return false;
      return wantBearishCandle ? c.close < c.open : c.close > c.open;
    });
    if (pick == null) continue;
    const c = candles[pick]!;
    out.push({
      low: Math.min(c.open, c.close),
      high: Math.max(c.open, c.close),
      dir: move > 0 ? 'demand' : 'supply',
      idx: pick,
    });
  }
  // Unmitigated only: no later CLOSE beyond the far side of the block.
  const fresh = out.filter((z) => {
    for (let j = z.idx + 4; j < n; j++) {
      const close = candles[j]?.close ?? 0;
      if (z.dir === 'demand' && close < z.low) return false;
      if (z.dir === 'supply' && close > z.high) return false;
    }
    return true;
  });
  const lastPer = (dir: 'demand' | 'supply') =>
    fresh.filter((z) => z.dir === dir).slice(-2);
  return [...lastPer('demand'), ...lastPer('supply')].map(({ low, high, dir }) => ({
    low,
    high,
    dir,
  }));
}

/**
 * Fair value gaps (imbalances): a 3-candle window where candle 1's
 * high never overlaps candle 3's low (bullish gap) or vice versa —
 * price skipped the band without trading it, and tends to revisit.
 * Only unfilled gaps are returned (price hasn't traded back through),
 * freshest 3 per direction.
 */
function findFairValueGaps(
  candles: OhlcRow[],
): Array<{ low: number; high: number; dir: 'demand' | 'supply' }> {
  const out: Array<{ low: number; high: number; dir: 'demand' | 'supply'; idx: number }> = [];
  const n = candles.length;
  for (let i = 0; i < n - 2; i++) {
    const a = candles[i]!;
    const c = candles[i + 2]!;
    if (a.high < c.low) out.push({ low: a.high, high: c.low, dir: 'demand', idx: i });
    else if (a.low > c.high) out.push({ low: c.high, high: a.low, dir: 'supply', idx: i });
  }
  const fresh = out.filter((z) => {
    for (let j = z.idx + 3; j < n; j++) {
      const cd = candles[j]!;
      // Fully filled when price trades through the entire gap.
      if (z.dir === 'demand' && cd.low <= z.low) return false;
      if (z.dir === 'supply' && cd.high >= z.high) return false;
    }
    return true;
  });
  const lastPer = (dir: 'demand' | 'supply') =>
    fresh.filter((z) => z.dir === dir).slice(-3);
  return [...lastPer('demand'), ...lastPer('supply')].map(({ low, high, dir }) => ({
    low,
    high,
    dir,
  }));
}

/**
 * Order-book pressure over the top levels: (Σbids − Σasks) ÷ (Σbids +
 * Σasks), in −1 … +1. Positive = more resting bid size (buyers), which
 * leans the scalp long. Uses the top 15 aggregated levels a side.
 */
function orderBookImbalance(ob: FoxyOrderBook | null): number | null {
  if (!ob) return null;
  const bidSz = ob.bids.slice(0, 15).reduce((a, l) => a + (l.sz || 0), 0);
  const askSz = ob.asks.slice(0, 15).reduce((a, l) => a + (l.sz || 0), 0);
  const tot = bidSz + askSz;
  if (tot <= 0) return null;
  return (bidSz - askSz) / tot;
}

/**
 * Round a price to a sane number of decimals for its magnitude. Micro-
 * caps go by SIGNIFICANT digits, not a fixed decimal count — SHIB at
 * $0.0000043 needs 10 decimals or entry/stop/TP all collapse onto the
 * same number (and SATS at ~$4e-8 rounds to a flat 0).
 */
function roundPrice(value: number, ref: number): number {
  if (!Number.isFinite(value)) return 0;
  const a = Math.abs(ref);
  if (a <= 0) return value;
  const dp =
    a >= 1000 ? 2
    : a >= 100 ? 3
    : a >= 1 ? 4
    : a >= 0.01 ? 5
    // below 1 cent: 4 significant digits, however deep that goes
    : Math.ceil(-Math.log10(a)) + 4;
  const p = Math.pow(10, dp);
  return Math.round(value * p) / p;
}

/** Price → compact display string (used only inside headline/reason text). */
function fmtNum(value: number, ref: number): string {
  return String(roundPrice(value, ref));
}

function clampPct(n: unknown): number {
  const x = Number(n);
  if (!Number.isFinite(x)) return 50;
  return Math.max(0, Math.min(100, Math.round(x)));
}

function round(x: number, dp: number): number {
  if (!Number.isFinite(x)) return 0;
  const p = Math.pow(10, dp);
  return Math.round(x * p) / p;
}

/**
 * Bucket the smart-vs-retail spread into one of seven interpretive
 * states. Thresholds are intentionally generous around `neutral` so
 * we don't flip on every tick — divergence only fires when the gap
 * is meaningfully wider than 10 percentage points.
 */
function classifyDivergence(
  top: { long_pct: number; short_pct: number } | null,
  retail: { long_pct: number; short_pct: number } | null,
  spread: number | null,
): FoxyPositioning['divergence'] {
  if (!top || !retail || spread == null) return 'neutral';
  const topLong = top.long_pct >= 0.55;
  const topShort = top.long_pct <= 0.45;
  const retailLong = retail.long_pct >= 0.55;
  const retailShort = retail.long_pct <= 0.45;

  // Strong divergence: > 10 percentage points spread.
  if (spread >= 0.1) {
    if (retailShort) return 'capitulation_setup';
    return 'smart_bulls';
  }
  if (spread <= -0.1) {
    if (retailLong) return 'top_heavy';
    return 'smart_bears';
  }

  // Aligned regimes — both sides leaning the same way, no divergence.
  if (topLong && retailLong) return 'aligned_long';
  if (topShort && retailShort) return 'aligned_short';
  return 'neutral';
}

/**
 * Accept "ETH", "eth", "ETHUSDT", "eth-usdt", "ETH/USDT" and return
 * "ETHUSDT" — the form the `setup.coin_name` column stores. Falls
 * back to the input uppercased + "USDT" suffix when no recognised
 * suffix is present.
 */
function normalizeCoinName(input: string): string {
  const raw = String(input ?? '').trim().toUpperCase().replace(/[\s/_-]/g, '');
  if (!raw) return '';
  if (raw.endsWith('USDT')) return raw;
  if (raw.endsWith('USD')) return raw + 'T';
  return raw + 'USDT';
}

/** Price-bucket size for the compound order book, scaled to magnitude so
 *  near-identical levels across exchanges merge cleanly. */
function tickFor(mid: number): number {
  if (mid >= 10000) return 1;
  if (mid >= 1000) return 0.5;
  if (mid >= 100) return 0.1;
  if (mid >= 10) return 0.01;
  if (mid >= 1) return 0.001;
  if (mid >= 0.1) return 0.0001;
  if (mid >= 0.01) return 0.00001;
  return 0.000001;
}

/** Decimal places implied by a tick (e.g. 0.001 → 3), capped at 8. */
function decimalsFor(tick: number): number {
  if (tick >= 1) return 0;
  return Math.min(8, Math.ceil(-Math.log10(tick)));
}

/** Cached set of every base symbol OKX lists a USDT spot market for
 *  (e.g. BTC, ETH, JTO, WIF…). Refreshed hourly. */
let okxUniverseCache: { at: number; set: Set<string> } | null = null;
const OKX_UNIVERSE_TTL_MS = 60 * 60 * 1000;

/** Short-lived compound order-book cache. The public endpoint is polled
 *  ~1×/sec per viewer; caching ~900ms means every poll (across all
 *  viewers) shares one 5-exchange fanout instead of hammering them. */
const orderbookCache = new Map<
  string,
  { at: number; value: FoxyOrderBook | null }
>();
const ORDERBOOK_TTL_MS = 900;

/** Confluence-zone cache — five candle fetches + a depth build per
 *  snapshot; inputs move on candle scale, so 45s is plenty fresh. */
const zonesCache = new Map<
  string,
  { at: number; value: FoxyConfluence | null }
>();
const ZONES_TTL_MS = 45_000;
/** Concurrent zone builds for the same coin share one promise. */
const zonesInFlight = new Map<string, Promise<FoxyConfluence | null>>();

/** Depth-profile cache — five deep-book fetches per build, so polling
 *  viewers must share one snapshot. */
const depthCache = new Map<
  string,
  { at: number; value: FoxyDepthProfile | null }
>();
const DEPTH_TTL_MS = 2500;

/** Candle cache for the board's live chart — same rationale as the
 *  order-book cache: many polling viewers share one OKX fetch. */
const candlesCache = new Map<
  string,
  {
    at: number;
    value: {
      coin: string;
      bar: string;
      candles: Array<{ ts: number; open: number; high: number; low: number; close: number }>;
    };
  }
>();
const CANDLES_TTL_MS = 1500;

/** Full-word coin names users type instead of the ticker. */
const COIN_NAME_ALIASES: Record<string, string> = {
  bitcoin: 'BTC',
  ether: 'ETH',
  ethereum: 'ETH',
  solana: 'SOL',
  ripple: 'XRP',
  dogecoin: 'DOGE',
  cardano: 'ADA',
  avalanche: 'AVAX',
  chainlink: 'LINK',
  polygon: 'POL',
  toncoin: 'TON',
  tron: 'TRX',
  jito: 'JTO',
  bonk: 'BONK',
  pepe: 'PEPE',
  shiba: 'SHIB',
  litecoin: 'LTC',
  polkadot: 'DOT',
};

/** Upper-cased tokens that look like tickers but are trading verbs /
 *  fiat / Foxy vocabulary — never a coin even if OKX lists a collision. */
const COIN_STOPWORDS = new Set([
  'AL', 'SAT', 'BEKLE', 'BUY', 'SELL', 'HOLD', 'AI', 'TL', 'USD', 'USDT',
  'USDC', 'FOXY', 'OK', 'VE', 'BU', 'NE', 'MI', 'MU', 'DA', 'DE',
]);

/**
 * Resolve which coin the user means from their free-text prompt, scoped
 * to what OKX actually lists. We scan tokens, first honouring explicit
 * full-word names (bitcoin→BTC), then matching any ticker-shaped token
 * against the live OKX universe. The first hit wins. When the universe
 * is empty (OKX unreachable) we fall back to a generic ticker shape so
 * the request still flows through.
 */
function resolveCoinFromPrompt(prompt: string, universe: Set<string>): string | null {
  const splitter = /[\s,.!?;:()/\\\-_'"]+/;
  const tokens = prompt.split(splitter).filter((t) => t.length > 0);

  for (const tok of tokens) {
    const lower = tok.toLowerCase();
    if (COIN_NAME_ALIASES[lower]) return COIN_NAME_ALIASES[lower];

    const up = tok.toUpperCase();
    if (COIN_STOPWORDS.has(up)) continue;
    if (universe.size > 0) {
      if (universe.has(up)) return up;
    } else if (/^[A-Z][A-Z0-9]{1,9}$/.test(up)) {
      // OKX list unavailable — accept a plausible ticker shape.
      return up;
    }
  }
  return null;
}

/**
 * Bare-symbol → Arkham token slug (matches CoinGecko pricing IDs).
 * Used by the whales endpoint when we need to query Arkham's
 * `/transfers?tokens=…`. Mirrors the coin set we expose on the
 * frontend `coin-extract.ts`. Add new symbols here as we extend the
 * supported list.
 */
/**
 * Coins included on /home/overview. BTC + ETH first per product
 * spec; widen this list once the wording is proven.
 */
const OVERVIEW_COINS = ['BTC', 'ETH'] as const;

const OVERVIEW_TTL_MS = 5 * 60 * 1000;

interface OverviewCacheEntry {
  at: number;
  value: FoxyOverview;
}
let overviewCache: OverviewCacheEntry | null = null;

const FOXY_OVERVIEW_SYSTEM_PROMPT = [
  'Sen Foxy AI — bottomUP\'ın baş market analistisin. Bir hedge fund',
  'sabah meeting\'inde verilen pro brief yazıyorsun: keskin görüşlü,',
  'sentez ağırlıklı, veri tekrarı YOK. Türkçe, profesyonel masa dili.',
  '',
  'Format (her coin için):',
  '  ===<COIN>===',
  '  <3-4 paragraf>',
  '  ===END===',
  '',
  'Yazım felsefesi — bunlar zorunlu:',
  '',
  '1) THESİS-ÖNCE, VERİ-SONRA.',
  '   İlk cümle bir görüş bildirsin, veri değil. KÖTÜ: "OI %3.45',
  '   düşmüş, long ratio %67". İYİ: "ETH long-tarafı şişmiş ama',
  '   destek korunduğu için flush yerine grind-up daha olası — bu',
  '   açıdan satıcılar tetik almakta yavaş kalıyor."',
  '',
  '2) ÇELİŞKİLERİ ÇÖZ, LİSTELEME.',
  '   Sinyal birden fazlaysa hangisinin kazandığını söyle ve neden.',
  '   KÖTÜ: "Long ratio %67 yüksek ama CEX inflow $435M". İYİ:',
  '   "Long ratio yüksek ama whale\'ler hâlâ CEX\'e ETH gönderiyor —',
  '   bu retail euphoria + smart money distribution kombosu, kısa',
  '   vadede top-heavy yapı, 2-3 günlük squeeze riski yüksek."',
  '',
  '3) REGIME OKU. ',
  '   Önce piyasanın hangi rejimde olduğunu söyle: range, trend,',
  '   capitulation, euphoria, accumulation, distribution. Sayılar',
  '   bunu desteklemek için var, baş kahraman değil.',
  '',
  '4) BTC-ETH ARASI BETA KIYASI YAP. ',
  '   ETH cevabında BTC\'yle bağ kur ("BTC dominant, ETH high-beta',
  '   takipçi" / "ETH ayrışıyor, dominance düşüyor"). İki coin tek',
  '   ekranda gösterilecek — bu yüzden okuyucu kıyas görmek istiyor.',
  '',
  '5) İNVALİDASYON NET, NUMARALI.',
  '   Son paragrafta tek bir tactical setup ver: "primary view +',
  '   trigger seviye + invalidation seviye + hedef". Tek cümle, üç',
  '   sayıyla. Örnek: "Primary: 2280 üstü tutulduğu sürece long',
  '   bias, 2342 break ile 2380-2410 aralığı açılır; 2258 kapanışı',
  '   teze son verir, altında 2210 likidite havuzuna iner."',
  '',
  '6) OI ↔ FİYAT REJİMİ MUTLAKA OKU.',
  '   OI 24h % ile fiyat 24h % değişimini karşılaştır. 4 olası durum:',
  '     • OI↑ + Fiyat↑ → taze long para, sağlıklı uptrend (devam yanlısı)',
  '     • OI↑ + Fiyat↓ → taze short açılıyor, downtrend confirmation',
  '     • OI↓ + Fiyat↑ → short squeeze / unwind, weak rally, sürdürülemez',
  '     • OI↓ + Fiyat↓ → long capitulation / exhaustion, dip yakınsama',
  '   Bu okumayı paragraflarından birinde mutlaka net olarak geçir —',
  '   yön sinyalinden çoğu zaman daha bilgilendirici. KÖTÜ: "OI %3',
  '   düştü, fiyat yükseldi" (sadece veri tekrarı). İYİ: "OI %3 düşmesine',
  '   rağmen fiyat %2 yükseldi — bu klasik short squeeze yapısı, yeni',
  '   long para görmüyoruz, dolayısıyla rally kalıcı değil."',
  '',
  '7) LIQUIDATION CLUSTER\'LARI EVALÜASYON.',
  '   "Long likidasyon $31M, short $16M" demek yetmez — ne anlama',
  '   geldiğini söyle: "Long\'lar 2x daha çok ezildi, dipte panik',
  '   var; short tarafı boşalmamış, yukarı squeeze fitili intact."',
  '',
  'Kurallar:',
  '  - Markdown / başlık / madde işareti YOK. Düz paragraf.',
  '  - Sayıları lazım olduğu zaman ver, paragrafı sayıyla DOLDURMA.',
  '    İdeal oran: paragraf başına 3-5 spesifik sayı, gerisi yorum.',
  '  - "Yatırım tavsiyesi değildir" YAZMA — frontend ekliyor.',
  '  - "Şahsen ben olsam" / "kesin" / "garanti" / "%100 yükselir"',
  '    kullanma. "Olası", "yüksek ihtimal", "fitili kurulu" gibi',
  '    olasılıklı dil kullan.',
  '  - Bağlamda veri eksikse o kısmı atla — uydurma. ("Whale',
  '     verisi yok") demek bile bilgidir.',
  '  - Emoji yok, ünlem yok. Sakin ve net.',
  '  - Cliché yasağı: "FOMO", "moon", "rocket", "to the moon"',
  '     yasak. "Top-heavy", "absorbe ediyor", "confluence",',
  '     "exhaustion", "accumulation" gibi profesyonel terimler ok.',
].join('\n');

/**
 * Pull a single coin's section out of Claude's combined response.
 * Tolerant to slight format wobble — looks for both "===BTC===" and
 * "===BTC ===" / "===btc===" variants.
 */
function extractBriefSection(text: string, coin: string): string {
  const re = new RegExp(
    `===\\s*${coin}\\s*===([\\s\\S]*?)(?:===\\s*END\\s*===|===\\s*[A-Z]{2,}\\s*===|$)`,
    'i',
  );
  const m = text.match(re);
  if (m && m[1]) return m[1].trim();
  // Fallback: if Claude returned plain prose without delimiters, send
  // the full text on the first asset and an empty string on the rest
  // — prevents both being blank when the model misformats.
  return text.trim();
}

const FOXY_QUERY_SYSTEM_PROMPT = [
  'Sen Foxy AI — bottomUP kripto trading platformunun analist asistanısın.',
  'Kullanıcılar sana bir coin için soru sorar, sen net bir AL / SAT / BEKLE',
  'çağrısı çıkarırsın.',
  '',
  'Sana her zaman 4 bloktan ham veri verilir. ÖNEM SIRASI:',
  '  1. market (BİRİNCİL referans): spot price, 24h değişim %, 24h high/low,',
  '     24h quote volume. Tüm analiz BU FİYAT etrafında kurulur — diğer blokları',
  '     yorumlarken her zaman "şu an fiyat X" gerçeğini başlangıç noktası al.',
  '  2. derivatives: liquidations 24h, open interest + 24h değişim, long/short ratio,',
  '     funding rate (8h + yıllıklandırılmış). Pozisyonlanma ve baskıyı gösterir.',
  '  3. whales: Arkham\'dan son 24 saatteki büyük on-chain transferler ve',
  '     CEX in/out USD akışları. Spot biriktirme / dağıtım sinyali.',
  '  4. community_setups (DESTEKLEYİCİ, kararı bunlara DAYANDIRMA): BottomUp',
  '     trader\'larının açtığı setup\'lar ve son 30 gün performans rollup\'ı.',
  '     Her setup\'ın `age_days` alanı var — 7+ günlük setup\'ların entry/stop/target',
  '     seviyeleri büyük olasılıkla mevcut market.price\'a göre alakasızdır;',
  '     "geçmiş analist görüşü" gibi davran, "şu anki aktif pozisyon" gibi DAVRANMA.',
  '     Setup\'ların entry/stop seviyelerini fiyat tahmini olarak okuma — fiyat',
  '     gerçeği market.price\'tır.',
  '  5. foxy_scalp_signal: Foxy\'nin KENDİ deterministik 5-15 dakikalık scalp',
  '     sinyali (trend + momentum + defter baskısından hesaplanır). Kullanıcı bunu',
  '     senin verdiğin kararın HEMEN ALTINDA ayrı bir kart olarak görür.',
  '  6. confluence_zones: Foxy\'nin çoklu zaman dilimi teknik haritası — emir',
  '     blokları, doldurulmamış fiyat boşlukları, EMA 20/50/200 ve defterdeki',
  '     duvarların çakıştığı puanlanmış alım/satım bantları (kullanıcı bunları',
  '     board\'da "En doğru bölgeler" paneli olarak görür). SEVİYE KURALI:',
  '     kullanıcıya girilecek/beklenecek bir fiyat önerirken BU bantlardan',
  '     birini referans al ("geri çekilme gelirse $X–$Y bandı mantıklı" gibi) —',
  '     kafadan yuvarlak sayı uydurma. Skoru yüksek ve fiyata yakın bant önce.',
  '  7. price_action (YÖN İÇİN BİRİNCİL KANIT): her zaman diliminde (1W/1D/4H/',
  '     15m/5m) trend rejimi (up/down/range = fiyat EMA20+50 üstünde/altında/',
  '     karışık), RSI ve son 20 mumun % değişimi. Yön tahmini BURADAN başlar:',
  '     1D+4H rejimi büyük resmi, 15m+5m momentumu verir. market bloğundaki',
  '     24s %si sadece manşettir — trend yapısı budur.',
  '  8. order_book: beş borsanın toplam defterinde bekleyen emir dengesizliği',
  '     (−1…+1, artı = alıcı tarafı ağır) ve makas. Anlık baskıyı gösterir.',
  '',
  'KATMANLAMA KURALI (çok önemli): Senin verdict\'in POZİSYON görüşüdür (saatler/',
  'günler); foxy_scalp_signal ise 5-15 dakikalık momentum. İkisi farklı ufuklar —',
  'çelişmeleri normaldir ama SESSİZ çelişki yasak:',
  '  • Sinyal LONG/SHORT iken sen BEKLE diyorsan, bir bullet\'ta bunu AÇIKÇA',
  '    katmanla: "Dakikalık momentum şu an [yukarı/aşağı] ama bu sadece çok kısa',
  '    vadeli işlem yapanlar için — pozisyon açmak için yeterli değil" gibi.',
  '  • Kısa vadeli yönü zikrederken hep "şu an / sorgu anında" dilini kullan —',
  '    sinyal canlı güncellenir, senin metnin sabit kalır; kalıcı hüküm verme.',
  '  • Sinyalin entry/stop/hedef rakamlarını kendi metninde TEKRARLAMA — kart',
  '    zaten gösteriyor; sen sadece yön ve bağlam katmanını anlat.',
  '',
  'Eğer market bloku null veya price 0 ise: BEKLE döndür, "anlık fiyat alınamadı"',
  'gerekçesi yaz. Stale community_setups\'larla fiyat üretme.',
  '',
  'KİME YAZIYORSUN: Borsa terminali okumayan, normal bir kullanıcı. Senin işin',
  'bu ham veriyi onun yerine OKUYUP, ne anlama geldiğini ve ne yapması gerektiğini',
  'düz Türkçeyle söylemek. Kullanıcı "funding", "OI", "open interest", "long/short',
  'ratio", "liquidation", "CEX inflow", "long-squeeze", "counter-signal", "basis",',
  '"FOMO", "retail" gibi terimleri BİLMİYOR ve bilmek zorunda değil.',
  '',
  'ÇIKTI FORMATI — sadece geçerli JSON döndür, başka hiçbir şey yazma:',
  '{',
  '  "verdict": "AL" | "SAT" | "BEKLE",',
  '  "bias": "up" | "down" | "neutral",',
  '  "headline": "tek cümle, düz Türkçe, max 100 karakter — jargon YOK",',
  '  "takeaway": "kullanıcıya net seslenen 2-3 cümle: ne yapsın + neden",',
  '  "reasons": ["bullet 1", "bullet 2", "bullet 3", ...],',
  '  "invalidation": "fikrimi ne değiştirir — tek düz cümle"',
  '}',
  '',
  'EN ÖNEMLİ KURAL — JARGON YASAK. Hiçbir alanda İngilizce/teknik terim kullanma.',
  'Her kavramı düz kelimelerle ANLAT, İSİMLENDİRME. Çeviri rehberi:',
  '  • funding negatif        → "düşüşe oynayanlar yükselişe oynayanlara para ödüyor',
  '                              (yani profesyoneller aşağı bekliyor)"',
  '  • funding pozitif/yüksek → "yükselişe oynayanlar o kadar kalabalık ki pozisyonu',
  '                              açık tutmak onlara pahalıya patlıyor"',
  '  • long/short ratio       → "alıcılar mı satıcılar mı kalabalık" (% ile)',
  '  • open interest artıyor  → "piyasaya yeni para/pozisyon giriyor"',
  '  • liquidation            → "zorla kapatılan (patlayan) pozisyonlar"',
  '  • CEX inflow/whale       → "büyük cüzdanların borsaya para sokması/çekmesi"',
  'Sayılar KALSIN (% ve $) — sadece terimlerin adı gitsin.',
  '',
  'Verdict seçim kuralı — BEKLE SENİN VARSAYILANIN DEĞİL. Karar çerçeven:',
  '  1. Önce price_action\'dan büyük resmi oku: 1D ve 4H rejimi aynı yöndeyse',
  '     güçlü bir eğilim var demektir. 15m/5m aynı yönü teyit ediyorsa ve',
  '     order_book dengesizliği + duvarlar o tarafı destekliyorsa → AL ya da',
  '     SAT de. Kanıt hizalıyken BEKLE demek korkaklıktır, analiz değil.',
  '  2. AL → 1D/4H yukarı + kısa vade teyit + defter/derivatives çelişmiyor.',
  '  3. SAT → tersi; kullanıcı elinde tutuyorsa "kârını al / azalt" dilini kullan.',
  '  4. BEKLE → SADECE gerçek çelişki varsa (ör. trend yukarı ama borsalara',
  '     büyük satış girişi var) ya da veri eksikse. BEKLE dediğinde bile:',
  '     • "bias" alanında yönünü söyle (up/down) — kanıtın toplamı hangi tarafa',
  '       yatıksa o. "neutral" sadece kanıt GERÇEKTEN 50/50 ise kullanılır.',
  '     • invalidation\'da hangi tetikleyicinin yönü netleştireceğini yaz.',
  '  5. bias, verdict\'le tutarlı olmalı: AL → up, SAT → down; BEKLE → serbest.',
  '',
  'takeaway kuralları (EN KRİTİK ALAN):',
  '  1. Doğrudan kullanıcıya seslen: "Şu fiyattan alma.", "Kârını almayı düşün.",',
  '     "Acele etme, beklemek mantıklı."',
  '  2. Önce NET aksiyon, sonra tek cümlelik gerekçe — hepsi düz dille.',
  '  3. Mümkünse somut seviye ver ("X doları geçmeden girme").',
  '  4. Asla "yatırım tavsiyesi değildir" gibi ibare ekleme; ama "kesin kazanç"',
  '     vaadi de verme. Olasılık dilinde konuş.',
  '',
  'reasons[] kuralları (en az 3, en fazla 6 bullet):',
  '  1. Her bullet: düz açıklama + ham sayı. Terim adı değil, ANLAMI.',
  '     KÖTÜ:  "OI -4.5%, funding -0.011%"',
  '     İYİ:   "Yükselişe büyük cüzdanlardan giriş yok — 24 saatte sıfır. Ralliyi',
  '             sermaye değil kalabalık taşıyor."',
  '  2. Sayıları daima ver: "24 saatte %33 fırladı", "$0.88\'de", "0 büyük transfer".',
  '  3. Kaynakları birbirine bağla ("büyük para yok + kalabalık alıcı = kırılgan").',
  '  4. İlgili veri YOKSA o sebebi yazma — uydurma, şişirme.',
  '',
  'invalidation kuralı:',
  '  • AL/SAT için: çağrıyı bozan koşulu tek düz cümleyle yaz. Örnek:',
  '    "$0.90 üstünde 4 saat kapanış görürsek bu satış görüşü geçersiz olur".',
  '  • BEKLE için: hangi koşul tarafı netleştirir. Net koşul yoksa boş string.',
  '',
  'Tek bir kez daha: ÇIKTI SADECE JSON. Markdown, açıklama, çevreleyen metin YOK.',
].join('\n');

/**
 * Per-tier weekly Foxy query budget. Free 5 / week per the Phase 1
 * product spec; trial + premium share the same generous bucket
 * until we tune separately.
 */
function quotaLimitFor(ent: Entitlement): number {
  if (ent.tier === 'free') return 5;
  return 100;
}

/** Monday 00:00 UTC of the ISO week the date sits in. */
function isoWeekStart(d: Date): Date {
  const day = (d.getUTCDay() + 6) % 7; // 0 = Monday … 6 = Sunday
  const start = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day, 0, 0, 0, 0),
  );
  return start;
}

function nextIsoWeekStart(weekStart: Date): Date {
  return new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
}

const ARKHAM_SLUG: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  BNB: 'binancecoin',
  XRP: 'ripple',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  AVAX: 'avalanche-2',
  LINK: 'chainlink',
  MATIC: 'matic-network',
  TRX: 'tron',
  TON: 'the-open-network',
};

/**
 * Pulls a `FoxyAnalysis` out of whatever Claude returned. The system
 * prompt asks for raw JSON, but the model sometimes wraps the object
 * in ```json fences or prepends/appends a sentence. We extract the
 * first balanced `{...}` block, validate the verdict enum, and
 * coerce missing fields rather than throwing — the UI only ever has
 * to render an analysis object, never an error state.
 */
function parseFoxyAnalysis(raw: string): FoxyAnalysis {
  const text = raw.trim();

  // Find the outermost { ... } slice.
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return {
      verdict: 'BEKLE',
      headline: text.slice(0, 100) || 'Foxy şu an net bir çağrı çıkaramadı.',
      takeaway: '',
      reasons: [],
      invalidation: '',
      bias: 'neutral',
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return {
      verdict: 'BEKLE',
      headline: 'Foxy cevabı doğru biçimde dönmedi, tekrar dene.',
      takeaway: '',
      reasons: [],
      invalidation: '',
      bias: 'neutral',
    };
  }

  const obj = (parsed ?? {}) as Record<string, unknown>;
  const verdictRaw = String(obj.verdict ?? '').toUpperCase().trim();
  const verdict: FoxyAnalysis['verdict'] =
    verdictRaw === 'AL' || verdictRaw === 'SAT' ? verdictRaw : 'BEKLE';

  const headline = String(obj.headline ?? '').trim() || 'Foxy analizi hazır.';

  const takeaway = String(obj.takeaway ?? '').trim();

  const reasonsArr = Array.isArray(obj.reasons) ? obj.reasons : [];
  const reasons = reasonsArr
    .map((r) => String(r ?? '').trim())
    .filter((r) => r.length > 0)
    .slice(0, 6);

  const invalidation = String(obj.invalidation ?? '').trim();

  const biasRaw = String(obj.bias ?? '').toLowerCase().trim();
  // Verdict pins the bias; the model's own field only decides BEKLE.
  const bias: FoxyAnalysis['bias'] =
    verdict === 'AL'
      ? 'up'
      : verdict === 'SAT'
        ? 'down'
        : biasRaw === 'up' || biasRaw === 'down'
          ? biasRaw
          : 'neutral';

  return { verdict, headline, takeaway, reasons, invalidation, bias };
}

/** Shown when ANTHROPIC_API_KEY is not configured. Keeps the UI
 *  contract identical so the empty path renders the same hero shell. */
function foxyOfflineAnalysis(): FoxyAnalysis {
  return {
    verdict: 'BEKLE',
    headline: 'Foxy AI anahtarı ayarlı değil — yönetici ile iletişime geç.',
    takeaway: '',
    reasons: [],
    invalidation: '',
    bias: 'neutral',
  };
}
