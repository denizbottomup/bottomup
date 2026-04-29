'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://bottomupapi-production.up.railway.app';

const POLL_MS = 60_000;

type SignalKind = 'long' | 'short' | 'wait';
type Tf = '5m' | '15m' | '1h' | '4h' | '1d';

interface KeyLevels {
  entry_low: number | null;
  entry_high: number | null;
  invalidation: number | null;
  target: number | null;
}

interface TfBlock {
  signal: SignalKind;
  confidence: number;
  raw_score: number;
  factors: Array<{ label: string; weight: number }>;
  key_levels: KeyLevels;
  last: number;
  pa: {
    trend: 'up' | 'down' | 'flat';
    structure:
      | 'bos_up'
      | 'bos_down'
      | 'choch_up'
      | 'choch_down'
      | 'none';
    ema_aligned: 'up' | 'down' | 'mixed';
    rsi14: number | null;
  };
}

interface Positioning {
  coin: string;
  retail: { long_pct: number; short_pct: number; ratio: number } | null;
  top_traders: { long_pct: number; short_pct: number; ratio: number } | null;
  spread: number | null;
  divergence:
    | 'smart_bulls'
    | 'smart_bears'
    | 'top_heavy'
    | 'capitulation_setup'
    | 'aligned_long'
    | 'aligned_short'
    | 'neutral';
}

type Regime =
  | 'bullish_confirmation'
  | 'bearish_confirmation'
  | 'short_squeeze'
  | 'long_capitulation'
  | 'neutral';

interface Basis {
  spot_price: number;
  perp_price: number;
  spread_usd: number;
  premium_pct: number;
  bias:
    | 'leveraged_long'
    | 'mild_long'
    | 'neutral'
    | 'mild_short'
    | 'leveraged_short'
    | 'unknown';
}

interface FundingVelocity {
  current_pct: number;
  avg_3d_pct: number;
  slope: number;
  trend: 'rising' | 'falling' | 'stable';
}

interface LiqClusters {
  below: { price: number; notional_usd: number; side: 'long_stops' } | null;
  above: { price: number; notional_usd: number; side: 'short_stops' } | null;
}

interface Etf {
  date: string;
  net_usd_m: number;
  asset: string;
}

interface Vwap {
  vwap: number;
  deviation_pct: number;
  bias:
    | 'extended_long'
    | 'mild_long'
    | 'neutral'
    | 'mild_short'
    | 'extended_short';
}

interface CrossAsset {
  btc_dominance_pct: number;
  eth_dominance_pct: number;
  eth_btc_ratio: number;
  rotation: 'btc_lead' | 'alt_lead' | 'mixed';
}

interface Macro {
  dxy: { price: number; change_pct: number } | null;
  es_futures: { price: number; change_pct: number } | null;
  risk_regime: 'risk_on' | 'risk_off' | 'mixed';
}

interface Coverage {
  source: string;
  ok: boolean;
  age_s: number;
}

interface Flip {
  tf: Tf | 'combined';
  from: SignalKind;
  to: SignalKind;
  at: string;
}

interface Asset {
  coin: string;
  tf_5m: TfBlock | null;
  tf_15m: TfBlock | null;
  tf_1h: TfBlock | null;
  tf_4h: TfBlock | null;
  tf_1d: TfBlock | null;
  combined: SignalKind;
  combined_confidence: number;
  positioning: Positioning | null;
  regime: Regime;
  oi_change_24h_pct: number | null;
  price_change_24h_pct: number | null;
  basis: Basis | null;
  funding_velocity: FundingVelocity | null;
  liq_clusters: LiqClusters;
  etf: Etf | null;
  vwap: Vwap | null;
  flips: Flip[];
  combined_flip: Flip | null;
  ai: {
    big_picture: string;
    tactical_now: string;
    invalidation: string;
    generated_at: string;
  } | null;
}

interface Payload {
  assets: Asset[];
  macro: Macro | null;
  cross_asset: CrossAsset | null;
  coverage: Coverage[];
  computed_at: string;
  ai_at: string | null;
}

/**
 * Right Now V2 — anlık AI yön sinyali. Backend her 60s deterministic
 * tick atar; AI overlay iki katmanlı (15dk yapısal big_picture + 5dk
 * tactical). Sayfa 60s polling ile aynı snapshot'ı yansıtır.
 *
 * Kullanıcı 2 saniyede tüm resmi okuyabilsin diye bilişsel hiyerarşi:
 *   1. Big direction badge + AI big picture (yapısal)
 *   2. AI tactical now + invalidation (anlık)
 *   3. Context strip (regime + basis + funding velocity + ETF + macro)
 *   4. Multi-TF stack (scalp → swing)
 *   5. Smart vs retail strip
 *   6. Liquidation map
 *   7. Recent flips footer
 */
export default function RightNowPage() {
  const { getIdToken } = useAuth();
  const [data, setData] = useState<Payload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const [soundOn, setSoundOn] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('rightnow.sound') === '1';
  });
  const tokenRef = useRef<string | null>(null);
  const lastCombinedRef = useRef<Map<string, SignalKind>>(new Map());

  // Drive tab-title flicker + audio ping when a combined direction flip
  // arrives in the new poll. Only fires the *first* time we observe a
  // change — subsequent polls with the same combined keep things quiet.
  useFlipAlerts(data, lastCombinedRef, soundOn);

  useEffect(() => {
    let alive = true;
    const fetchOnce = async () => {
      try {
        if (!tokenRef.current) tokenRef.current = await getIdToken();
        if (!tokenRef.current) {
          if (alive) {
            setErr('Auth gerekli.');
            setLoading(false);
          }
          return;
        }
        const res = await fetch(`${API_BASE}/me/right-now`, {
          headers: { Authorization: `Bearer ${tokenRef.current}` },
          cache: 'no-store',
        });
        if (res.status === 401) {
          tokenRef.current = null;
          throw new Error('auth refresh');
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as Payload;
        if (alive) {
          setData(json);
          setErr(null);
          setLoading(false);
        }
      } catch (x) {
        if (alive) {
          setErr((x as Error).message);
          setLoading(false);
        }
      }
    };
    void fetchOnce();
    const poll = setInterval(fetchOnce, POLL_MS);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      alive = false;
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [getIdToken]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border px-4 py-4 md:px-8 md:py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="mono-label !text-brand">Right Now · anlık yön</div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight md:text-3xl">
              Şu an piyasada{' '}
              <span className="logo-gradient">ne yapmalı?</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <PushToggle getIdToken={getIdToken} />
            <SoundToggle on={soundOn} setOn={setSoundOn} />
            <FreshnessPill data={data} now={now} />
          </div>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-fg-muted">
          BTC ve ETH için 5dk → 1g zaman dilimlerinde price-action, türev
          verileri, balina akışı, smart vs retail pozisyon, OI/Price
          rejimi, spot/perp basis, funding velocity, ETF flow, VWAP ve
          makro bağlam — tek ekranda. Her 60 saniyede güncellenir;
          kombine yön değiştiğinde flash banner + ses + bildirim ile
          haberin olur.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        <div className="mx-auto max-w-6xl space-y-5">
          {loading ? (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-2">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : err && !data ? (
            <div className="rounded-2xl border border-rose-400/30 bg-rose-500/[0.06] px-5 py-4 text-sm text-rose-200">
              Right Now alınamadı: {err}
            </div>
          ) : data ? (
            <>
              {data.macro || data.cross_asset ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {data.macro ? <MacroBar macro={data.macro} /> : null}
                  {data.cross_asset ? (
                    <CrossAssetBar cross={data.cross_asset} />
                  ) : null}
                </div>
              ) : null}
              {/* Defensive filter: even if a stale API build keeps
                  returning the V2.5 5-coin payload, the UI only shows
                  BTC + ETH until the SOL/BNB/XRP layout proves out. */}
              <AssetGrid
                assets={data.assets.filter(
                  (a) => a.coin === 'BTC' || a.coin === 'ETH',
                )}
              />
              {data.coverage ? <CoverageStrip coverage={data.coverage} /> : null}
            </>
          ) : null}

          <div className="text-[11px] text-fg-dim">
            Right Now bir ticari öneri değildir; deterministic confluence
            skoru + AI sentezi kombinasyonudur. Pozisyon büyüklüğü ve risk
            yönetimi senin sorumluluğunda.
          </div>
        </div>
      </div>
    </div>
  );
}

function FreshnessPill({ data, now }: { data: Payload | null; now: number }) {
  if (!data) return null;
  const computed = new Date(data.computed_at).getTime();
  const ageS = Math.max(0, Math.floor((now - computed) / 1000));
  const stale = ageS > 120;
  return (
    <div
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-mono ${
        stale
          ? 'border-amber-400/30 bg-amber-400/5 text-amber-200'
          : 'border-emerald-400/30 bg-emerald-400/5 text-emerald-200'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          stale ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'
        }`}
      />
      <span>{stale ? `gecikti · ${ageS}s` : `canlı · ${ageS}s önce`}</span>
    </div>
  );
}

function MacroBar({ macro }: { macro: Macro }) {
  const tone =
    macro.risk_regime === 'risk_on'
      ? 'border-emerald-400/25 bg-emerald-400/[0.04] text-emerald-200'
      : macro.risk_regime === 'risk_off'
        ? 'border-rose-400/25 bg-rose-400/[0.04] text-rose-200'
        : 'border-white/10 bg-bg-card text-fg-muted';
  const label =
    macro.risk_regime === 'risk_on'
      ? 'risk on'
      : macro.risk_regime === 'risk_off'
        ? 'risk off'
        : 'mixed';
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-2.5 ${tone}`}>
      <div className="flex items-center gap-2">
        <Tooltip content="DXY (USD endeksi) düşerken ES futures yükseliyorsa risk-on; tersi risk-off. Kripto risk-on'da daha çok prim yapar.">
          <span className="mono-label !text-fg-dim cursor-help">Makro ⓘ</span>
        </Tooltip>
        <span className="rounded-full bg-bg/50 px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ring-white/10">
          {label}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono">
        {macro.dxy ? (
          <span>
            DXY {macro.dxy.price.toFixed(2)}{' '}
            <span className={macro.dxy.change_pct >= 0 ? 'text-rose-300' : 'text-emerald-300'}>
              {macro.dxy.change_pct >= 0 ? '+' : ''}
              {macro.dxy.change_pct.toFixed(2)}%
            </span>
          </span>
        ) : null}
        {macro.es_futures ? (
          <span>
            ES {macro.es_futures.price.toFixed(2)}{' '}
            <span className={macro.es_futures.change_pct >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
              {macro.es_futures.change_pct >= 0 ? '+' : ''}
              {macro.es_futures.change_pct.toFixed(2)}%
            </span>
          </span>
        ) : null}
      </div>
    </div>
  );
}

function CrossAssetBar({ cross }: { cross: CrossAsset }) {
  const label =
    cross.rotation === 'btc_lead'
      ? 'BTC liderlik'
      : cross.rotation === 'alt_lead'
        ? 'Alt sezon'
        : 'karışık';
  const tone =
    cross.rotation === 'btc_lead'
      ? 'border-amber-400/25 bg-amber-400/[0.04] text-amber-200'
      : cross.rotation === 'alt_lead'
        ? 'border-violet-400/25 bg-violet-400/[0.04] text-violet-200'
        : 'border-white/10 bg-bg-card text-fg-muted';
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-2.5 ${tone}`}>
      <div className="flex items-center gap-2">
        <Tooltip content="Kaynak: CoinMarketCap global mcap (TradingView CRYPTOCAP göstergesiyle uyumlu) + Binance spot ETHBTC. BTC.D yükselirken ETH/BTC düşüyorsa para BTC'ye dönüyor; tersi alt sezon. 'Karışık' belirgin yön yok.">
          <span className="mono-label !text-fg-dim cursor-help">Rotasyon ⓘ</span>
        </Tooltip>
        <span className="rounded-full bg-bg/50 px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ring-white/10">
          {label}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono">
        <span>
          BTC.D <span className="text-fg">{cross.btc_dominance_pct.toFixed(1)}%</span>
        </span>
        <span>
          ETH.D <span className="text-fg">{cross.eth_dominance_pct.toFixed(1)}%</span>
        </span>
        <span>
          ETH/BTC <span className="text-fg">{cross.eth_btc_ratio.toFixed(5)}</span>
        </span>
      </div>
    </div>
  );
}

/**
 * Asset grid — desktop renders all cards side-by-side; mobile (≤md)
 * renders only the selected coin with a tab strip on top so the page
 * doesn't become a 3000px scroll on small screens. Tab persists across
 * polls; if a flip lands on a non-active coin we surface a small dot
 * on its tab so the user knows to check it.
 */
function AssetGrid({ assets }: { assets: Asset[] }) {
  const [activeCoin, setActiveCoin] = useState<string>(
    assets[0]?.coin ?? 'BTC',
  );
  // Track which coins have an unread flip while user is on a different tab.
  const seenFlipRef = useRef<Map<string, string>>(new Map());
  const unreadFlips = new Set<string>();
  for (const a of assets) {
    if (!a.combined_flip) continue;
    const seen = seenFlipRef.current.get(a.coin);
    if (a.coin === activeCoin) {
      seenFlipRef.current.set(a.coin, a.combined_flip.at);
    } else if (a.combined_flip.at !== seen) {
      unreadFlips.add(a.coin);
    }
  }

  return (
    <div className="space-y-4">
      {/* Mobile-only tab strip. md:hidden so desktop keeps the side-by-side grid. */}
      <div className="flex gap-1.5 md:hidden">
        {assets.map((a) => {
          const active = a.coin === activeCoin;
          const tone = directionTone(a.combined);
          return (
            <button
              key={a.coin}
              type="button"
              onClick={() => setActiveCoin(a.coin)}
              className={`relative flex-1 rounded-xl border px-3 py-2.5 text-left transition ${
                active
                  ? `${tone.border} ${tone.bg}`
                  : 'border-border bg-bg-card hover:border-white/15'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold tracking-wider text-fg-dim">
                  {a.coin}
                </span>
                <span className={`text-[11px] font-extrabold ${tone.text}`}>
                  {directionLabel(a.combined)}
                </span>
              </div>
              <div className="mt-1 text-[10px] font-mono text-fg-muted">
                güven {Math.round(a.combined_confidence * 100)}%
              </div>
              {unreadFlips.has(a.coin) ? (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 animate-pulse rounded-full bg-brand" />
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Mobile: single card based on activeCoin. Desktop (md+): grid. */}
      <div className="md:hidden">
        {assets
          .filter((a) => a.coin === activeCoin)
          .map((a) => (
            <AssetCard key={a.coin} asset={a} />
          ))}
      </div>
      <div className="hidden md:grid md:grid-cols-1 md:gap-5 lg:grid-cols-2">
        {assets.map((a) => (
          <AssetCard key={a.coin} asset={a} />
        ))}
      </div>
    </div>
  );
}

function AssetCard({
  asset,
  defaultOpen = true,
}: {
  asset: Asset;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  // Confidence-based dampening: signals weaker than 0.2 fade the whole
  // card so the eye doesn't waste attention. Above 0.6 we lift it with
  // a brand glow ring.
  const conf = asset.combined_confidence;
  const lowSignal = conf < 0.2 && asset.combined === 'wait';
  const highSignal = conf >= 0.6 && asset.combined !== 'wait';

  return (
    <section
      className={`rounded-2xl border bg-bg-card overflow-hidden transition ${
        highSignal
          ? 'border-brand/40 shadow-[0_0_24px_-12px_rgba(255,140,32,0.4)]'
          : 'border-border'
      } ${lowSignal ? 'opacity-60' : ''}`}
    >
      {asset.combined_flip ? (
        <FlipBanner coin={asset.coin} flip={asset.combined_flip} />
      ) : null}

      {/* QUICK VERDICT — the only thing a user has to read.
          Big direction, confidence, AI tactical sentence + invalidation. */}
      <QuickVerdict asset={asset} lowSignal={lowSignal} />

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between border-b border-border bg-bg/40 px-5 py-2 text-[11px] text-fg-muted hover:text-fg transition"
      >
        <span className="flex items-center gap-2">
          <span aria-hidden>{open ? '▾' : '▸'}</span>
          <span>{open ? 'Detayı gizle' : 'Detayları gör'}</span>
        </span>
        <span className="text-fg-dim">
          context · {`5 TF`} · pozisyon · likidite · flipler
        </span>
      </button>

      {open ? (
        <>
          <AiBlock ai={asset.ai} />
          <ContextStrip asset={asset} />
          <TfStack asset={asset} />
          <ChartSection asset={asset} />
          <PositioningStrip positioning={asset.positioning} />
          <LiqMapStrip clusters={asset.liq_clusters} last={asset.tf_1h?.last ?? null} />
          <FlipsFooter flips={asset.flips} />
        </>
      ) : null}
    </section>
  );
}

/**
 * The 4-line "what should I do right now" header. This is what the user
 * absolutely must see; everything else is justification.
 */
function QuickVerdict({ asset, lowSignal }: { asset: Asset; lowSignal: boolean }) {
  const tone = directionTone(asset.combined);
  const last = asset.tf_1h?.last ?? asset.tf_15m?.last ?? asset.tf_5m?.last ?? null;
  const tactical = asset.ai?.tactical_now;
  const invalidation = asset.ai?.invalidation;

  return (
    <div className={`border-b ${tone.border} ${tone.bg} px-5 py-4 md:px-6 md:py-5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg/60 text-lg font-bold text-fg ring-1 ring-white/10">
            {asset.coin[0]}
          </div>
          <div>
            <div className="mono-label !text-fg-dim">{asset.coin}/USDT</div>
            <div className={`mt-1 flex items-center gap-2 text-3xl font-extrabold tracking-tight ${tone.text}`}>
              <DirectionGlyph dir={asset.combined} />
              <span>{directionLabel(asset.combined)}</span>
            </div>
            <Tooltip
              content="Beş TF'lik confluence skorunun mutlak değeri. %20 altı 'belirsiz', %60 üstü 'güçlü teyit' anlamına gelir."
            >
              <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-mono text-fg-dim">
                kombine güven {Math.round(asset.combined_confidence * 100)}%
                {lowSignal ? (
                  <span className="ml-1 rounded bg-white/5 px-1 py-0.5 text-[9px] uppercase tracking-wider text-fg-dim">
                    low signal
                  </span>
                ) : null}
                <span className="text-fg-dim/60" aria-hidden>ⓘ</span>
              </div>
            </Tooltip>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-fg-dim">spot</div>
          <div className="text-xl font-bold text-fg font-mono md:text-2xl">
            {last != null ? `$${formatPrice(last)}` : '—'}
          </div>
          <ConfidenceBar confidence={asset.combined_confidence} dir={asset.combined} />
        </div>
      </div>

      {/* TACTICAL — the actionable sentence. Brand-leftborder visually
          distinguishes it from the structural sentence further down
          (which is paler and supplementary). */}
      {tactical ? (
        <div className="mt-4 rounded-lg border-l-2 border-brand bg-brand/[0.05] px-3 py-2.5">
          <div className="mono-label !text-brand">Şu an</div>
          <div className="mt-1 text-sm leading-relaxed text-fg">{tactical}</div>
          {invalidation ? (
            <div className="mt-1.5 text-[12px] text-fg-muted">
              <span className="font-semibold text-rose-300">İnvalidasyon:</span>{' '}
              {invalidation}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-border bg-bg/40 px-3 py-2.5 text-xs text-fg-dim">
          Foxy taktik yorumu hazırlanıyor — ilk overlay 30s sonra düşer.
        </div>
      )}
    </div>
  );
}

function ChartSection({ asset }: { asset: Asset }) {
  const [open, setOpen] = useState(false);
  const [tf, setTf] = useState<'15' | '60' | '240' | 'D'>('60');
  // Pull key levels from the matching TF block. Defaults to 1h since
  // that's our canonical multi-TF anchor.
  const blockMap: Record<string, TfBlock | null> = {
    '15': asset.tf_15m,
    '60': asset.tf_1h,
    '240': asset.tf_4h,
    D: asset.tf_1d,
  };
  const block = blockMap[tf] ?? asset.tf_1h;
  const levels = block?.key_levels ?? null;
  const last = block?.last ?? null;
  const tvSymbol = `BINANCE:${asset.coin}USDT.P`;
  // chartonly=1 + theme=dark + interval matches TF dropdown.
  const src = `https://www.tradingview.com/widgetembed/?symbol=${encodeURIComponent(
    tvSymbol,
  )}&interval=${tf}&theme=dark&style=1&toolbarbg=rgba(0,0,0,0)&hideideas=1&withdateranges=1&timezone=Etc/UTC`;

  return (
    <div className="border-b border-border">
      <div className="flex items-center justify-between gap-2 px-5 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-[12px] text-fg-muted hover:text-fg transition"
        >
          <span aria-hidden>{open ? '▾' : '▸'}</span>
          <span className="mono-label !text-fg-dim">Chart · TradingView</span>
        </button>
        {open ? (
          <div className="flex items-center gap-1">
            {(['15', '60', '240', 'D'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setTf(v)}
                className={`rounded-full px-2 py-0.5 text-[10px] font-mono transition ${
                  tf === v
                    ? 'bg-brand/15 text-brand ring-1 ring-brand/30'
                    : 'text-fg-dim hover:text-fg'
                }`}
              >
                {tfLabel(v)}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {open ? (
        <div className="px-5 pb-4">
          <div className="overflow-hidden rounded-xl border border-border">
            <iframe
              src={src}
              title={`${asset.coin}USDT TradingView`}
              loading="lazy"
              className="block h-[360px] w-full"
            />
          </div>
          {levels && last != null ? (
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-mono md:grid-cols-4">
              <LevelTile
                label="Spot"
                value={`$${formatPrice(last)}`}
                tone="neutral"
              />
              {levels.entry_low != null && levels.entry_high != null ? (
                <LevelTile
                  label="Giriş"
                  value={`$${formatPrice(levels.entry_low)} – $${formatPrice(levels.entry_high)}`}
                  tone={block?.signal === 'short' ? 'rose' : 'emerald'}
                />
              ) : null}
              {levels.invalidation != null ? (
                <LevelTile
                  label="İnvalidasyon"
                  value={`$${formatPrice(levels.invalidation)}`}
                  tone="rose"
                />
              ) : null}
              {levels.target != null ? (
                <LevelTile
                  label="Hedef"
                  value={`$${formatPrice(levels.target)}`}
                  tone="emerald"
                />
              ) : null}
            </div>
          ) : null}
          <div className="mt-2 text-[10px] text-fg-dim">
            Seviyeler {tfLabel(tf)} TF'inden — Right Now signal engine'in OB/FVG/swing
            okumasıyla hesaplanmıştır.
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LevelTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'emerald' | 'rose' | 'neutral';
}) {
  const cls =
    tone === 'emerald'
      ? 'text-emerald-300'
      : tone === 'rose'
        ? 'text-rose-300'
        : 'text-fg';
  return (
    <div className="rounded-lg border border-white/5 bg-bg/40 px-2.5 py-2">
      <div className="text-[9px] uppercase tracking-wider text-fg-dim">{label}</div>
      <div className={`mt-0.5 ${cls}`}>{value}</div>
    </div>
  );
}

function tfLabel(v: '15' | '60' | '240' | 'D'): string {
  if (v === '15') return '15m';
  if (v === '60') return '1h';
  if (v === '240') return '4h';
  return '1d';
}

// `CombinedHeader` was inlined into `QuickVerdict` in V2.6 — the verdict
// block now owns the headline call so the user sees direction + confidence
// + tactical sentence in one read instead of jumping between sections.

/**
 * Structural sentence — visually subdued because the actionable copy
 * (tactical_now + invalidation) lives in the QuickVerdict block above.
 * This is the "what's the regime / why" justification, not the call.
 */
function AiBlock({ ai }: { ai: Asset['ai'] }) {
  if (!ai || !ai.big_picture) {
    return (
      <div className="border-b border-border bg-bg/30 px-5 py-3 text-[11px] text-fg-dim">
        Yapısal yorum hazırlanıyor — 45 saniye içinde düşer.
      </div>
    );
  }
  return (
    <div className="border-b border-border bg-bg/30 px-5 py-3">
      <div className="mono-label !text-fg-dim">Yapısal</div>
      <div className="mt-1 text-[13px] leading-relaxed text-fg-muted">
        {ai.big_picture}
      </div>
    </div>
  );
}

function ContextStrip({ asset }: { asset: Asset }) {
  const regime = regimeCopy(asset.regime);
  const basis = asset.basis ? basisCopy(asset.basis.bias) : null;
  const fv = asset.funding_velocity;
  const fvCopy = fv ? fundingVelocityCopy(fv) : null;
  const etf = asset.etf;

  const tiles: Array<{
    label: string;
    value: string;
    hint?: string;
    tone: 'green' | 'red' | 'amber' | 'sky' | 'gray';
    info?: string;
  }> = [];

  tiles.push({
    label: 'OI ↔ Px',
    value: regime.label,
    hint: `OI ${asset.oi_change_24h_pct == null ? '—' : (asset.oi_change_24h_pct >= 0 ? '+' : '') + asset.oi_change_24h_pct.toFixed(1) + '%'} · Px ${asset.price_change_24h_pct == null ? '—' : (asset.price_change_24h_pct >= 0 ? '+' : '') + asset.price_change_24h_pct.toFixed(1) + '%'}`,
    tone: regime.tone,
    info: 'Open Interest ile fiyatın 24h yönü. OI↑Px↑ taze para; OI↓Px↑ short squeeze (zayıf rally); OI↑Px↓ taze short; OI↓Px↓ long capitulation.',
  });

  if (asset.basis && basis) {
    tiles.push({
      label: 'Basis',
      value: `${asset.basis.premium_pct >= 0 ? '+' : ''}${asset.basis.premium_pct.toFixed(3)}%`,
      hint: basis.label,
      tone: basis.tone,
      info: 'Spot ile perp arasındaki fark. Pozitif premium = perpler daha pahalı (leverage long); negatif = panik / spot front-run.',
    });
  }

  if (fv && fvCopy) {
    tiles.push({
      label: 'Funding velocity',
      value: `${fv.current_pct >= 0 ? '+' : ''}${fv.current_pct.toFixed(4)}%`,
      hint: fvCopy.label,
      tone: fvCopy.tone,
      info: 'Funding rate trendi (3 günlük slope). Hızlanan pozitif funding = long-bias şişiyor (squeeze fitili); hızlanan negatif = shortlar agresifleşiyor.',
    });
  }

  if (etf) {
    tiles.push({
      label: `ETF · ${etf.date}`,
      value: `${etf.net_usd_m >= 0 ? '+' : ''}$${etf.net_usd_m.toFixed(1)}M`,
      hint: etf.net_usd_m > 0 ? 'kurumsal giriş' : etf.net_usd_m < 0 ? 'kurumsal çıkış' : 'flat',
      tone: etf.net_usd_m > 50 ? 'green' : etf.net_usd_m < -50 ? 'red' : 'gray',
      info: 'ABD spot ETF\'lerinin önceki gün net flow\'u (Farside). $200M+ giriş kurumsal momentum sinyali.',
    });
  }

  if (asset.vwap) {
    const v = asset.vwap;
    tiles.push({
      label: 'VWAP (24h)',
      value: `${v.deviation_pct >= 0 ? '+' : ''}${v.deviation_pct.toFixed(2)}%`,
      hint: vwapBiasLabel(v.bias),
      tone: vwapTone(v.bias),
      info: 'Hacim ağırlıklı ortalama fiyat (institutional anchor). Aşırı stretched ise mean reversion adayı; VWAP\'a yakınsa karar yeri.',
    });
  }

  if (tiles.length === 0) {
    return (
      <div className="border-b border-border px-5 py-3 text-[11px] text-fg-dim">
        Bağlam verisi henüz yüklenmedi.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 border-b border-border bg-bg/40 px-5 py-3 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map((t, i) => (
        <ContextTile key={i} {...t} />
      ))}
    </div>
  );
}

function vwapBiasLabel(bias: Vwap['bias']): string {
  switch (bias) {
    case 'extended_long':
      return 'aşırı stretched ↑';
    case 'mild_long':
      return 'VWAP üstünde';
    case 'extended_short':
      return 'aşırı stretched ↓';
    case 'mild_short':
      return 'VWAP altında';
    default:
      return 'VWAP\'a yakın';
  }
}

function vwapTone(bias: Vwap['bias']): 'green' | 'red' | 'amber' | 'gray' {
  if (bias === 'mild_long') return 'green';
  if (bias === 'mild_short') return 'red';
  if (bias === 'extended_long' || bias === 'extended_short') return 'amber';
  return 'gray';
}

function ContextTile({
  label,
  value,
  hint,
  tone,
  info,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone: 'green' | 'red' | 'amber' | 'sky' | 'gray';
  info?: string;
}) {
  const cls = {
    green: 'text-emerald-300',
    red: 'text-rose-300',
    amber: 'text-amber-300',
    sky: 'text-sky-300',
    gray: 'text-fg',
  }[tone];
  const labelEl = info ? (
    <Tooltip content={info}>
      <span className="cursor-help">{label} ⓘ</span>
    </Tooltip>
  ) : (
    label
  );
  return (
    <div className="rounded-lg border border-white/5 bg-bg/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-fg-dim">
        {labelEl}
      </div>
      <div className={`mt-1 text-sm font-bold ${cls}`}>{value}</div>
      {hint ? <div className="text-[10px] text-fg-dim font-mono">{hint}</div> : null}
    </div>
  );
}

function TfStack({ asset }: { asset: Asset }) {
  const rows: Array<{ tf: Tf; block: TfBlock | null }> = [
    { tf: '5m', block: asset.tf_5m },
    { tf: '15m', block: asset.tf_15m },
    { tf: '1h', block: asset.tf_1h },
    { tf: '4h', block: asset.tf_4h },
    { tf: '1d', block: asset.tf_1d },
  ];
  return (
    <div className="border-b border-border">
      <div className="flex items-center justify-between border-b border-border px-5 py-2">
        <div className="mono-label !text-fg-dim">Multi-TF</div>
        <div className="text-[10px] text-fg-dim font-mono">scalp → swing</div>
      </div>
      {rows.map(({ tf, block }) => (
        <TfRow key={tf} tf={tf} block={block} />
      ))}
    </div>
  );
}

function TfRow({ tf, block }: { tf: Tf; block: TfBlock | null }) {
  if (!block) {
    return (
      <div className="flex items-center justify-between gap-3 border-t border-white/[0.04] px-5 py-2">
        <div className="flex items-center gap-3">
          <div className="w-10 mono-label !text-fg-dim">{tf}</div>
          <div className="h-2 w-2 rounded-full bg-white/10" />
        </div>
        <div className="text-[11px] text-fg-dim">hesaplanıyor…</div>
      </div>
    );
  }
  const tone = directionTone(block.signal);
  const struct = labelStructure(block.pa.structure);
  return (
    <div className="flex items-center justify-between gap-3 border-t border-white/[0.04] px-5 py-2">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 mono-label !text-fg-dim">{tf}</div>
        <span className={`flex h-2 w-2 rounded-full ${dotBg(block.signal)}`} />
        <span className={`text-[12px] font-extrabold uppercase ${tone.text}`}>
          {directionLabel(block.signal)}
        </span>
        <span className="text-[11px] font-mono text-fg-dim">
          {Math.round(block.confidence * 100)}%
        </span>
      </div>
      <div className="hidden sm:flex flex-wrap items-center gap-2 text-[10px] font-mono text-fg-muted">
        {block.pa.rsi14 != null ? <span>RSI {Math.round(block.pa.rsi14)}</span> : null}
        <span>EMA {block.pa.ema_aligned}</span>
        <span>{struct}</span>
      </div>
      <div className="text-right text-[11px] font-mono text-fg">
        ${formatPrice(block.last)}
      </div>
    </div>
  );
}

function PositioningStrip({ positioning }: { positioning: Positioning | null }) {
  if (!positioning || !positioning.top_traders || !positioning.retail) {
    return (
      <div className="border-b border-border px-5 py-3 text-[11px] text-fg-dim">
        Pozisyon kıyası şu an kullanılamıyor.
      </div>
    );
  }
  const { top_traders, retail, spread, divergence } = positioning;
  const verdict = divergenceCopy(divergence);
  return (
    <div className="border-b border-border bg-bg/40 px-5 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="mono-label !text-fg-dim">Balinalar vs küçükler</span>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ${verdict.tone}`}>
          {verdict.badge}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <PositioningRow label="Balinalar" subtitle="top %20" longPct={top_traders.long_pct} shortPct={top_traders.short_pct} />
        <PositioningRow label="Küçükler" subtitle="tüm hesap" longPct={retail.long_pct} shortPct={retail.short_pct} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-fg-muted">
        <span>{verdict.message}</span>
        {spread != null ? (
          <span className={`font-mono ${spread >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
            {spread >= 0 ? '+' : ''}
            {(spread * 100).toFixed(1)}pp
          </span>
        ) : null}
      </div>
    </div>
  );
}

function PositioningRow({
  label,
  subtitle,
  longPct,
  shortPct,
}: {
  label: string;
  subtitle: string;
  longPct: number;
  shortPct: number;
}) {
  const longWidth = Math.round(longPct * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-fg">{label}</span>
        <span className="font-mono text-fg-dim">{subtitle}</span>
      </div>
      <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-rose-400/20">
        <div className="bg-emerald-400" style={{ width: `${longWidth}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[10px] font-mono">
        <span className="text-emerald-300">L {(longPct * 100).toFixed(1)}%</span>
        <span className="text-rose-300">{(shortPct * 100).toFixed(1)}% S</span>
      </div>
    </div>
  );
}

function LiqMapStrip({
  clusters,
  last,
}: {
  clusters: LiqClusters;
  last: number | null;
}) {
  if (!clusters.below && !clusters.above) {
    return null;
  }
  return (
    <div className="border-b border-border px-5 py-3">
      <div className="mono-label !text-fg-dim">Likidite haritası</div>
      <div className="mt-2 space-y-1.5 text-[12px] font-mono">
        {clusters.above ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-rose-300">▲ ${formatPrice(clusters.above.price)}</span>
            <span className="text-fg-muted">short stops · yukarı mıknatıs</span>
          </div>
        ) : null}
        {last != null ? (
          <div className="flex items-center justify-between gap-3 border-y border-white/5 py-1">
            <span className="text-fg">─ ${formatPrice(last)}</span>
            <span className="text-fg-dim">spot</span>
          </div>
        ) : null}
        {clusters.below ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-emerald-300">▼ ${formatPrice(clusters.below.price)}</span>
            <span className="text-fg-muted">long stops · aşağı mıknatıs</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FlipsFooter({ flips }: { flips: Flip[] }) {
  if (!flips || flips.length === 0) {
    return (
      <div className="px-5 py-3 text-[11px] text-fg-dim">
        Son flip yok — sinyaller stabil.
      </div>
    );
  }
  // Pin combined flips to the top — they're the user-facing call.
  const sorted = [...flips].sort((a, b) => {
    if (a.tf === 'combined' && b.tf !== 'combined') return -1;
    if (b.tf === 'combined' && a.tf !== 'combined') return 1;
    return new Date(b.at).getTime() - new Date(a.at).getTime();
  });
  return (
    <div className="px-5 py-3">
      <div className="mono-label !text-fg-dim mb-2">Son flipler</div>
      <ul className="space-y-1.5">
        {sorted.slice(0, 6).map((f, i) => {
          const isCombined = f.tf === 'combined';
          const tone =
            f.to === 'long'
              ? 'text-emerald-200'
              : f.to === 'short'
                ? 'text-rose-200'
                : 'text-amber-200';
          return (
            <li
              key={i}
              className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] font-mono ${
                isCombined
                  ? 'border-white/15 bg-white/[0.04]'
                  : 'border-white/5 bg-white/[0.02]'
              }`}
            >
              <span className="flex items-center gap-2">
                <span
                  className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                    isCombined
                      ? 'bg-brand/15 text-brand ring-1 ring-brand/30'
                      : 'bg-white/5 text-fg-dim'
                  }`}
                >
                  {isCombined ? 'KOMBİNE' : f.tf}
                </span>
                <span className={tone}>
                  {f.from} → {f.to}
                </span>
              </span>
              <span className="text-fg-dim">{ago(f.at)} önce</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CoverageStrip({ coverage }: { coverage: Coverage[] }) {
  return (
    <div className="rounded-xl border border-border bg-bg-card/60 px-4 py-2">
      <div className="flex items-center justify-between gap-3">
        <span className="mono-label !text-fg-dim">Veri beslemeleri</span>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono">
          {coverage.map((c) => (
            <span
              key={c.source}
              className={
                c.ok ? 'text-emerald-300' : c.age_s === -1 ? 'text-fg-dim' : 'text-rose-300'
              }
            >
              {c.ok ? '●' : c.age_s === -1 ? '○' : '✕'} {c.source}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────── tone helpers

function directionTone(dir: SignalKind): {
  text: string;
  bg: string;
  border: string;
} {
  if (dir === 'long')
    return { text: 'text-emerald-300', bg: 'bg-emerald-400/[0.06]', border: 'border-emerald-400/20' };
  if (dir === 'short')
    return { text: 'text-rose-300', bg: 'bg-rose-400/[0.06]', border: 'border-rose-400/20' };
  return { text: 'text-amber-300', bg: 'bg-amber-400/[0.04]', border: 'border-amber-400/15' };
}

function dotBg(dir: SignalKind): string {
  if (dir === 'long') return 'bg-emerald-400';
  if (dir === 'short') return 'bg-rose-400';
  return 'bg-amber-400';
}

function directionLabel(dir: SignalKind): string {
  if (dir === 'long') return 'LONG';
  if (dir === 'short') return 'SHORT';
  return 'BEKLE';
}

function regimeCopy(r: Regime): {
  label: string;
  tone: 'green' | 'red' | 'amber' | 'sky' | 'gray';
} {
  switch (r) {
    case 'bullish_confirmation':
      return { label: 'Sağlıklı uptrend', tone: 'green' };
    case 'bearish_confirmation':
      return { label: 'Down devam', tone: 'red' };
    case 'short_squeeze':
      return { label: 'Weak rally', tone: 'amber' };
    case 'long_capitulation':
      return { label: 'Long exhaustion', tone: 'sky' };
    default:
      return { label: 'Nötr', tone: 'gray' };
  }
}

function basisCopy(bias: Basis['bias']): {
  label: string;
  tone: 'green' | 'red' | 'amber' | 'sky' | 'gray';
} {
  switch (bias) {
    case 'leveraged_long':
      return { label: 'leveraged long (kırılgan)', tone: 'amber' };
    case 'mild_long':
      return { label: 'hafif long bias', tone: 'green' };
    case 'leveraged_short':
      return { label: 'panik / spot front-run', tone: 'red' };
    case 'mild_short':
      return { label: 'hafif short bias', tone: 'red' };
    default:
      return { label: 'spot-perp eşit', tone: 'gray' };
  }
}

function fundingVelocityCopy(fv: FundingVelocity): {
  label: string;
  tone: 'green' | 'red' | 'amber' | 'gray' | 'sky';
} {
  if (fv.trend === 'rising' && fv.current_pct >= 0)
    return { label: 'long-bias hızlanıyor', tone: 'amber' };
  if (fv.trend === 'rising' && fv.current_pct < 0)
    return { label: 'shorta dönüş zayıflıyor', tone: 'green' };
  if (fv.trend === 'falling' && fv.current_pct > 0)
    return { label: 'long-bias soğuyor', tone: 'sky' };
  if (fv.trend === 'falling' && fv.current_pct < 0)
    return { label: 'short-bias hızlanıyor', tone: 'red' };
  return { label: 'stabil', tone: 'gray' };
}

function divergenceCopy(d: Positioning['divergence']): {
  badge: string;
  tone: string;
  message: string;
} {
  switch (d) {
    case 'smart_bulls':
      return {
        badge: 'Smart bulls',
        tone: 'bg-emerald-400/10 ring-emerald-400/30 text-emerald-300',
        message: 'Balinalar belirgin long, küçükler temkinli — whale takibi.',
      };
    case 'capitulation_setup':
      return {
        badge: 'Squeeze fitili',
        tone: 'bg-emerald-400/10 ring-emerald-400/30 text-emerald-300',
        message: 'Küçükler shorta yaslandı, balinalar uzun — short squeeze riski.',
      };
    case 'top_heavy':
      return {
        badge: 'Top-heavy',
        tone: 'bg-rose-400/10 ring-rose-400/30 text-rose-300',
        message: 'Küçükler euforik long, balinalar temkinli — distribution.',
      };
    case 'smart_bears':
      return {
        badge: 'Smart bears',
        tone: 'bg-rose-400/10 ring-rose-400/30 text-rose-300',
        message: 'Balinalar short, küçükler henüz uyanmadı.',
      };
    case 'aligned_long':
      return {
        badge: 'Hep long',
        tone: 'bg-amber-400/10 ring-amber-400/30 text-amber-300',
        message: 'Hem balinalar hem küçükler long — tek taraflı.',
      };
    case 'aligned_short':
      return {
        badge: 'Hep short',
        tone: 'bg-amber-400/10 ring-amber-400/30 text-amber-300',
        message: 'Hem balinalar hem küçükler short — tek taraflı.',
      };
    default:
      return {
        badge: 'Nötr',
        tone: 'bg-white/5 ring-white/10 text-fg-muted',
        message: 'Belirgin bir taraf ayrışması yok.',
      };
  }
}

function labelStructure(s: TfBlock['pa']['structure']): string {
  switch (s) {
    case 'bos_up':
      return 'BOS↑';
    case 'bos_down':
      return 'BOS↓';
    case 'choch_up':
      return 'CHOCH↑';
    case 'choch_down':
      return 'CHOCH↓';
    default:
      return '—';
  }
}

function DirectionGlyph({ dir }: { dir: SignalKind }) {
  if (dir === 'long')
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    );
  if (dir === 'short')
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M12 5v14M5 12l7 7 7-7" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

function ConfidenceBar({
  confidence,
  dir,
}: {
  confidence: number;
  dir: SignalKind;
}) {
  const pct = Math.round(confidence * 100);
  const fill =
    dir === 'long'
      ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.5)]'
      : dir === 'short'
        ? 'bg-rose-400 shadow-[0_0_12px_rgba(251,113,133,0.5)]'
        : 'bg-amber-400';
  return (
    <div className="mt-2 ml-auto h-2.5 w-36 overflow-hidden rounded-full bg-white/[0.08] ring-1 ring-white/5">
      <div className={fill} style={{ width: `${pct}%`, height: '100%' }} />
    </div>
  );
}

// ─────────────────────────────────────────────────── tooltip primitive

/**
 * Minimal tooltip — pure CSS, no JS lib. Wraps an arbitrary trigger
 * (icon, label, badge) and reveals a small dark caption on hover/focus.
 * The caption sits absolutely below the trigger and clips to viewport.
 */
function Tooltip({
  content,
  children,
}: {
  content: string;
  children: React.ReactNode;
}) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-30 mt-1.5 hidden -translate-x-1/2 whitespace-normal rounded-lg border border-white/10 bg-bg-card px-2.5 py-1.5 text-[10px] font-normal leading-snug text-fg shadow-xl group-hover:block group-focus-within:block"
        style={{ width: 'max-content', maxWidth: '260px' }}
      >
        {content}
      </span>
    </span>
  );
}

// ─────────────────────────────────────────────── flip alert primitives

function FlipBanner({ coin, flip }: { coin: string; flip: Flip }) {
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  void tick; // re-render to update relative time

  const tone = flipTone(flip.to);
  return (
    <div
      role="alert"
      className={`flex items-center justify-between gap-3 border-b ${tone.border} ${tone.bg} px-5 py-3`}
    >
      <div className="flex items-center gap-3">
        <span className={`flex h-7 w-7 items-center justify-center rounded-full ring-1 ${tone.iconBg} ${tone.iconRing}`}>
          <span className={`text-base font-bold ${tone.text}`}>
            {flip.to === 'long' ? '↑' : flip.to === 'short' ? '↓' : '⏸'}
          </span>
        </span>
        <div>
          <div className={`text-sm font-extrabold ${tone.text}`}>
            {coin}: {labelFlip(flip.from)} → {labelFlip(flip.to)}
          </div>
          <div className="text-[11px] font-mono text-fg-muted">
            kombine yön az önce değişti · {ago(flip.at)} önce
          </div>
        </div>
      </div>
      <span className={`hidden sm:inline-flex text-[10px] font-bold uppercase tracking-wider ${tone.text}`}>
        FLIP
      </span>
    </div>
  );
}

function flipTone(to: SignalKind): {
  text: string;
  bg: string;
  border: string;
  iconBg: string;
  iconRing: string;
} {
  if (to === 'long') {
    return {
      text: 'text-emerald-300',
      bg: 'bg-emerald-400/[0.12] animate-pulse',
      border: 'border-emerald-400/40',
      iconBg: 'bg-emerald-400/20',
      iconRing: 'ring-emerald-400/40',
    };
  }
  if (to === 'short') {
    return {
      text: 'text-rose-300',
      bg: 'bg-rose-400/[0.12] animate-pulse',
      border: 'border-rose-400/40',
      iconBg: 'bg-rose-400/20',
      iconRing: 'ring-rose-400/40',
    };
  }
  return {
    text: 'text-amber-300',
    bg: 'bg-amber-400/[0.10]',
    border: 'border-amber-400/30',
    iconBg: 'bg-amber-400/15',
    iconRing: 'ring-amber-400/30',
  };
}

function labelFlip(s: SignalKind): string {
  if (s === 'long') return 'LONG';
  if (s === 'short') return 'SHORT';
  return 'BEKLE';
}

function PushToggle({
  getIdToken,
}: {
  getIdToken: () => Promise<string | null>;
}) {
  const [state, setState] = useState<
    'unsupported' | 'idle' | 'loading' | 'subscribed' | 'denied' | 'unconfigured'
  >('idle');

  // On mount: check capability + current subscription state.
  useEffect(() => {
    let alive = true;
    (async () => {
      if (
        typeof window === 'undefined' ||
        !('serviceWorker' in navigator) ||
        !('PushManager' in window)
      ) {
        if (alive) setState('unsupported');
        return;
      }
      if (Notification.permission === 'denied') {
        if (alive) setState('denied');
        return;
      }
      try {
        const reg = await navigator.serviceWorker.getRegistration('/right-now-sw.js');
        const sub = await reg?.pushManager.getSubscription();
        if (alive) setState(sub ? 'subscribed' : 'idle');
      } catch {
        if (alive) setState('idle');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const subscribe = async () => {
    setState('loading');
    try {
      const token = await getIdToken();
      if (!token) throw new Error('auth required');
      // Pull VAPID public key + capability from API.
      const cfgRes = await fetch(`${API_BASE}/me/right-now/push-config`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!cfgRes.ok) throw new Error(`push-config ${cfgRes.status}`);
      const cfg = (await cfgRes.json()) as {
        enabled: boolean;
        public_key: string | null;
      };
      if (!cfg.enabled || !cfg.public_key) {
        setState('unconfigured');
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setState('denied');
        return;
      }
      const reg = await navigator.serviceWorker.register('/right-now-sw.js');
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // Cast through BufferSource — `lib.dom`'s narrowing of
        // `Uint8Array<ArrayBufferLike>` collides with `ArrayBufferView<ArrayBuffer>`
        // under recent TS lib bundles even though the runtime is happy.
        applicationServerKey: urlBase64ToUint8Array(
          cfg.public_key,
        ) as unknown as BufferSource,
      });
      const subRes = await fetch(`${API_BASE}/me/right-now/subscribe`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!subRes.ok) throw new Error(`subscribe ${subRes.status}`);
      setState('subscribed');
    } catch {
      setState('idle');
    }
  };

  const unsubscribe = async () => {
    setState('loading');
    try {
      const reg = await navigator.serviceWorker.getRegistration('/right-now-sw.js');
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        const token = await getIdToken();
        if (token) {
          await fetch(`${API_BASE}/me/right-now/subscribe`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
        }
      }
      setState('idle');
    } catch {
      setState('idle');
    }
  };

  if (state === 'unsupported' || state === 'unconfigured') {
    // Hide the button entirely when the browser can't do push or the
    // server isn't configured — we don't want to surface a control
    // that can never succeed.
    return null;
  }
  const subscribed = state === 'subscribed';
  const label =
    state === 'denied'
      ? 'izin engelli'
      : state === 'loading'
        ? '...'
        : subscribed
          ? 'bildirimler açık'
          : 'bildirim al';
  return (
    <button
      type="button"
      onClick={subscribed ? unsubscribe : subscribe}
      disabled={state === 'denied' || state === 'loading'}
      title={
        state === 'denied'
          ? 'Tarayıcı bildirim iznini engellemiş — site ayarlarından açabilirsin.'
          : subscribed
            ? 'Push bildirimleri açık. Kapatmak için tıkla.'
            : 'Combined yön değiştiğinde tarayıcı kapalı olsa bile bildirim al.'
      }
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-mono transition disabled:opacity-50 disabled:cursor-not-allowed ${
        subscribed
          ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
          : 'border-white/10 bg-bg-card text-fg-muted hover:border-white/25 hover:text-fg'
      }`}
    >
      <span aria-hidden>{subscribed ? '🔔' : '🛎'}</span>
      <span>{label}</span>
    </button>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

function SoundToggle({
  on,
  setOn,
}: {
  on: boolean;
  setOn: (v: boolean) => void;
}) {
  const toggle = () => {
    const next = !on;
    setOn(next);
    try {
      window.localStorage.setItem('rightnow.sound', next ? '1' : '0');
    } catch {
      // localStorage unavailable in some embedded contexts — ignore.
    }
  };
  return (
    <button
      type="button"
      onClick={toggle}
      title={on ? 'Sesi kapat' : 'Sesi aç'}
      aria-label={on ? 'Sesi kapat' : 'Sesi aç'}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-mono transition ${
        on
          ? 'border-brand/40 bg-brand/10 text-brand'
          : 'border-white/10 bg-bg-card text-fg-muted hover:border-white/25 hover:text-fg'
      }`}
    >
      <span aria-hidden>{on ? '🔔' : '🔕'}</span>
      <span>{on ? 'sesli' : 'sessiz'}</span>
    </button>
  );
}

/**
 * On every new payload, compare the combined direction per asset against
 * the value we saw last tick. If anything flipped:
 *   1. Flicker the document title for 30s so a backgrounded user sees it.
 *   2. If sound is enabled, play a short Web-Audio ping (no asset file).
 * The combined_flip field on the payload drives the persistent banner;
 * this hook adds the *transient* attention-grabbing effects on top.
 */
function useFlipAlerts(
  data: Payload | null,
  lastCombinedRef: React.MutableRefObject<Map<string, SignalKind>>,
  soundOn: boolean,
): void {
  const originalTitleRef = useRef<string | null>(null);
  const titleTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof document !== 'undefined' && originalTitleRef.current === null) {
      originalTitleRef.current = document.title;
    }
    return () => {
      if (titleTimeoutRef.current) {
        window.clearTimeout(titleTimeoutRef.current);
        if (originalTitleRef.current) document.title = originalTitleRef.current;
      }
    };
  }, []);

  useEffect(() => {
    if (!data) return;
    const newFlips: Array<{ coin: string; to: SignalKind }> = [];
    for (const a of data.assets) {
      const prev = lastCombinedRef.current.get(a.coin);
      if (prev !== undefined && prev !== a.combined) {
        newFlips.push({ coin: a.coin, to: a.combined });
      }
      lastCombinedRef.current.set(a.coin, a.combined);
    }
    if (newFlips.length === 0) return;

    // Title flicker — pick the first flip to surface in the title.
    const head = newFlips[0]!;
    if (typeof document !== 'undefined' && originalTitleRef.current) {
      const arrow = head.to === 'long' ? '↑' : head.to === 'short' ? '↓' : '⏸';
      document.title = `(!) ${head.coin} ${arrow} ${labelFlip(head.to)} · BottomUP`;
      if (titleTimeoutRef.current) window.clearTimeout(titleTimeoutRef.current);
      titleTimeoutRef.current = window.setTimeout(() => {
        if (originalTitleRef.current) document.title = originalTitleRef.current;
      }, 30_000);
    }

    if (soundOn) playPing();
  }, [data, soundOn, lastCombinedRef]);
}

/** Subtle two-note ping via Web Audio — no asset file shipped. */
function playPing(): void {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0, now + i * 0.18);
      gain.gain.linearRampToValueAtTime(0.12, now + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.18);
      osc.stop(now + i * 0.18 + 0.2);
    });
    // Auto-close after the sound ends so we don't leak audio nodes.
    setTimeout(() => void ctx.close(), 800);
  } catch {
    // Audio policies / no permission — silent fallback.
  }
}

function formatPrice(n: number): string {
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(4);
  if (n >= 0.01) return n.toFixed(5);
  return n.toFixed(8);
}

function ago(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  if (d < 60_000) return `${Math.floor(d / 1000)}s`;
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}dk`;
  return `${Math.floor(d / 3_600_000)}sa`;
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border bg-bg-card overflow-hidden">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 animate-pulse rounded-full bg-white/[0.06]" />
            <div className="space-y-2">
              <div className="h-3 w-16 animate-pulse rounded bg-white/[0.05]" />
              <div className="h-6 w-28 animate-pulse rounded bg-white/[0.06]" />
            </div>
          </div>
          <div className="h-12 w-24 animate-pulse rounded bg-white/[0.05]" />
        </div>
      </div>
      <div className="p-5 space-y-3">
        <div className="h-3 w-full animate-pulse rounded bg-white/[0.05]" />
        <div className="h-3 w-11/12 animate-pulse rounded bg-white/[0.05]" />
        <div className="h-3 w-9/12 animate-pulse rounded bg-white/[0.05]" />
      </div>
    </div>
  );
}
