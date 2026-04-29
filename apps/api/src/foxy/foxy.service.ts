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

export interface FoxyQueryReply {
  prompt: string;
  coin: string | null;
  reply: string;
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

    return {
      coin: coinName,
      active: active.map((r) => ({
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
      })),
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
    url.searchParams.set('limit', String(limit));

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

    const transfers: FoxyWhaleTransfer[] = [];
    let cexIn = 0;
    let cexOut = 0;
    let between = 0;
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
      if (toIsCex && !fromIsCex) {
        flow = 'cex_in';
        cexIn += usd;
      } else if (fromIsCex && !toIsCex) {
        flow = 'cex_out';
        cexOut += usd;
      } else {
        between += usd;
      }

      transfers.push({
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

    return {
      coin: symbol,
      window_hours: hours,
      min_usd: minUsd,
      total: Number(json.count ?? transfers.length),
      transfers,
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

    const coin = (coinHint ?? '').trim() || null;
    const coinNorm = coin ? normalizeCoinName(coin).replace(/USDT$/i, '') : null;

    // Pull the same context the cards do. Each call independently
    // degrades to null/empty; we still send the prompt to Claude
    // even if some sources are down.
    const [setups, derivatives, whales] = await Promise.all([
      coinNorm
        ? this.setupsByCoin(coinNorm).catch(() => null)
        : Promise.resolve(null),
      coinNorm
        ? this.derivativesByCoin(coinNorm).catch(() => null)
        : Promise.resolve(null),
      coinNorm
        ? this.whalesByCoin(coinNorm).catch(() => null)
        : Promise.resolve(null),
    ]);

    const reply = this.client
      ? await this.askClaudeForSummary(prompt, coinNorm, setups, derivatives, whales)
      : 'Foxy AI anahtarı ayarlı değil. Yöneticiyle iletişime geç.';

    // Log the query last — only successful, non-rate-limited calls
    // count toward the quota. (Claude failures still count to avoid
    // people retrying as a way around the limit.)
    await this.logQuery(userId, prompt, coinNorm, ent.tier).catch((err) =>
      this.log.warn({ err: (err as Error).message }, 'foxy log insert failed'),
    );

    return {
      prompt,
      coin: coinNorm,
      reply,
      quota: {
        ...quota,
        used: quota.used + 1, // reflect the row we just inserted
      },
      entitlement: ent,
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
   * 24h ticker from Binance spot — public, no key, returns last
   * price + change + day range + quote-volume. Re-uses the existing
   * fetchJson helper.
   */
  private async fetchMarket24h(symbol: string): Promise<FoxyAssetMarket | null> {
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

  private async askClaudeForSummary(
    prompt: string,
    coin: string | null,
    setups: FoxySetupsByCoin | null,
    derivatives: FoxyDerivatives | null,
    whales: FoxyWhales | null,
  ): Promise<string> {
    if (!this.client) return 'Foxy AI offline.';

    const context = JSON.stringify(
      {
        coin,
        setups: setups
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
              })),
            }
          : null,
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
      },
      null,
      2,
    );

    const res = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 900,
      system: FOXY_QUERY_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            `Kullanıcı sorusu: ${prompt}`,
            '',
            'Bağlam (BottomUp setupları, türev verileri, balina hareketleri):',
            context,
            '',
            'Bu bağlamı kullanarak soruyu Türkçe olarak yanıtla.',
          ].join('\n'),
        },
      ],
    });

    const block = res.content.find((c) => c.type === 'text');
    if (!block || block.type !== 'text') {
      return 'Foxy şu an cevap veremedi, biraz sonra tekrar dener misin?';
    }
    return block.text.trim();
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
  const res = await fetch(url, { headers: { accept: 'application/json' } });
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
  'Kullanıcılar sana coin / piyasa durumu hakkında soru sorar.',
  '',
  'Sana her zaman 4 kaynaktan ham veri verilir:',
  '  • setups: BottomUp trader topluluğunun o coinde açtığı setup\'lar +',
  '    son 30 gün performans rollup\'ı (win rate, total R, kapanmış işlem sayısı)',
  '  • derivatives: liquidations 24h, open interest + 24h değişim, long/short ratio,',
  '    funding rate (8h + yıllıklandırılmış)',
  '  • whales: Arkham\'dan son 24 saatteki büyük on-chain transferler ve',
  '    CEX in/out USD akışları',
  '',
  'Cevap kuralları:',
  '  1. Türkçe, konuşma diline yakın, profesyonel ama jargon-ağır olma',
  '  2. 3-5 paragraf max. İlk paragraf bir cümlelik özet/verdict olsun',
  '  3. Sayıları net ver: "$166M Binance girişi", "%34 win rate, +12.4R", "0.012% funding"',
  '  4. Kaynaklar arasında bağlantı kur: "Whale\'ler son 24h\'de $400M ETH\'i CEX\'lere',
  '     yolladı, paralel olarak BottomUp trader\'ları %62 short — alış sinyali zayıf"',
  '  5. Bağlamda ilgili veri YOKSA "veri yetersiz" de, uydurma',
  '  6. Yatırım tavsiyesi verme — "şahsen ben olsam" dilini kullanma',
  '  7. Markdown kullanma — düz paragraflar yeterli, kalın yazıda sadece sayılar olabilir',
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
