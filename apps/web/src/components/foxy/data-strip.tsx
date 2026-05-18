'use client';

import type { CoinMatch } from '@/lib/coin-extract';
import type {
  FoxyDerivatives,
  FoxySetupsByCoin,
  FoxyWhales,
} from './types';

interface Props {
  coin: CoinMatch;
  setups: FoxySetupsByCoin | null;
  derivatives: FoxyDerivatives | null;
  whales: FoxyWhales | null;
  loading: boolean;
}

/**
 * The three context cards that sit under the TradingView chart:
 *   • BottomUP traders — what the on-platform pros are doing
 *   • Borsa canlı — derivatives signals (OI / funding / liq / L-S)
 *   • Arkham on-chain — whale flow direction
 *
 * Every line of copy in these cards must be a *diagnosis*, not a raw
 * metric. Headline metric stays at the top in mono so the trader can
 * skim, but the line under it must explain what that number means.
 */
export function FoxyDataStrip({
  coin,
  setups,
  derivatives,
  whales,
  loading,
}: Props) {
  return (
    <section className="grid gap-3 md:grid-cols-3">
      <TraderCard setups={setups} loading={loading} />
      <DerivCard derivatives={derivatives} loading={loading} />
      <WhaleCard coin={coin} whales={whales} loading={loading} />
    </section>
  );
}

function Card({
  title,
  source,
  children,
}: {
  title: string;
  source: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-bg-card p-4">
      <div className="flex items-baseline justify-between">
        <div className="text-sm font-semibold text-fg">{title}</div>
        <div className="mono-label !text-fg-dim">{source}</div>
      </div>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

function Stat({
  value,
  diagnosis,
  tone = 'neutral',
}: {
  value: string;
  diagnosis: string;
  tone?: 'long' | 'short' | 'neutral';
}) {
  const valueTone =
    tone === 'long'
      ? 'text-mint-soft'
      : tone === 'short'
        ? 'text-rose-200'
        : 'text-fg';
  return (
    <div>
      <div className={`font-mono text-base tabular-nums ${valueTone}`}>{value}</div>
      <div className="text-[11.5px] leading-snug text-fg-muted">{diagnosis}</div>
    </div>
  );
}

function Skeleton() {
  return (
    <>
      <div className="h-3 w-3/4 animate-pulse rounded bg-bg-elev" />
      <div className="h-3 w-1/2 animate-pulse rounded bg-bg-elev" />
      <div className="h-3 w-2/3 animate-pulse rounded bg-bg-elev" />
    </>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="text-[11.5px] text-fg-dim">{msg}</div>;
}

/* ───────────── BottomUP traders ───────────── */

function TraderCard({
  setups,
  loading,
}: {
  setups: FoxySetupsByCoin | null;
  loading: boolean;
}) {
  return (
    <Card title="BottomUP trader'lar" source="topluluk">
      {loading ? (
        <Skeleton />
      ) : !setups || (setups.active.length === 0 && setups.recent.count === 0) ? (
        <Empty msg="Bu coin için aktif setup veya son 30 günlük kapanmış işlem yok." />
      ) : (
        <>
          {setups.active.length > 0 ? (
            <Stat
              value={`${setups.active.length} aktif setup`}
              diagnosis={traderSideDiagnosis(setups)}
              tone={traderTone(setups)}
            />
          ) : (
            <Stat
              value="Aktif setup yok"
              diagnosis="Trader'lar şu an bu coinde pozisyon açmamış."
            />
          )}
          {setups.recent.count > 0 ? (
            <Stat
              value={`%${winRatePct(setups)} win rate · ${formatR(setups.recent.total_r)}R`}
              diagnosis={`Son 30 gün ${setups.recent.count} işlem (${setups.recent.wins}K · ${setups.recent.losses}L · ${setups.recent.break_even}BE).`}
            />
          ) : null}
        </>
      )}
    </Card>
  );
}

function traderSideDiagnosis(s: FoxySetupsByCoin): string {
  const longs = s.active.filter((x) => x.position === 'long').length;
  const shorts = s.active.filter((x) => x.position === 'short').length;
  if (longs === 0 && shorts === 0) return 'Pozisyon yönü belirsiz.';
  if (longs === 0) return `${shorts} short pozisyon — topluluk satış tarafında.`;
  if (shorts === 0) return `${longs} long pozisyon — topluluk alış tarafında.`;
  if (longs > shorts * 1.5)
    return `${longs} long / ${shorts} short — alış baskın.`;
  if (shorts > longs * 1.5)
    return `${shorts} short / ${longs} long — satış baskın.`;
  return `${longs} long / ${shorts} short — taraflar bölünmüş.`;
}

function traderTone(s: FoxySetupsByCoin): 'long' | 'short' | 'neutral' {
  const longs = s.active.filter((x) => x.position === 'long').length;
  const shorts = s.active.filter((x) => x.position === 'short').length;
  if (longs > shorts * 1.5) return 'long';
  if (shorts > longs * 1.5) return 'short';
  return 'neutral';
}

function winRatePct(s: FoxySetupsByCoin): string {
  if (s.recent.win_rate == null) return '–';
  return (s.recent.win_rate * 100).toFixed(0);
}

function formatR(r: number): string {
  const sign = r >= 0 ? '+' : '';
  return `${sign}${r.toFixed(1)}`;
}

/* ───────────── Borsa canlı (derivatives) ───────────── */

function DerivCard({
  derivatives,
  loading,
}: {
  derivatives: FoxyDerivatives | null;
  loading: boolean;
}) {
  return (
    <Card title="Borsa canlı" source="CoinGlass · Binance">
      {loading ? (
        <Skeleton />
      ) : !derivatives ? (
        <Empty msg="Türev verisi şu an çekilemedi." />
      ) : (
        <>
          {derivatives.oi ? (
            <Stat
              value={`OI ${formatUsd(derivatives.oi.oi_usd)}`}
              diagnosis={oiDiagnosis(derivatives.oi.change_4h_pct, derivatives.oi.change_24h_pct)}
              tone={
                (derivatives.oi.change_24h_pct ?? 0) < -2
                  ? 'short'
                  : (derivatives.oi.change_24h_pct ?? 0) > 2
                    ? 'long'
                    : 'neutral'
              }
            />
          ) : null}
          {derivatives.funding ? (
            <Stat
              value={`${(derivatives.funding.rate * 100).toFixed(3)}% funding`}
              diagnosis={fundingDiagnosis(derivatives.funding.annualized_pct)}
              tone={
                derivatives.funding.annualized_pct > 8
                  ? 'long'
                  : derivatives.funding.annualized_pct < -2
                    ? 'short'
                    : 'neutral'
              }
            />
          ) : null}
          {derivatives.liquidation ? (
            <Stat
              value={`Liq 24h ${formatUsd(derivatives.liquidation.total_24h_usd)}`}
              diagnosis={liqDiagnosis(
                derivatives.liquidation.long_24h_usd,
                derivatives.liquidation.short_24h_usd,
              )}
              tone={
                derivatives.liquidation.long_24h_usd >
                derivatives.liquidation.short_24h_usd * 1.4
                  ? 'short'
                  : derivatives.liquidation.short_24h_usd >
                      derivatives.liquidation.long_24h_usd * 1.4
                    ? 'long'
                    : 'neutral'
              }
            />
          ) : null}
        </>
      )}
    </Card>
  );
}

function oiDiagnosis(c4h: number | null, c24h: number | null): string {
  const v = c24h ?? c4h;
  if (v == null) return 'Açık pozisyon hacmi.';
  if (v < -3) return `24h ${v.toFixed(1)}% düştü — long-capitulation sürüyor.`;
  if (v < -1) return `24h ${v.toFixed(1)}% azaldı — pozisyon kapanıyor.`;
  if (v > 3) return `24h +${v.toFixed(1)}% arttı — taze para giriyor.`;
  if (v > 1) return `24h +${v.toFixed(1)}% — pozisyon birikiyor.`;
  return `24h ${v >= 0 ? '+' : ''}${v.toFixed(1)}% — pozisyon değişimi düşük.`;
}

function fundingDiagnosis(annualPct: number): string {
  if (annualPct > 15) return `Yıllık %${annualPct.toFixed(0)} — long-bias şişmiş, squeeze fitili.`;
  if (annualPct > 8) return `Yıllık %${annualPct.toFixed(0)} — long-bias normalin üstünde.`;
  if (annualPct < -5) return `Yıllık %${annualPct.toFixed(0)} — short-bias şişmiş, sıkışmak üzere.`;
  if (annualPct < 0) return `Yıllık %${annualPct.toFixed(0)} — perp'ler hafif satıcı.`;
  return `Yıllık %${annualPct.toFixed(1)} — taraf belirsiz.`;
}

function liqDiagnosis(longUsd: number, shortUsd: number): string {
  if (longUsd > shortUsd * 1.6)
    return `Long ${formatUsd(longUsd)} vs short ${formatUsd(shortUsd)} — long temizliği baskın.`;
  if (shortUsd > longUsd * 1.6)
    return `Short ${formatUsd(shortUsd)} vs long ${formatUsd(longUsd)} — short squeeze baskın.`;
  return `Long ${formatUsd(longUsd)} · short ${formatUsd(shortUsd)} — iki yön de temizlendi.`;
}

/* ───────────── Arkham on-chain ───────────── */

function WhaleCard({
  coin,
  whales,
  loading,
}: {
  coin: CoinMatch;
  whales: FoxyWhales | null;
  loading: boolean;
}) {
  return (
    <Card title="Arkham on-chain" source={`${coin.display} · 24h`}>
      {loading ? (
        <Skeleton />
      ) : !whales || whales.total === 0 ? (
        <Empty msg="Son 24 saatte büyük zincir-üstü hareket yok." />
      ) : (
        <>
          <Stat
            value={`${formatUsd(whales.flows.cex_in_usd)} CEX'e giriş`}
            diagnosis={whaleInDiagnosis(whales.flows.cex_in_usd, whales.flows.cex_out_usd)}
            tone={
              whales.flows.cex_in_usd > whales.flows.cex_out_usd * 1.5
                ? 'short'
                : 'neutral'
            }
          />
          <Stat
            value={`${formatUsd(whales.flows.cex_out_usd)} CEX'ten çıkış`}
            diagnosis={whaleOutDiagnosis(whales.flows.cex_in_usd, whales.flows.cex_out_usd)}
            tone={
              whales.flows.cex_out_usd > whales.flows.cex_in_usd * 1.5
                ? 'long'
                : 'neutral'
            }
          />
          {whales.flows.between_usd > 0 ? (
            <Stat
              value={`${formatUsd(whales.flows.between_usd)} cüzdan↔cüzdan`}
              diagnosis="Borsa dışı transfer — net yön yok."
            />
          ) : null}
        </>
      )}
    </Card>
  );
}

function whaleInDiagnosis(inUsd: number, outUsd: number): string {
  if (inUsd === 0) return 'Borsalara giriş yok.';
  if (inUsd > outUsd * 1.5) return 'Satış baskısı — coin borsaya yığılıyor.';
  if (outUsd > inUsd * 1.5) return 'Çıkıştan az — net hodl tarafı.';
  return 'Giriş ve çıkış dengeli.';
}

function whaleOutDiagnosis(inUsd: number, outUsd: number): string {
  if (outUsd === 0) return 'Borsadan çekiliş yok.';
  if (outUsd > inUsd * 1.5) return 'Akıllı para hodl moduna alıyor.';
  if (inUsd > outUsd * 1.5) return 'Girişten az — net satış tarafı.';
  return 'Çekiliş normal seviyede.';
}

/* ───────────── shared ───────────── */

function formatUsd(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '$0';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}
