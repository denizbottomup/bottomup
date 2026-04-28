'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://bottomupapi-production.up.railway.app';

interface AssetMarket {
  price: number;
  change_24h_pct: number;
  high_24h: number | null;
  low_24h: number | null;
  quote_volume_24h: number | null;
}

interface Derivatives {
  coin: string;
  liquidation: {
    long_24h_usd: number;
    short_24h_usd: number;
    total_24h_usd: number;
    total_4h_usd: number;
    total_1h_usd: number;
  } | null;
  oi: {
    oi_usd: number;
    change_4h_pct: number | null;
    change_24h_pct: number | null;
  } | null;
  long_short: {
    long_ratio: number;
    short_ratio: number;
    ts: number;
  } | null;
  funding: {
    rate: number;
    annualized_pct: number;
    next_funding_ts: number | null;
  } | null;
}

interface Whales {
  coin: string;
  window_hours: number;
  min_usd: number;
  total: number;
  flows: {
    cex_in_usd: number;
    cex_out_usd: number;
    between_usd: number;
  };
}

interface OverviewAsset {
  coin: string;
  market: AssetMarket | null;
  derivatives: Derivatives | null;
  whales: Whales | null;
  ai_brief: string;
}

interface OverviewPayload {
  assets: OverviewAsset[];
  generated_at: string;
  cached_for_seconds: number;
}

/**
 * Overview — daily market briefing for the Phase-1 coin set
 * (BTC + ETH). Calls `/me/overview` which is server-side cached for
 * 5 minutes and shared across all viewers, so loading the tab does
 * NOT consume any per-user weekly Foxy quota.
 *
 * Each asset card shows live market header (price + 24h change),
 * the four derivatives blocks (OI, funding, L/S, liquidations) plus
 * Arkham flow totals, and a 2-3 paragraph Claude-generated tactical
 * brief: where longs get blown out, where shorts cap, directional
 * bias, entry zones.
 */
export default function OverviewPage() {
  const { getIdToken } = useAuth();
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);
    (async () => {
      const token = await getIdToken();
      if (!token) {
        if (alive) {
          setErr('Auth gerekli.');
          setLoading(false);
        }
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/me/overview`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as OverviewPayload;
        if (alive) {
          setData(json);
          setLoading(false);
        }
      } catch (x) {
        if (alive) {
          setErr((x as Error).message);
          setLoading(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [getIdToken, reloadKey]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex flex-col gap-1 border-b border-border px-4 py-4 md:px-8 md:py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="mono-label !text-brand">Overview · daily brief</div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight md:text-3xl">
              Bugün piyasada ne oluyor?
            </h1>
          </div>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-fg-muted hover:border-white/25 hover:text-fg transition"
          >
            ↻ Yenile
          </button>
        </div>
        <p className="max-w-2xl text-sm text-fg-muted">
          BTC ve ETH için CoinGlass türev verileri, Arkham balina akışları ve
          Binance fiyatı ile sentezlenmiş analiz. Long ve short likidasyon
          kümeleri, fonlama yönü, balina pozisyonu — tek ekranda.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        <div className="mx-auto max-w-6xl">
          {loading ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : err ? (
            <div className="rounded-2xl border border-rose-400/30 bg-rose-500/[0.06] px-5 py-4 text-sm text-rose-200">
              Overview alınamadı: {err}
            </div>
          ) : data ? (
            <>
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {data.assets.map((a) => (
                  <AssetCard key={a.coin} asset={a} />
                ))}
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-[11px] text-fg-dim">
                <div>
                  Son güncelleme:{' '}
                  {new Date(data.generated_at).toLocaleTimeString('tr-TR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  · {Math.round(data.cached_for_seconds / 60)} dakika cache
                </div>
                <div>
                  Foxy AI yorumu yatırım tavsiyesi değildir.
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AssetCard({ asset }: { asset: OverviewAsset }) {
  return (
    <section className="rounded-2xl border border-border bg-bg-card overflow-hidden">
      <AssetHeader coin={asset.coin} market={asset.market} />

      <div className="grid grid-cols-2 gap-3 border-b border-border px-5 py-4 md:grid-cols-4">
        <OiMini oi={asset.derivatives?.oi ?? null} />
        <FundingMini fund={asset.derivatives?.funding ?? null} />
        <LongShortMini ls={asset.derivatives?.long_short ?? null} />
        <LiqMini liq={asset.derivatives?.liquidation ?? null} />
      </div>

      <WhaleStrip whales={asset.whales} />

      <div className="px-5 py-4">
        <div className="mono-label !text-brand mb-2">Foxy yorumu</div>
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-fg">
          {asset.ai_brief || 'AI özeti şu an oluşturulamadı.'}
        </div>
      </div>
    </section>
  );
}

function AssetHeader({
  coin,
  market,
}: {
  coin: string;
  market: AssetMarket | null;
}) {
  const change = market?.change_24h_pct ?? null;
  const tone =
    change == null
      ? 'text-fg-dim'
      : change >= 0
        ? 'text-emerald-300'
        : 'text-rose-300';
  const bg =
    change == null
      ? 'bg-white/5'
      : change >= 0
        ? 'bg-emerald-400/10 ring-emerald-400/30'
        : 'bg-rose-400/10 ring-rose-400/30';

  const range = useMemo(() => {
    if (!market || market.high_24h == null || market.low_24h == null) return null;
    const span = market.high_24h - market.low_24h;
    if (span <= 0) return null;
    const pos = ((market.price - market.low_24h) / span) * 100;
    return Math.max(0, Math.min(100, pos));
  }, [market]);

  return (
    <div className="border-b border-border px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/15 text-brand font-bold">
            {coin[0]}
          </div>
          <div>
            <div className="mono-label !text-fg-dim">Asset</div>
            <h2 className="text-xl font-extrabold tracking-tight">
              {coin}{' '}
              <span className="text-fg-dim font-mono text-sm">/USDT</span>
            </h2>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-fg font-mono">
            {market ? `$${formatPrice(market.price)}` : '—'}
          </div>
          {change != null ? (
            <span
              className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-mono ring-1 ${bg} ${tone}`}
            >
              {change >= 0 ? '+' : ''}
              {change.toFixed(2)}% 24h
            </span>
          ) : null}
        </div>
      </div>

      {market && range != null ? (
        <div className="mt-3">
          <div className="relative h-1 rounded-full bg-white/5">
            <div
              className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-brand"
              style={{ left: `calc(${range.toFixed(1)}% - 6px)` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px] font-mono text-fg-dim">
            <span>L ${formatPrice(market.low_24h ?? 0)}</span>
            <span>H ${formatPrice(market.high_24h ?? 0)}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function OiMini({ oi }: { oi: Derivatives['oi'] }) {
  if (!oi) return <Mini label="Open interest" value="—" />;
  const tone =
    oi.change_24h_pct == null
      ? 'text-fg'
      : oi.change_24h_pct >= 0
        ? 'text-emerald-300'
        : 'text-rose-300';
  return (
    <Mini
      label="Open interest"
      value={formatUsdShort(oi.oi_usd)}
      hint={
        <span className={`font-mono ${tone}`}>
          {oi.change_24h_pct == null
            ? '24h —'
            : `24h ${oi.change_24h_pct >= 0 ? '+' : ''}${oi.change_24h_pct.toFixed(2)}%`}
        </span>
      }
    />
  );
}

function FundingMini({ fund }: { fund: Derivatives['funding'] }) {
  if (!fund) return <Mini label="Funding" value="—" />;
  const tone = fund.rate >= 0 ? 'text-emerald-300' : 'text-rose-300';
  return (
    <Mini
      label="Funding"
      value={
        <span className={tone}>
          {(fund.rate * 100).toFixed(4)}%
        </span>
      }
      hint={
        <span className="font-mono text-fg-dim">
          yıllık {fund.annualized_pct >= 0 ? '+' : ''}
          {fund.annualized_pct.toFixed(1)}%
        </span>
      }
    />
  );
}

function LongShortMini({ ls }: { ls: Derivatives['long_short'] }) {
  if (!ls) return <Mini label="L / S" value="—" />;
  const ratio = ls.long_ratio / Math.max(0.01, ls.short_ratio);
  const total = ls.long_ratio + ls.short_ratio || 1;
  const longPct = (ls.long_ratio / total) * 100;
  return (
    <Mini
      label="Long / Short"
      value={`${ratio.toFixed(2)}×`}
      hint={
        <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-rose-400/20">
          <div
            className="bg-emerald-400"
            style={{ width: `${longPct.toFixed(1)}%` }}
          />
        </div>
      }
    />
  );
}

function LiqMini({ liq }: { liq: Derivatives['liquidation'] }) {
  if (!liq) return <Mini label="Liq 24h" value="—" />;
  const longPct =
    liq.total_24h_usd > 0
      ? (liq.long_24h_usd / liq.total_24h_usd) * 100
      : 50;
  return (
    <Mini
      label="Liq 24h"
      value={formatUsdShort(liq.total_24h_usd)}
      hint={
        <div>
          <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-rose-400/20">
            <div
              className="bg-emerald-400"
              style={{ width: `${longPct.toFixed(1)}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[9px] font-mono">
            <span className="text-emerald-300">
              {formatUsdShort(liq.long_24h_usd)}
            </span>
            <span className="text-rose-300">
              {formatUsdShort(liq.short_24h_usd)}
            </span>
          </div>
        </div>
      }
    />
  );
}

function Mini({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg p-3">
      <div className="text-[10px] uppercase tracking-wider text-fg-dim">
        {label}
      </div>
      <div className="mt-1 text-base font-bold text-fg">{value}</div>
      {hint ? <div className="mt-0.5 text-[10px]">{hint}</div> : null}
    </div>
  );
}

function WhaleStrip({ whales }: { whales: Whales | null }) {
  if (!whales) {
    return (
      <div className="border-b border-border px-5 py-3 text-[11px] text-fg-dim">
        Bu coin için Arkham haritalı değil — balina verisi yok.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-3 border-b border-border px-5 py-4">
      <FlowTile
        label="Borsalara giriş"
        tone="rose"
        value={whales.flows.cex_in_usd}
        hint="CEX'e gönderildi"
      />
      <FlowTile
        label="Borsadan çıkış"
        tone="emerald"
        value={whales.flows.cex_out_usd}
        hint="CEX'ten çekildi"
      />
      <FlowTile
        label="Cüzdan→cüzdan"
        tone="neutral"
        value={whales.flows.between_usd}
        hint={`son ${whales.window_hours}h`}
      />
    </div>
  );
}

function FlowTile({
  label,
  tone,
  value,
  hint,
}: {
  label: string;
  tone: 'rose' | 'emerald' | 'neutral';
  value: number;
  hint: string;
}) {
  const cls =
    tone === 'rose'
      ? 'text-rose-300'
      : tone === 'emerald'
        ? 'text-emerald-300'
        : 'text-fg';
  return (
    <div className="rounded-xl border border-border bg-bg p-3">
      <div className="text-[10px] uppercase tracking-wider text-fg-dim">
        {label}
      </div>
      <div className={`mt-1 text-base font-bold ${cls}`}>
        {formatUsdShort(value)}
      </div>
      <div className="mt-0.5 text-[10px] text-fg-dim">{hint}</div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border bg-bg-card overflow-hidden">
      <div className="border-b border-border px-5 py-4">
        <div className="h-4 w-24 animate-pulse rounded bg-white/[0.06]" />
        <div className="mt-3 h-7 w-32 animate-pulse rounded bg-white/[0.06]" />
      </div>
      <div className="grid grid-cols-2 gap-3 border-b border-border px-5 py-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-xl border border-border bg-white/[0.03]"
          />
        ))}
      </div>
      <div className="px-5 py-6 space-y-3">
        <div className="h-3 w-full animate-pulse rounded bg-white/[0.05]" />
        <div className="h-3 w-11/12 animate-pulse rounded bg-white/[0.05]" />
        <div className="h-3 w-9/12 animate-pulse rounded bg-white/[0.05]" />
        <div className="h-3 w-10/12 animate-pulse rounded bg-white/[0.05]" />
      </div>
    </div>
  );
}

function formatUsdShort(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function formatPrice(n: number): string {
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(4);
  if (n >= 0.01) return n.toFixed(5);
  return n.toFixed(8);
}
