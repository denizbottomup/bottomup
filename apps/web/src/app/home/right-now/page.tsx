'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://bottomupapi-production.up.railway.app';

const POLL_MS = 60_000; // backend ticks every 60s, sync the UI to that.

type SignalKind = 'long' | 'short' | 'wait';
type Tf = '5m' | '15m' | '1h';

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

interface Asset {
  coin: string;
  tf_5m: TfBlock | null;
  tf_15m: TfBlock | null;
  tf_1h: TfBlock | null;
  combined: SignalKind;
  combined_confidence: number;
  ai: {
    headline: string;
    invalidation: string;
    generated_at: string;
  } | null;
}

interface Payload {
  assets: Asset[];
  computed_at: string;
  ai_at: string | null;
}

/**
 * Right Now — anlık AI yön sinyali. Backend her 60 saniyede
 * deterministic confluence skoru üretir, her 5 dakikada Sonnet
 * overlay ekler. UI 60s polling yapıp aynı snapshot'ı yansıtır;
 * büyük yön badge'i + 3 TF detayı + AI headline + invalidation.
 *
 * Tasarım önceliği: kullanıcı sayfaya bir saniye baksın yönü
 * okuyabilsin. Renk + ok + tek cümle yeterli; alt detaylar
 * scalp/swing trader için drilldown.
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
    let pollHandle: ReturnType<typeof setInterval> | null = null;

    const fetchOnce = async () => {
      try {
        if (!tokenRef.current) {
          tokenRef.current = await getIdToken();
        }
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
          // token may have rotated — clear and retry next tick.
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
    pollHandle = setInterval(fetchOnce, POLL_MS);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      alive = false;
      if (pollHandle) clearInterval(pollHandle);
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
          BTC ve ETH için 5dk, 15dk ve 1s zaman dilimlerinde price-action
          (OB / FVG / yapı / RSI), türev verisi (funding, OI, L/S,
          liquidations) ve balina akışı bir arada — kuralsal confluence +
          Foxy AI yorum katmanı. Her 60 saniyede güncellenir.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        <div className="mx-auto max-w-6xl">
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
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {data.assets.map((a) => (
                <AssetCard key={a.coin} asset={a} />
              ))}
            </div>
          ) : null}

          <div className="mt-6 text-[11px] text-fg-dim">
            Right Now bir ticari öneri değildir; deterministic confluence
            skoru + AI yorumu kombinasyonudur. Pozisyon büyüklüğü ve risk
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
      <span>
        {stale ? `gecikti · ${ageS}s` : `canlı · ${ageS}s önce`}
      </span>
    </div>
  );
}

function AssetCard({ asset }: { asset: Asset }) {
  return (
    <section className="rounded-2xl border border-border bg-bg-card overflow-hidden">
      <CombinedHeader asset={asset} />
      {asset.ai ? (
        <AiBlock ai={asset.ai} />
      ) : (
        <div className="border-b border-border bg-brand/[0.03] px-5 py-3 text-xs text-fg-dim">
          Foxy yorumu hazırlanıyor… (ilk overlay 30s sonra düşer, 5 dakikada
          bir tazelenir.)
        </div>
      )}
      <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
        <TfPanel label="5m" tf={asset.tf_5m} />
        <TfPanel label="15m" tf={asset.tf_15m} />
        <TfPanel label="1h" tf={asset.tf_1h} />
      </div>
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

function AiBlock({ ai }: { ai: NonNullable<Asset['ai']> }) {
  return (
    <div className="border-b border-border bg-brand/[0.04] px-5 py-3">
      <div className="mono-label !text-brand">Foxy yorumu</div>
      <div className="mt-1 text-sm text-fg">{ai.headline}</div>
      <div className="mt-1 text-[12px] text-fg-muted">
        <span className="text-rose-300">İnvalidasyon:</span> {ai.invalidation}
      </div>
    </div>
  );
}

function TfPanel({ label, tf }: { label: string; tf: TfBlock | null }) {
  if (!tf) {
    return (
      <div className="px-5 py-4">
        <div className="mono-label !text-fg-dim">{label}</div>
        <div className="mt-2 text-sm text-fg-muted">Hesaplanıyor…</div>
      </div>
    );
  }
  const tone = directionTone(tf.signal);
  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between">
        <div className="mono-label !text-fg-dim">{label}</div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ${tone.pillBg} ${tone.pillRing} ${tone.text}`}>
          {directionLabel(tf.signal)}
        </span>
      </div>
      <div className={`mt-2 flex items-center gap-1.5 text-base font-extrabold ${tone.text}`}>
        <DirectionGlyph dir={tf.signal} small />
        <span>{Math.round(tf.confidence * 100)}%</span>
        <span className="text-[10px] font-mono font-normal text-fg-dim">güven</span>
      </div>

      <div className="mt-3 space-y-1.5 text-[11px] font-mono text-fg-muted">
        {tf.key_levels.entry_low != null && tf.key_levels.entry_high != null ? (
          <Row
            label={tf.signal === 'wait' ? 'Aralık' : 'Giriş bölgesi'}
            value={`$${formatPrice(tf.key_levels.entry_low)}–$${formatPrice(tf.key_levels.entry_high)}`}
          />
        ) : null}
        {tf.key_levels.invalidation != null ? (
          <Row
            label="İnvalidasyon"
            value={`$${formatPrice(tf.key_levels.invalidation)}`}
            tone="rose"
          />
        ) : null}
        {tf.key_levels.target != null ? (
          <Row
            label="Hedef"
            value={`$${formatPrice(tf.key_levels.target)}`}
            tone="emerald"
          />
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {tf.factors.slice(0, 4).map((f, i) => (
          <span
            key={i}
            className={`rounded-full border px-2 py-0.5 text-[10px] font-mono ${
              f.weight > 0
                ? 'border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-200'
                : 'border-rose-400/25 bg-rose-400/[0.06] text-rose-200'
            }`}
          >
            {f.weight > 0 ? '+' : ''}
            {f.weight.toFixed(2)} {f.label}
          </span>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-3 text-[10px] font-mono text-fg-dim">
        {tf.pa.rsi14 != null ? <span>RSI {tf.pa.rsi14.toFixed(0)}</span> : null}
        <span>EMA: {tf.pa.ema_aligned}</span>
        <span>{labelStructure(tf.pa.structure)}</span>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'rose' | 'emerald';
}) {
  const cls =
    tone === 'rose'
      ? 'text-rose-200'
      : tone === 'emerald'
        ? 'text-emerald-200'
        : 'text-fg';
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-fg-dim">{label}</span>
      <span className={cls}>{value}</span>
    </div>
  );
}

function ConfidenceBar({ confidence, dir }: { confidence: number; dir: SignalKind }) {
  const pct = Math.round(confidence * 100);
  const fill =
    dir === 'long'
      ? 'bg-emerald-400'
      : dir === 'short'
        ? 'bg-rose-400'
        : 'bg-amber-400';
  return (
    <div className="mt-2 h-1.5 w-32 overflow-hidden rounded-full bg-white/5">
      <div className={fill} style={{ width: `${pct}%`, height: '100%' }} />
    </div>
  );
}

function DirectionGlyph({
  dir,
  small,
}: {
  dir: SignalKind;
  small?: boolean;
}) {
  const cls = small ? 'h-3 w-3' : 'h-5 w-5';
  if (dir === 'long') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={cls}>
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    );
  }
  if (dir === 'short') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={cls}>
        <path d="M12 5v14M5 12l7 7 7-7" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={cls}>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

function directionTone(dir: SignalKind): {
  text: string;
  bg: string;
  border: string;
  pillBg: string;
  pillRing: string;
} {
  if (dir === 'long') {
    return {
      text: 'text-emerald-300',
      bg: 'bg-emerald-400/[0.06]',
      border: 'border-emerald-400/20',
      pillBg: 'bg-emerald-400/10',
      pillRing: 'ring-emerald-400/30',
    };
  }
  if (dir === 'short') {
    return {
      text: 'text-rose-300',
      bg: 'bg-rose-400/[0.06]',
      border: 'border-rose-400/20',
      pillBg: 'bg-rose-400/10',
      pillRing: 'ring-rose-400/30',
    };
  }
  return {
    text: 'text-amber-300',
    bg: 'bg-amber-400/[0.04]',
    border: 'border-amber-400/15',
    pillBg: 'bg-amber-400/10',
    pillRing: 'ring-amber-400/30',
  };
}

function directionLabel(dir: SignalKind): string {
  if (dir === 'long') return 'LONG';
  if (dir === 'short') return 'SHORT';
  return 'BEKLE';
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
      return 'yapı yok';
  }
}

function formatPrice(n: number): string {
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(4);
  if (n >= 0.01) return n.toFixed(5);
  return n.toFixed(8);
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
      <div className="grid grid-cols-3 divide-x divide-border">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-3 p-5">
            <div className="h-3 w-12 animate-pulse rounded bg-white/[0.05]" />
            <div className="h-7 w-20 animate-pulse rounded bg-white/[0.06]" />
            <div className="h-3 w-full animate-pulse rounded bg-white/[0.05]" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-white/[0.05]" />
          </div>
        ))}
      </div>
    </div>
  );
}
