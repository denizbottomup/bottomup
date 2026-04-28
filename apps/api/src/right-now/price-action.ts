/**
 * Pure-function price-action analyzer used by the Right Now signal
 * engine. Takes a window of klines (most recent last) and emits a
 * structured read: market structure, EMA stack, RSI, the latest
 * unmitigated Order Block + Fair Value Gap, and a trend score.
 *
 * Everything here is deterministic and side-effect-free — the
 * signal engine layers economics (funding, OI, whale flow) on top,
 * but the price-action substrate is computed here in isolation so
 * it's straightforward to test and tune without touching the LLM
 * call path.
 */
import type { Kline } from './klines.js';

export interface SwingPoint {
  index: number;
  price: number;
  /** epoch ms */
  ts: number;
  kind: 'high' | 'low';
}

export interface OrderBlock {
  /** Bullish OB: last bearish candle before an impulsive move up. */
  side: 'bullish' | 'bearish';
  /** Body low/high of the OB candle (the zone). */
  zone_low: number;
  zone_high: number;
  ts: number;
}

export interface FvgZone {
  side: 'bullish' | 'bearish';
  /** Gap edges. `low` is always < `high`. */
  low: number;
  high: number;
  ts: number;
}

export type Trend = 'up' | 'down' | 'flat';

export interface PriceActionRead {
  last: number;
  /** Structure score in [-1, +1]. +1 = strong uptrend, −1 = strong downtrend. */
  trend_score: number;
  trend: Trend;
  /** Most recent swing high / low for context. */
  last_swing_high: SwingPoint | null;
  last_swing_low: SwingPoint | null;
  /** Most recent BOS / CHOCH (break of structure / change of character). */
  structure: 'bos_up' | 'bos_down' | 'choch_up' | 'choch_down' | 'none';
  ema20: number | null;
  ema50: number | null;
  ema200: number | null;
  /** True iff price > ema20 > ema50 > ema200 (or the inverse for down). */
  ema_aligned: 'up' | 'down' | 'mixed';
  rsi14: number | null;
  /** Closest unmitigated bullish OB below price + bearish OB above. */
  bullish_ob: OrderBlock | null;
  bearish_ob: OrderBlock | null;
  /** Closest unfilled FVGs. */
  bullish_fvg: FvgZone | null;
  bearish_fvg: FvgZone | null;
  /** ATR(14) — volatility magnitude for sizing/stops. */
  atr14: number | null;
}

export function analyzePriceAction(klines: Kline[]): PriceActionRead {
  const last = klines.at(-1)?.c ?? 0;
  const closes = klines.map((k) => k.c);

  const ema20 = computeEma(closes, 20);
  const ema50 = computeEma(closes, 50);
  const ema200 = computeEma(closes, 200);
  const rsi14 = computeRsi(closes, 14);
  const atr14 = computeAtr(klines, 14);

  const swings = findSwings(klines, 3);
  const lastHigh = swings.filter((s) => s.kind === 'high').at(-1) ?? null;
  const lastLow = swings.filter((s) => s.kind === 'low').at(-1) ?? null;

  const structure = readStructure(swings, last);
  const trendScore = scoreTrend({
    last,
    ema20,
    ema50,
    ema200,
    structure,
  });
  const trend: Trend =
    trendScore > 0.3 ? 'up' : trendScore < -0.3 ? 'down' : 'flat';
  const emaAligned: PriceActionRead['ema_aligned'] =
    ema20 != null && ema50 != null && ema200 != null
      ? last > ema20 && ema20 > ema50 && ema50 > ema200
        ? 'up'
        : last < ema20 && ema20 < ema50 && ema50 < ema200
          ? 'down'
          : 'mixed'
      : 'mixed';

  const { bullish, bearish } = findOrderBlocks(klines, last);
  const fvgs = findFvgs(klines, last);

  return {
    last,
    trend_score: roundNum(trendScore, 3),
    trend,
    last_swing_high: lastHigh,
    last_swing_low: lastLow,
    structure,
    ema20: round(ema20, 4),
    ema50: round(ema50, 4),
    ema200: round(ema200, 4),
    ema_aligned: emaAligned,
    rsi14: rsi14 != null ? round(rsi14, 1) : null,
    bullish_ob: bullish,
    bearish_ob: bearish,
    bullish_fvg: fvgs.bullish,
    bearish_fvg: fvgs.bearish,
    atr14: atr14 != null ? round(atr14, 4) : null,
  };
}

// ---------- indicators ----------

function computeEma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  // Seed with SMA over first `period` values.
  let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i++) {
    ema = (values[i] ?? 0) * k + ema * (1 - k);
  }
  return ema;
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
  return 100 - 100 / (1 + rs);
}

function computeAtr(klines: Kline[], period: number): number | null {
  if (klines.length < period + 1) return null;
  const trs: number[] = [];
  for (let i = 1; i < klines.length; i++) {
    const k = klines[i]!;
    const prev = klines[i - 1]!;
    const tr = Math.max(
      k.h - k.l,
      Math.abs(k.h - prev.c),
      Math.abs(k.l - prev.c),
    );
    trs.push(tr);
  }
  // Wilder's smoothing.
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + (trs[i] ?? 0)) / period;
  }
  return atr;
}

// ---------- structure ----------

/**
 * Pivot-based swing detection. A bar is a swing high if it's the
 * highest within `lookback` bars on each side, and same logic for
 * swing lows. Lookback = 3 keeps it responsive on 5m without becoming
 * noise.
 */
function findSwings(klines: Kline[], lookback: number): SwingPoint[] {
  const out: SwingPoint[] = [];
  for (let i = lookback; i < klines.length - lookback; i++) {
    const bar = klines[i]!;
    let isHigh = true;
    let isLow = true;
    for (let j = 1; j <= lookback; j++) {
      const left = klines[i - j]!;
      const right = klines[i + j]!;
      if (bar.h <= left.h || bar.h <= right.h) isHigh = false;
      if (bar.l >= left.l || bar.l >= right.l) isLow = false;
      if (!isHigh && !isLow) break;
    }
    if (isHigh) {
      out.push({ index: i, price: bar.h, ts: bar.t, kind: 'high' });
    } else if (isLow) {
      out.push({ index: i, price: bar.l, ts: bar.t, kind: 'low' });
    }
  }
  return out;
}

function readStructure(
  swings: SwingPoint[],
  last: number,
): PriceActionRead['structure'] {
  // Need at least 2 highs and 2 lows to read structure.
  const highs = swings.filter((s) => s.kind === 'high');
  const lows = swings.filter((s) => s.kind === 'low');
  if (highs.length < 2 || lows.length < 2) return 'none';
  const h1 = highs.at(-2)!;
  const h2 = highs.at(-1)!;
  const l1 = lows.at(-2)!;
  const l2 = lows.at(-1)!;
  const higherHighs = h2.price > h1.price;
  const higherLows = l2.price > l1.price;
  const lowerHighs = h2.price < h1.price;
  const lowerLows = l2.price < l1.price;

  // BOS = continuation: latest swing in trend direction broken.
  // CHOCH = trend reversal: counter-trend break.
  if (higherHighs && higherLows) {
    return last > h2.price ? 'bos_up' : 'bos_up';
  }
  if (lowerHighs && lowerLows) {
    return last < l2.price ? 'bos_down' : 'bos_down';
  }
  if (higherHighs && lowerLows) {
    return last > h2.price ? 'choch_up' : 'none';
  }
  if (lowerHighs && higherLows) {
    return last < l2.price ? 'choch_down' : 'none';
  }
  return 'none';
}

function scoreTrend({
  last,
  ema20,
  ema50,
  ema200,
  structure,
}: {
  last: number;
  ema20: number | null;
  ema50: number | null;
  ema200: number | null;
  structure: PriceActionRead['structure'];
}): number {
  let score = 0;
  if (ema20 != null && ema50 != null) {
    if (last > ema20) score += 0.15;
    if (last < ema20) score -= 0.15;
    if (ema20 > ema50) score += 0.15;
    if (ema20 < ema50) score -= 0.15;
  }
  if (ema50 != null && ema200 != null) {
    if (ema50 > ema200) score += 0.2;
    if (ema50 < ema200) score -= 0.2;
  }
  if (structure === 'bos_up' || structure === 'choch_up') score += 0.3;
  if (structure === 'bos_down' || structure === 'choch_down') score -= 0.3;
  return Math.max(-1, Math.min(1, score));
}

// ---------- order blocks ----------

/**
 * Naive but effective OB detection: walk back from the latest bar,
 * find the most recent strong impulsive move (≥ 1.5× ATR over 2-3
 * bars), and flag the last opposite-color candle that precedes it.
 * Returns the closest unmitigated OB on each side relative to `last`.
 */
function findOrderBlocks(
  klines: Kline[],
  last: number,
): { bullish: OrderBlock | null; bearish: OrderBlock | null } {
  const atr = computeAtr(klines, 14) ?? 0;
  if (atr === 0 || klines.length < 5) {
    return { bullish: null, bearish: null };
  }

  let bullish: OrderBlock | null = null;
  let bearish: OrderBlock | null = null;

  // Walk from second-most-recent backwards; we need at least 2 bars of
  // forward context to confirm impulse.
  for (let i = klines.length - 4; i >= 1; i--) {
    const bar = klines[i]!;
    const next1 = klines[i + 1]!;
    const next2 = klines[i + 2]!;
    const isBearishCandle = bar.c < bar.o;
    const isBullishCandle = bar.c > bar.o;
    const moveUp = next2.c - bar.c;
    const moveDown = bar.c - next2.c;

    // Bullish OB: bearish candle followed by ≥1.5×ATR upmove.
    if (
      isBearishCandle &&
      moveUp >= atr * 1.5 &&
      next1.c > bar.h /* engulf */ &&
      !bullish &&
      last > bar.l /* still relevant: price above OB */
    ) {
      bullish = {
        side: 'bullish',
        zone_low: Math.min(bar.o, bar.c),
        zone_high: Math.max(bar.o, bar.c),
        ts: bar.t,
      };
    }
    // Bearish OB: bullish candle followed by ≥1.5×ATR downmove.
    if (
      isBullishCandle &&
      moveDown >= atr * 1.5 &&
      next1.c < bar.l &&
      !bearish &&
      last < bar.h
    ) {
      bearish = {
        side: 'bearish',
        zone_low: Math.min(bar.o, bar.c),
        zone_high: Math.max(bar.o, bar.c),
        ts: bar.t,
      };
    }
    if (bullish && bearish) break;
  }
  return { bullish, bearish };
}

// ---------- FVGs ----------

/**
 * Three-bar fair-value gap detector. A bullish FVG exists when the
 * high of bar N is below the low of bar N+2 (price gapped up and
 * left an unfilled void). Returns the closest unfilled gap on each
 * side relative to `last`.
 */
function findFvgs(
  klines: Kline[],
  last: number,
): { bullish: FvgZone | null; bearish: FvgZone | null } {
  let bullish: FvgZone | null = null;
  let bearish: FvgZone | null = null;
  for (let i = klines.length - 3; i >= 0; i--) {
    const a = klines[i]!;
    const c = klines[i + 2]!;
    if (a.h < c.l) {
      // Bullish FVG between a.h and c.l.
      const gapLow = a.h;
      const gapHigh = c.l;
      // Unfilled iff price is currently above the gap.
      if (last > gapHigh && !bullish) {
        bullish = { side: 'bullish', low: gapLow, high: gapHigh, ts: a.t };
      }
    } else if (a.l > c.h) {
      const gapLow = c.h;
      const gapHigh = a.l;
      if (last < gapLow && !bearish) {
        bearish = { side: 'bearish', low: gapLow, high: gapHigh, ts: a.t };
      }
    }
    if (bullish && bearish) break;
  }
  return { bullish, bearish };
}

// ---------- utils ----------

function round(x: number | null, dp: number): number | null {
  if (x == null || !Number.isFinite(x)) return null;
  const p = Math.pow(10, dp);
  return Math.round(x * p) / p;
}

function roundNum(x: number, dp: number): number {
  if (!Number.isFinite(x)) return 0;
  const p = Math.pow(10, dp);
  return Math.round(x * p) / p;
}
