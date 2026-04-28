import { Inject, Injectable, NotFoundException, Logger } from '@nestjs/common';
import type { PrismaClient } from '@bottomup/db';
import Anthropic from '@anthropic-ai/sdk';
import { PRISMA } from '../common/prisma.module.js';
import { MarketIntelService } from '../market-intel/market-intel.service.js';

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
export class FoxyService {
  private readonly log = new Logger(FoxyService.name);
  private readonly client: Anthropic | null;

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly marketIntel: MarketIntelService,
  ) {
    const key = process.env.ANTHROPIC_API_KEY;
    this.client = key ? new Anthropic({ apiKey: key }) : null;
    if (!this.client) {
      this.log.warn('ANTHROPIC_API_KEY not set — FoxyService will return stub verdicts');
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
