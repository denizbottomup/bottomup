/**
 * Binance USDM-futures kline fetcher for the Right Now signal engine.
 *
 * We pull from the perpetual feed (`fapi.binance.com`) on purpose —
 * Right Now is a derivative-aware momentum tool and most of the
 * deriv stack (OI, funding, L/S) is already perp-anchored, so price
 * action read off perp candles keeps everything on the same plane.
 */

export interface Kline {
  /** open time, epoch ms */
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  /** base-asset volume */
  v: number;
}

export type Tf = '5m' | '15m' | '1h' | '4h' | '1d';

const BINANCE_FUTURES = 'https://fapi.binance.com/fapi/v1/klines';

/**
 * Pull `limit` klines for the given symbol/interval. Symbol must be
 * the perp pair, e.g. `BTCUSDT` (no slashes). Limit caps at 200 —
 * that's enough history for EMA(200) to be meaningful and lets the
 * structure scanner walk back through enough swings for BOS/CHOCH.
 */
export async function fetchKlines(
  symbol: string,
  interval: Tf,
  limit = 200,
): Promise<Kline[]> {
  const url = `${BINANCE_FUTURES}?symbol=${encodeURIComponent(symbol)}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`klines ${symbol} ${interval} → HTTP ${res.status}`);
  const raw = (await res.json()) as Array<Array<number | string>>;
  return raw.map((r) => ({
    t: Number(r[0]),
    o: Number(r[1]),
    h: Number(r[2]),
    l: Number(r[3]),
    c: Number(r[4]),
    v: Number(r[5]),
  }));
}
