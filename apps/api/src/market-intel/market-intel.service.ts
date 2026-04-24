import { Injectable, Logger } from '@nestjs/common';

export interface FearGreedPoint {
  value: number;
  classification: string;
  ts: number;
}

export interface DominanceSnapshot {
  btc: number;
  eth: number;
  usdt: number | null;
  total_market_cap_usd: number;
  total_volume_usd: number;
  active_cryptos: number;
  ts: number;
}

export interface FundingRateRow {
  symbol: string;
  funding_rate: number;
  mark_price: number;
  next_funding_ts: number;
}

export interface LongShortRow {
  symbol: string;
  long_ratio: number;
  short_ratio: number;
  ts: number;
}

export interface MarketPulse {
  fear_greed: FearGreedPoint | null;
  fear_greed_history: FearGreedPoint[];
  dominance: DominanceSnapshot | null;
  top_funding: FundingRateRow[];
  top_long_short: LongShortRow[];
  liquidation: LiquidationSummary[];
  open_interest: OpenInterestRow[];
}

export interface LiquidationSummary {
  symbol: string;
  long_24h_usd: number;
  short_24h_usd: number;
  total_24h_usd: number;
  total_4h_usd: number;
  total_1h_usd: number;
}

export interface OpenInterestRow {
  symbol: string;
  exchange: string;
  oi_usd: number;
  oi_change_4h_pct: number | null;
  oi_change_24h_pct: number | null;
}

interface CacheSlot<T> {
  value: T;
  expires_at: number;
}

/**
 * Lightweight proxy over free public market data sources. Replaces the
 * CoinGlass calls the mobile app makes directly so we can surface the
 * same widgets server-side without shipping any API keys to the client.
 *
 * Sources:
 *   Fear & Greed  → alternative.me/fng (public, no key)
 *   Dominance     → api.coingecko.com/api/v3/global (public, no key)
 *   Funding rate  → fapi.binance.com/fapi/v1/fundingRate (public, no key)
 *   Long/Short    → fapi.binance.com/futures/data/globalLongShortAccountRatio
 *
 * Every endpoint is cached for 5 minutes in-process; refresh is done
 * lazily on the next request after expiry.
 */
@Injectable()
export class MarketIntelService {
  private readonly log = new Logger(MarketIntelService.name);
  private readonly cache = new Map<string, CacheSlot<unknown>>();
  private readonly TTL_MS = 5 * 60 * 1000;
  private readonly cgKey = process.env.COINGLASS_API_KEY ?? '';
  private readonly cgBase = 'https://open-api-v4.coinglass.com/api';

  private async cg<T>(path: string): Promise<T> {
    if (!this.cgKey) throw new Error('COINGLASS_API_KEY not set');
    const res = await fetch(`${this.cgBase}${path}`, {
      headers: { 'CG-API-KEY': this.cgKey, accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`coinglass ${res.status}`);
    const json = (await res.json()) as { code?: string; msg?: string; data?: T };
    if (json.code !== '0')
      throw new Error(`coinglass ${json.code ?? '?'}: ${json.msg ?? ''}`);
    return json.data as T;
  }

  private async cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const slot = this.cache.get(key) as CacheSlot<T> | undefined;
    if (slot && slot.expires_at > now) return slot.value;
    try {
      const value = await fetcher();
      this.cache.set(key, { value, expires_at: now + this.TTL_MS });
      return value;
    } catch (err) {
      if (slot) {
        this.log.warn(`Using stale ${key}: ${(err as Error).message}`);
        return slot.value;
      }
      throw err;
    }
  }

  async fearGreed(limit = 30): Promise<{
    current: FearGreedPoint | null;
    history: FearGreedPoint[];
  }> {
    const capped = Math.max(1, Math.min(365, Math.floor(limit)));
    const key = `fear_greed:${capped}`;
    return this.cached(key, async () => {
      if (this.cgKey) {
        try {
          const data = await this.cg<{
            data_list?: number[];
            date_list?: string[];
            value?: number[];
            dates?: string[];
          }>(`/index/fear-greed-history`);
          const valuesRaw = data.data_list ?? data.value ?? [];
          const datesRaw = data.date_list ?? data.dates ?? [];
          const points: FearGreedPoint[] = valuesRaw
            .map((v, i) => {
              const value = Number(v);
              const d = datesRaw[i];
              const ts = d ? Date.parse(String(d)) : Date.now() - (valuesRaw.length - 1 - i) * 86400_000;
              return { value, classification: fgClass(value), ts };
            })
            .filter((p) => Number.isFinite(p.value));
          points.sort((a, b) => a.ts - b.ts);
          const history = points.slice(-capped);
          const current = history.length > 0 ? history[history.length - 1]! : null;
          return { current, history };
        } catch (err) {
          this.log.warn(`coinglass fg failed, falling back: ${(err as Error).message}`);
        }
      }
      // Free fallback (alternative.me) when no key is set or CG is down.
      const res = await fetch(
        `https://api.alternative.me/fng/?limit=${capped}`,
        { signal: AbortSignal.timeout(8000) },
      );
      if (!res.ok) throw new Error(`fng ${res.status}`);
      const json = (await res.json()) as {
        data?: Array<{ value: string; value_classification: string; timestamp: string }>;
      };
      const history: FearGreedPoint[] = Array.isArray(json.data)
        ? json.data
            .map((d) => ({
              value: Number(d.value),
              classification: String(d.value_classification ?? ''),
              ts: Number(d.timestamp) * 1000,
            }))
            .filter((d) => Number.isFinite(d.value))
        : [];
      history.sort((a, b) => a.ts - b.ts);
      const current = history.length > 0 ? history[history.length - 1]! : null;
      return { current, history };
    });
  }

  /**
   * 24h liquidation totals per coin across all exchanges. This is the
   * widget mobile shows as "patlama" — long vs short liquidated USD.
   */
  async liquidationSummary(limit = 10): Promise<LiquidationSummary[]> {
    const capped = Math.max(1, Math.min(30, Math.floor(limit)));
    return this.cached(`liq:${capped}`, async () => {
      const data = await this.cg<
        Array<Record<string, unknown>>
      >(`/futures/liquidation/coin-list`);
      const rows: LiquidationSummary[] = data
        .map((r) => ({
          symbol: String(r.symbol ?? ''),
          long_24h_usd: Number(r.long_liquidation_usd_24h ?? 0),
          short_24h_usd: Number(r.short_liquidation_usd_24h ?? 0),
          total_24h_usd: Number(r.liquidation_usd_24h ?? 0),
          total_4h_usd: Number(r.liquidation_usd_4h ?? 0),
          total_1h_usd: Number(r.liquidation_usd_1h ?? 0),
        }))
        .filter((r) => r.symbol && Number.isFinite(r.total_24h_usd));
      rows.sort((a, b) => b.total_24h_usd - a.total_24h_usd);
      return rows.slice(0, capped);
    });
  }

  /**
   * Aggregated open-interest across exchanges per symbol.
   */
  async openInterest(symbols: string[] = ['BTC', 'ETH', 'SOL']): Promise<OpenInterestRow[]> {
    return this.cached(`oi:${symbols.join(',')}`, async () => {
      const results = await Promise.all(
        symbols.map(async (symbol) => {
          try {
            const data = await this.cg<Array<Record<string, unknown>>>(
              `/futures/open-interest/exchange-list?symbol=${encodeURIComponent(symbol)}`,
            );
            const all = data.find((r) => String(r.exchange ?? '') === 'All') ?? data[0];
            if (!all) return null;
            return {
              symbol,
              exchange: String(all.exchange ?? 'All'),
              oi_usd: Number(all.open_interest_usd ?? 0),
              oi_change_4h_pct:
                all.open_interest_change_percent_4h == null
                  ? null
                  : Number(all.open_interest_change_percent_4h),
              oi_change_24h_pct:
                all.open_interest_change_percent_24h == null
                  ? null
                  : Number(all.open_interest_change_percent_24h),
            } satisfies OpenInterestRow;
          } catch {
            return null;
          }
        }),
      );
      return results.filter((r): r is OpenInterestRow => r != null);
    });
  }

  async dominance(): Promise<DominanceSnapshot | null> {
    return this.cached('dominance', async () => {
      const res = await fetch('https://api.coingecko.com/api/v3/global', {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`coingecko ${res.status}`);
      const json = (await res.json()) as {
        data?: {
          market_cap_percentage?: Record<string, number>;
          total_market_cap?: Record<string, number>;
          total_volume?: Record<string, number>;
          active_cryptocurrencies?: number;
          updated_at?: number;
        };
      };
      const d = json.data;
      if (!d) return null;
      const pct = d.market_cap_percentage ?? {};
      return {
        btc: Number(pct.btc ?? 0),
        eth: Number(pct.eth ?? 0),
        usdt: pct.usdt != null ? Number(pct.usdt) : null,
        total_market_cap_usd: Number(d.total_market_cap?.usd ?? 0),
        total_volume_usd: Number(d.total_volume?.usd ?? 0),
        active_cryptos: Number(d.active_cryptocurrencies ?? 0),
        ts: Number(d.updated_at ?? Math.floor(Date.now() / 1000)) * 1000,
      } satisfies DominanceSnapshot;
    });
  }

  async topFundingRates(limit = 10): Promise<FundingRateRow[]> {
    const capped = Math.max(1, Math.min(30, Math.floor(limit)));
    return this.cached(`funding:${capped}`, async () => {
      if (this.cgKey) {
        try {
          const data = await this.cg<
            Array<{
              symbol: string;
              stablecoin_margin_list?: Array<{
                exchange: string;
                funding_rate: number;
                next_funding_time: number;
              }>;
            }>
          >(`/futures/funding-rate/exchange-list`);
          const rows: FundingRateRow[] = [];
          // Reject obvious data errors — anything over 5% per funding
          // interval is either a dying token or a broken exchange feed.
          const SANE_MAX = 0.05;
          for (const coin of data) {
            const binance = coin.stablecoin_margin_list?.find(
              (x) => String(x.exchange).toLowerCase() === 'binance',
            );
            const first = binance ?? coin.stablecoin_margin_list?.[0];
            if (!first) continue;
            const rate = Number(first.funding_rate ?? 0);
            if (!Number.isFinite(rate) || Math.abs(rate) > SANE_MAX) continue;
            rows.push({
              symbol: `${coin.symbol}USDT`,
              funding_rate: rate,
              mark_price: 0,
              next_funding_ts: Number(first.next_funding_time ?? 0),
            });
          }
          rows.sort(
            (a, b) => Math.abs(b.funding_rate) - Math.abs(a.funding_rate),
          );
          return rows.slice(0, capped);
        } catch (err) {
          this.log.warn(`coinglass funding failed, using Binance fallback: ${(err as Error).message}`);
        }
      }
      const symbols = [
        'BTCUSDT',
        'ETHUSDT',
        'SOLUSDT',
        'XRPUSDT',
        'BNBUSDT',
        'DOGEUSDT',
        'TONUSDT',
        'ADAUSDT',
        'AVAXUSDT',
        'LINKUSDT',
        'SUIUSDT',
        'APTUSDT',
        'NEARUSDT',
        'ARBUSDT',
        'OPUSDT',
      ].slice(0, capped + 5);
      const results = await Promise.all(
        symbols.map(async (symbol) => {
          try {
            const res = await fetch(
              `https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}`,
              { signal: AbortSignal.timeout(6000) },
            );
            if (!res.ok) return null;
            const json = (await res.json()) as {
              symbol?: string;
              lastFundingRate?: string;
              markPrice?: string;
              nextFundingTime?: number;
            };
            return {
              symbol: String(json.symbol ?? symbol),
              funding_rate: Number(json.lastFundingRate ?? 0),
              mark_price: Number(json.markPrice ?? 0),
              next_funding_ts: Number(json.nextFundingTime ?? 0),
            } satisfies FundingRateRow;
          } catch {
            return null;
          }
        }),
      );
      const filtered = results.filter(
        (r): r is FundingRateRow => r != null && Number.isFinite(r.funding_rate),
      );
      filtered.sort(
        (a, b) => Math.abs(b.funding_rate) - Math.abs(a.funding_rate),
      );
      return filtered.slice(0, capped);
    });
  }

  async longShort(limit = 8): Promise<LongShortRow[]> {
    const capped = Math.max(1, Math.min(20, Math.floor(limit)));
    return this.cached(`ls:${capped}`, async () => {
      const symbols = [
        'BTCUSDT',
        'ETHUSDT',
        'SOLUSDT',
        'XRPUSDT',
        'BNBUSDT',
        'DOGEUSDT',
        'ADAUSDT',
        'AVAXUSDT',
      ].slice(0, capped);
      const results = await Promise.all(
        symbols.map(async (symbol) => {
          try {
            const res = await fetch(
              `https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=1h&limit=1`,
              { signal: AbortSignal.timeout(6000) },
            );
            if (!res.ok) return null;
            const json = (await res.json()) as Array<{
              symbol?: string;
              longAccount?: string;
              shortAccount?: string;
              timestamp?: number;
            }>;
            const first = Array.isArray(json) ? json[0] : null;
            if (!first) return null;
            return {
              symbol: String(first.symbol ?? symbol),
              long_ratio: Number(first.longAccount ?? 0),
              short_ratio: Number(first.shortAccount ?? 0),
              ts: Number(first.timestamp ?? Date.now()),
            } satisfies LongShortRow;
          } catch {
            return null;
          }
        }),
      );
      return results.filter(
        (r): r is LongShortRow =>
          r != null && Number.isFinite(r.long_ratio) && Number.isFinite(r.short_ratio),
      );
    });
  }

  async pulse(): Promise<MarketPulse> {
    const [fg, dom, fr, ls, liq, oi] = await Promise.all([
      this.fearGreed(14).catch(() => ({ current: null, history: [] })),
      this.dominance().catch(() => null),
      this.topFundingRates(8).catch(() => []),
      this.longShort(6).catch(() => []),
      this.liquidationSummary(6).catch(() => []),
      this.openInterest(['BTC', 'ETH', 'SOL']).catch(() => []),
    ]);
    return {
      fear_greed: fg.current,
      fear_greed_history: fg.history,
      dominance: dom,
      top_funding: fr,
      top_long_short: ls,
      liquidation: liq,
      open_interest: oi,
    };
  }
}

function fgClass(value: number): string {
  if (value >= 75) return 'Extreme Greed';
  if (value >= 55) return 'Greed';
  if (value >= 45) return 'Neutral';
  if (value >= 25) return 'Fear';
  return 'Extreme Fear';
}
