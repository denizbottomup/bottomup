/**
 * Deterministic signal engine for Right Now.
 *
 * Inputs the price-action read (per timeframe) and a snapshot of
 * derivatives + whale flow. Emits a triplet { signal, confidence,
 * key_levels } per TF using rule-based confluence scoring — no LLM.
 *
 * The AI overlay (in right-now.service) takes this output verbatim
 * and only adds a Turkish headline + invalidation prose. Keeping
 * the math here means the displayed direction is reproducible and
 * stable even when the LLM call fails or is rate-limited.
 */
import type { PriceActionRead } from './price-action.js';
import type {
  FoxyDerivatives,
  FoxyPositioning,
  FoxyWhales,
} from '../foxy/foxy.service.js';

/**
 * Klasik OI ↔ Price 4-quadrant okuması. Her durum kendi yönlü
 * yorumunu taşır:
 *
 *   bullish_confirmation : OI ↑ + Price ↑  (taze long para, sağlıklı)
 *   bearish_confirmation : OI ↑ + Price ↓  (taze short açılıyor, devam)
 *   short_squeeze        : OI ↓ + Price ↑  (mekanik unwind, weak rally)
 *   long_capitulation    : OI ↓ + Price ↓  (pozisyon kapanıyor, dip yakın)
 *   neutral              : değişimler eşik altında
 */
export type OiPriceRegime =
  | 'bullish_confirmation'
  | 'bearish_confirmation'
  | 'short_squeeze'
  | 'long_capitulation'
  | 'neutral';

const OI_THRESHOLD_PCT = 1.5; // |OI 24h %|
const PRICE_THRESHOLD_PCT = 0.5; // |Price 24h %|

export function classifyOiPriceRegime(
  oi24hPct: number | null,
  price24hPct: number | null,
): OiPriceRegime {
  if (oi24hPct == null || price24hPct == null) return 'neutral';
  if (Math.abs(oi24hPct) < OI_THRESHOLD_PCT) return 'neutral';
  if (Math.abs(price24hPct) < PRICE_THRESHOLD_PCT) return 'neutral';
  if (oi24hPct > 0 && price24hPct > 0) return 'bullish_confirmation';
  if (oi24hPct > 0 && price24hPct < 0) return 'bearish_confirmation';
  if (oi24hPct < 0 && price24hPct > 0) return 'short_squeeze';
  if (oi24hPct < 0 && price24hPct < 0) return 'long_capitulation';
  return 'neutral';
}

export type SignalKind = 'long' | 'short' | 'wait';

export interface KeyLevels {
  /** Suggested entry zone (low → high band). */
  entry_low: number | null;
  entry_high: number | null;
  /** Where the thesis breaks. */
  invalidation: number | null;
  /** First take-profit. */
  target: number | null;
}

export interface TfSignal {
  signal: SignalKind;
  /** [0, 1] — engine's own confluence confidence, NOT a probability. */
  confidence: number;
  /** Score before bucketing — useful for debugging the rule contributions. */
  raw_score: number;
  /** Short factor labels that nudged the call (positive → long bias). */
  factors: Array<{ label: string; weight: number }>;
  key_levels: KeyLevels;
}

export interface SignalContext {
  pa: PriceActionRead;
  derivatives: FoxyDerivatives | null;
  whales: FoxyWhales | null;
  /** Top-trader vs retail long/short kıyası. Cross-source divergence
   *  signal — slow but strong, downweighted on 5m. */
  positioning: FoxyPositioning | null;
  /** Pre-computed by the orchestrator off OI 24h % vs price 24h %.
   *  Asset-level (TF-blind) — same regime applies across all TFs. */
  regime: OiPriceRegime;
  /** Used to prefer whale flow on lower TFs less than higher ones. */
  tf: '5m' | '15m' | '1h';
}

const TF_DERIV_WEIGHT: Record<SignalContext['tf'], number> = {
  '5m': 0.4,
  '15m': 0.7,
  '1h': 1.0,
};

const TF_WHALE_WEIGHT: Record<SignalContext['tf'], number> = {
  // Whale flow is a slow signal — barely useful on 5m, dominant on 1h.
  '5m': 0.2,
  '15m': 0.5,
  '1h': 1.0,
};

const TF_POSITIONING_WEIGHT: Record<SignalContext['tf'], number> = {
  // Positioning divergence is a structural read — meaningful on 1h,
  // muted on 5m where intra-bar noise dominates.
  '5m': 0.3,
  '15m': 0.6,
  '1h': 1.0,
};

export function computeSignal(ctx: SignalContext): TfSignal {
  const factors: TfSignal['factors'] = [];

  // 1) Price action substrate ----------------------------------------
  push(factors, 'trend_score', ctx.pa.trend_score * 0.6);

  if (ctx.pa.ema_aligned === 'up') push(factors, 'EMA stack up', 0.25);
  else if (ctx.pa.ema_aligned === 'down') push(factors, 'EMA stack down', -0.25);

  if (ctx.pa.structure === 'bos_up') push(factors, 'BOS up', 0.3);
  else if (ctx.pa.structure === 'bos_down') push(factors, 'BOS down', -0.3);
  else if (ctx.pa.structure === 'choch_up') push(factors, 'CHOCH up', 0.4);
  else if (ctx.pa.structure === 'choch_down') push(factors, 'CHOCH down', -0.4);

  if (ctx.pa.rsi14 != null) {
    if (ctx.pa.rsi14 >= 70) push(factors, 'RSI overbought', -0.15);
    else if (ctx.pa.rsi14 <= 30) push(factors, 'RSI oversold', 0.15);
    // Mild 50-line bias.
    else if (ctx.pa.rsi14 > 55) push(factors, 'RSI > 55', 0.05);
    else if (ctx.pa.rsi14 < 45) push(factors, 'RSI < 45', -0.05);
  }

  // 2) Derivatives (CoinGlass) ---------------------------------------
  const dwt = TF_DERIV_WEIGHT[ctx.tf];
  if (ctx.derivatives) {
    const d = ctx.derivatives;
    if (d.funding) {
      // Positive funding = longs pay = crowded long → contrarian short.
      const annual = d.funding.annualized_pct;
      if (annual > 50) push(factors, 'Funding crowded long', -0.2 * dwt);
      else if (annual > 20) push(factors, 'Funding leans long', -0.1 * dwt);
      else if (annual < -20) push(factors, 'Funding crowded short', 0.2 * dwt);
      else if (annual < -10) push(factors, 'Funding leans short', 0.1 * dwt);
    }
    if (d.long_short) {
      const ratio = d.long_short.long_ratio / Math.max(0.01, d.long_short.short_ratio);
      // Retail crowded → fade them.
      if (ratio > 3) push(factors, 'L/S retail euphoria', -0.15 * dwt);
      else if (ratio > 2) push(factors, 'L/S long-heavy', -0.08 * dwt);
      else if (ratio < 0.5) push(factors, 'L/S short-heavy', 0.15 * dwt);
      else if (ratio < 0.7) push(factors, 'L/S leans short', 0.08 * dwt);
    }
    // OI direction is consumed via the regime block below; keeping a
    // raw OI factor here too would double-count. We only break it out
    // for extreme moves (|24h| > 8%) as a magnitude amplifier.
    if (d.oi && d.oi.change_24h_pct != null) {
      const oiChg = d.oi.change_24h_pct;
      if (Math.abs(oiChg) > 8) {
        push(
          factors,
          oiChg > 0 ? 'OI surge' : 'OI flush',
          (oiChg > 0 ? 0.05 : 0.05) * dwt,
        );
      }
    }
    if (d.liquidation) {
      const total = d.liquidation.total_24h_usd || 1;
      const longPct = d.liquidation.long_24h_usd / total;
      // Heavy long liq = capitulation flush, often local low.
      if (longPct > 0.7 && total > 50_000_000) push(factors, 'Long capitulation', 0.2 * dwt);
      // Heavy short liq = squeeze, often local high.
      else if (longPct < 0.3 && total > 50_000_000) push(factors, 'Short squeeze', -0.2 * dwt);
    }
  }

  // 3) OI ↔ Price 4-quadrant regime ----------------------------------
  // Bu klasik derivative read; hem yön hem kalite (sürdürülebilirlik)
  // taşır. Magnitude TF'den bağımsız (24h pencere) — yine de TF
  // weight'iyle yumuşatıyoruz çünkü 5m'lik bir hareket 24h regime
  // okumasıyla doğrudan ilişkili olmayabilir.
  switch (ctx.regime) {
    case 'bullish_confirmation':
      push(factors, 'OI↑ + Price↑ confirm', 0.22 * dwt);
      break;
    case 'bearish_confirmation':
      push(factors, 'OI↑ + Price↓ confirm', -0.22 * dwt);
      break;
    case 'short_squeeze':
      // Mekanik rally, sürdürülebilir değil → counter-trend short bias.
      push(factors, 'OI↓ + Price↑ squeeze', -0.18 * dwt);
      break;
    case 'long_capitulation':
      // Pozisyonlar zorla kapanıyor → exhaustion, dip yakınsama.
      push(factors, 'OI↓ + Price↓ capitulation', 0.15 * dwt);
      break;
    default:
      break;
  }

  // 4) Smart-money vs retail (positioning divergence) ----------------
  const pwt = TF_POSITIONING_WEIGHT[ctx.tf];
  if (ctx.positioning) {
    switch (ctx.positioning.divergence) {
      case 'smart_bulls':
        // Top traders long-heavy, retail neutral/short → follow whales.
        push(factors, 'Whales bullish, retail not', 0.25 * pwt);
        break;
      case 'capitulation_setup':
        // Top long, retail capitulating short → squeeze fitili.
        push(factors, 'Retail capitulation + smart long', 0.3 * pwt);
        break;
      case 'top_heavy':
        // Retail long-heavy, whales temkinli → distribution riski.
        push(factors, 'Retail euphoria, smart cautious', -0.25 * pwt);
        break;
      case 'smart_bears':
        push(factors, 'Whales short, retail not', -0.25 * pwt);
        break;
      case 'aligned_long':
        push(factors, 'Crowd long-aligned', -0.05 * pwt);
        break;
      case 'aligned_short':
        push(factors, 'Crowd short-aligned', 0.05 * pwt);
        break;
      default:
        break;
    }
  }

  // 5) Whale flow (Arkham) -------------------------------------------
  const wwt = TF_WHALE_WEIGHT[ctx.tf];
  if (ctx.whales) {
    const f = ctx.whales.flows;
    const net = f.cex_in_usd - f.cex_out_usd;
    const mag = Math.abs(net);
    if (mag > 100_000_000) {
      // > $100M one-way net flow over 24h is a strong signal.
      if (net > 0) push(factors, 'Whales → CEX (sell pressure)', -0.25 * wwt);
      else push(factors, 'Whales ← CEX (accumulation)', 0.25 * wwt);
    } else if (mag > 25_000_000) {
      if (net > 0) push(factors, 'Whales lean → CEX', -0.1 * wwt);
      else push(factors, 'Whales lean ← CEX', 0.1 * wwt);
    }
  }

  // ------------------------------------------------------------------
  const raw = factors.reduce((acc, f) => acc + f.weight, 0);
  const clamped = Math.max(-1, Math.min(1, raw));

  // Bucketing to long/short/wait. The `wait` band is intentionally
  // wide — Right Now should NOT flip into noise. A signal must clear
  // ±0.25 on the underlying confluence to leave neutral.
  const signal: SignalKind = clamped > 0.25 ? 'long' : clamped < -0.25 ? 'short' : 'wait';

  // Confidence is the absolute score scaled into [0, 1] with a small
  // floor — so a confluent setup feels distinct even at 0.4 raw.
  const confidence =
    signal === 'wait' ? Math.max(0, 0.4 - Math.abs(clamped)) : Math.min(1, Math.abs(clamped));

  const key_levels = deriveKeyLevels(signal, ctx);

  return {
    signal,
    confidence: roundNum(confidence, 2),
    raw_score: roundNum(clamped, 3),
    factors: factors
      .slice()
      .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
      .slice(0, 6),
    key_levels,
  };
}

function deriveKeyLevels(
  signal: SignalKind,
  { pa }: SignalContext,
): KeyLevels {
  const last = pa.last;
  const atr = pa.atr14 ?? 0;

  if (signal === 'long') {
    // Prefer bullish OB / FVG as entry zone, fallback to "current ± 0.3 ATR".
    const ob = pa.bullish_ob;
    const fvg = pa.bullish_fvg;
    let lo: number | null = null;
    let hi: number | null = null;
    if (ob && ob.zone_high < last) {
      lo = ob.zone_low;
      hi = ob.zone_high;
    } else if (fvg && fvg.high < last) {
      lo = fvg.low;
      hi = fvg.high;
    } else if (atr > 0) {
      lo = last - atr * 0.3;
      hi = last;
    }
    const inval = pa.last_swing_low?.price ?? (atr > 0 ? last - atr * 1.5 : null);
    const target = atr > 0 ? last + atr * 2 : null;
    return {
      entry_low: round(lo, 4),
      entry_high: round(hi, 4),
      invalidation: round(inval, 4),
      target: round(target, 4),
    };
  }
  if (signal === 'short') {
    const ob = pa.bearish_ob;
    const fvg = pa.bearish_fvg;
    let lo: number | null = null;
    let hi: number | null = null;
    if (ob && ob.zone_low > last) {
      lo = ob.zone_low;
      hi = ob.zone_high;
    } else if (fvg && fvg.low > last) {
      lo = fvg.low;
      hi = fvg.high;
    } else if (atr > 0) {
      lo = last;
      hi = last + atr * 0.3;
    }
    const inval = pa.last_swing_high?.price ?? (atr > 0 ? last + atr * 1.5 : null);
    const target = atr > 0 ? last - atr * 2 : null;
    return {
      entry_low: round(lo, 4),
      entry_high: round(hi, 4),
      invalidation: round(inval, 4),
      target: round(target, 4),
    };
  }
  // wait → just expose the nearest range bounds for the UI to show.
  return {
    entry_low: round(pa.last_swing_low?.price ?? null, 4),
    entry_high: round(pa.last_swing_high?.price ?? null, 4),
    invalidation: null,
    target: null,
  };
}

function push(arr: TfSignal['factors'], label: string, weight: number): void {
  if (Math.abs(weight) < 0.001) return;
  arr.push({ label, weight: roundNum(weight, 3) });
}

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
