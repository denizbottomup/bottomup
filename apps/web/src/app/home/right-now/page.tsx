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
  tf: Tf;
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
  flips: Flip[];
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
  const tokenRef = useRef<string | null>(null);

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
          <FreshnessPill data={data} now={now} />
        </div>
        <p className="mt-1 max-w-2xl text-sm text-fg-muted">
          BTC ve ETH için 5dk → 1g zaman dilimlerinde price-action,
          türev verileri, balina akışı, smart vs retail pozisyon, OI/Price
          rejimi, spot/perp basis, funding velocity, ETF günlük flow ve
          makro bağlam — tek ekranda. Her 60 saniyede güncellenir.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        <div className="mx-auto max-w-6xl space-y-5">
          {loading ? (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : err && !data ? (
            <div className="rounded-2xl border border-rose-400/30 bg-rose-500/[0.06] px-5 py-4 text-sm text-rose-200">
              Right Now alınamadı: {err}
            </div>
          ) : data ? (
            <>
              {data.macro ? <MacroBar macro={data.macro} /> : null}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {data.assets.map((a) => (
                  <AssetCard key={a.coin} asset={a} />
                ))}
              </div>
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
        <span className="mono-label !text-fg-dim">Makro</span>
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

function AssetCard({ asset }: { asset: Asset }) {
  return (
    <section className="rounded-2xl border border-border bg-bg-card overflow-hidden">
      <CombinedHeader asset={asset} />
      <AiBlock ai={asset.ai} />
      <ContextStrip asset={asset} />
      <TfStack asset={asset} />
      <PositioningStrip positioning={asset.positioning} />
      <LiqMapStrip clusters={asset.liq_clusters} last={asset.tf_1h?.last ?? null} />
      <FlipsFooter flips={asset.flips} />
    </section>
  );
}

function CombinedHeader({ asset }: { asset: Asset }) {
  const tone = directionTone(asset.combined);
  const last = asset.tf_1h?.last ?? asset.tf_15m?.last ?? asset.tf_5m?.last ?? null;
  return (
    <div className={`flex items-center justify-between gap-3 border-b ${tone.border} ${tone.bg} px-5 py-4`}>
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg/60 text-lg font-bold text-fg ring-1 ring-white/10">
          {asset.coin[0]}
        </div>
        <div>
          <div className="mono-label !text-fg-dim">{asset.coin}/USDT</div>
          <div className={`mt-1 flex items-center gap-2 text-2xl font-extrabold tracking-tight ${tone.text}`}>
            <DirectionGlyph dir={asset.combined} />
            <span>{directionLabel(asset.combined)}</span>
          </div>
          <div className="mt-1 text-[11px] font-mono text-fg-dim">
            kombine güven {Math.round(asset.combined_confidence * 100)}%
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-[10px] uppercase tracking-wider text-fg-dim">spot</div>
        <div className="text-lg font-bold text-fg font-mono">
          {last != null ? `$${formatPrice(last)}` : '—'}
        </div>
        <ConfidenceBar confidence={asset.combined_confidence} dir={asset.combined} />
      </div>
    </div>
  );
}

function AiBlock({ ai }: { ai: Asset['ai'] }) {
  if (!ai || (!ai.big_picture && !ai.tactical_now)) {
    return (
      <div className="border-b border-border bg-brand/[0.03] px-5 py-3 text-xs text-fg-dim">
        Foxy yorumu hazırlanıyor… yapısal yorum 45s sonra, taktik yorum 30s sonra düşer.
      </div>
    );
  }
  return (
    <div className="border-b border-border bg-brand/[0.04] px-5 py-3 space-y-2">
      {ai.big_picture ? (
        <div>
          <div className="mono-label !text-brand">Yapısal</div>
          <div className="mt-1 text-sm text-fg leading-relaxed">{ai.big_picture}</div>
        </div>
      ) : null}
      {ai.tactical_now ? (
        <div className="border-t border-brand/15 pt-2">
          <div className="mono-label !text-brand">Şu an</div>
          <div className="mt-1 text-sm text-fg leading-relaxed">{ai.tactical_now}</div>
          {ai.invalidation ? (
            <div className="mt-1 text-[12px] text-fg-muted">
              <span className="text-rose-300">İnvalidasyon:</span> {ai.invalidation}
            </div>
          ) : null}
        </div>
      ) : null}
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
  }> = [];

  tiles.push({
    label: 'OI ↔ Px',
    value: regime.label,
    hint: `OI ${asset.oi_change_24h_pct == null ? '—' : (asset.oi_change_24h_pct >= 0 ? '+' : '') + asset.oi_change_24h_pct.toFixed(1) + '%'} · Px ${asset.price_change_24h_pct == null ? '—' : (asset.price_change_24h_pct >= 0 ? '+' : '') + asset.price_change_24h_pct.toFixed(1) + '%'}`,
    tone: regime.tone,
  });

  if (asset.basis && basis) {
    tiles.push({
      label: 'Basis',
      value: `${asset.basis.premium_pct >= 0 ? '+' : ''}${asset.basis.premium_pct.toFixed(3)}%`,
      hint: basis.label,
      tone: basis.tone,
    });
  }

  if (fv && fvCopy) {
    tiles.push({
      label: 'Funding velocity',
      value: `${fv.current_pct >= 0 ? '+' : ''}${fv.current_pct.toFixed(4)}%`,
      hint: fvCopy.label,
      tone: fvCopy.tone,
    });
  }

  if (etf) {
    tiles.push({
      label: `ETF · ${etf.date}`,
      value: `${etf.net_usd_m >= 0 ? '+' : ''}$${etf.net_usd_m.toFixed(1)}M`,
      hint: etf.net_usd_m > 0 ? 'kurumsal giriş' : etf.net_usd_m < 0 ? 'kurumsal çıkış' : 'flat',
      tone: etf.net_usd_m > 50 ? 'green' : etf.net_usd_m < -50 ? 'red' : 'gray',
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
    <div className="grid grid-cols-2 gap-2 border-b border-border bg-bg/40 px-5 py-3 sm:grid-cols-4">
      {tiles.map((t, i) => (
        <ContextTile key={i} {...t} />
      ))}
    </div>
  );
}

function ContextTile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: 'green' | 'red' | 'amber' | 'sky' | 'gray';
}) {
  const cls = {
    green: 'text-emerald-300',
    red: 'text-rose-300',
    amber: 'text-amber-300',
    sky: 'text-sky-300',
    gray: 'text-fg',
  }[tone];
  return (
    <div className="rounded-lg border border-white/5 bg-bg/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-fg-dim">{label}</div>
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
        Son tick'te flip yok — sinyaller stabil.
      </div>
    );
  }
  return (
    <div className="px-5 py-3">
      <div className="mono-label !text-fg-dim mb-2">Son flipler</div>
      <div className="flex flex-wrap gap-1.5">
        {flips.slice(0, 5).map((f, i) => (
          <span
            key={i}
            className={`rounded-full border px-2 py-0.5 text-[10px] font-mono ${
              f.to === 'long'
                ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                : f.to === 'short'
                  ? 'border-rose-400/30 bg-rose-400/10 text-rose-200'
                  : 'border-amber-400/30 bg-amber-400/10 text-amber-200'
            }`}
          >
            {f.tf}: {f.from}→{f.to} · {ago(f.at)}
          </span>
        ))}
      </div>
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

function ConfidenceBar({ confidence, dir }: { confidence: number; dir: SignalKind }) {
  const pct = Math.round(confidence * 100);
  const fill = dir === 'long' ? 'bg-emerald-400' : dir === 'short' ? 'bg-rose-400' : 'bg-amber-400';
  return (
    <div className="mt-2 h-1.5 w-32 overflow-hidden rounded-full bg-white/5">
      <div className={fill} style={{ width: `${pct}%`, height: '100%' }} />
    </div>
  );
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
