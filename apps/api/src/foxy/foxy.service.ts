import { Inject, Injectable, NotFoundException, Logger } from '@nestjs/common';
import type { PrismaClient } from '@bottomup/db';
import Anthropic from '@anthropic-ai/sdk';
import { PRISMA } from '../common/prisma.module.js';

export interface FoxyVerdict {
  risk_score: number;         // 0..100 (0 = low risk)
  verdict: 'TP_LIKELY' | 'NEUTRAL' | 'STOP_LIKELY';
  confidence: number;         // 0..100
  comment: string;            // Turkish, 1-2 sentences
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

  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {
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
      max_tokens: 400,
      system:
        'You are Foxy AI — a concise crypto trade risk evaluator inside the bottomUP app. ' +
        'Given a setup (entry/stop/TP) and a current market snapshot, you judge how likely ' +
        'the first TP is hit before the stop. Respond ONLY with strict JSON matching the schema. ' +
        'Comment is in Turkish, 1-2 sentences, no emojis, no markdown.',
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
    // Deterministic, explainable fallback when Anthropic is unavailable.
    // Scores risk from distance-to-stop vs distance-to-TP and the 24h trend.
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

interface MarketSnapshot {
  current_price: number;
  rsi_14_1h: number | null;
  change_24h_pct: number;
}

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

  return [
    'Setup:',
    JSON.stringify(setupFmt, null, 2),
    '',
    'Market snapshot (Binance, 1h):',
    market ? JSON.stringify(market, null, 2) : '(unavailable)',
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
