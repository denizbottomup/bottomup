import Link from 'next/link';
import { displayName, type LandingPayload } from './landing-data';

export function Hero({ data }: { data: LandingPayload | null }) {
  const stats = data?.stats;
  const topTraders = (data?.top_traders ?? []).slice(0, 3);
  const latestSetup = data?.latest_setups?.[0];

  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-200px] h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-brand/10 blur-[120px]" />
        <div className="absolute right-[-100px] top-[100px] h-[400px] w-[400px] rounded-full bg-amber-400/5 blur-[80px]" />
      </div>

      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-12 px-4 pb-12 pt-10 md:px-8 md:pb-16 md:pt-16 lg:grid-cols-[1fr_540px] lg:gap-8">
        <div className="flex flex-col justify-center">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-[11px] text-brand">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
            10.000$ sanal kasa · üye olunca anında
          </div>
          <h1 className="mt-5 text-[40px] font-semibold leading-[1.05] tracking-tight md:text-[56px] lg:text-[64px]">
            Kripto işlemini <span className="text-brand">trader'lara</span> bırak.
          </h1>
          <p className="mt-5 max-w-[540px] text-base text-fg-muted md:text-lg">
            Bottomup, Türkiye'nin en çok takip edilen kripto analistlerinin
            setup'larını canlı yayınlıyor. Ücretsiz üye ol, takımını kur,
            10.000$ sanal kasada dene — hazır olduğunda OKX üzerinden gerçek
            kopya trade'e geç.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/signup"
              className="btn-primary animate-glow px-5 py-3 text-base"
            >
              Ücretsiz üye ol — 10.000$ kasa hediye
            </Link>
            <Link href="/signin" className="btn-ghost px-5 py-3 text-base">
              Giriş yap
            </Link>
          </div>

          {stats ? (
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-border pt-6">
              <Stat
                label="Aktif trader"
                value={stats.total_traders.toLocaleString('tr-TR')}
              />
              <Stat
                label="Canlı setup"
                value={stats.active_setups.toLocaleString('tr-TR')}
              />
              <Stat
                label="30g başarı"
                value={
                  stats.success_rate_30d == null
                    ? '—'
                    : `%${Math.round(stats.success_rate_30d * 100)}`
                }
                tone="success"
              />
            </dl>
          ) : null}
        </div>

        <div className="relative">
          <div className="relative rounded-2xl border border-border bg-bg-card/60 p-4 shadow-2xl backdrop-blur md:p-5">
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-wider text-fg-muted">
                Canlı akış · son sinyaller
              </div>
              <span className="flex items-center gap-1.5 text-[10px] text-emerald-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                live
              </span>
            </div>

            {latestSetup ? (
              <HeroSetupCard setup={latestSetup} />
            ) : (
              <div className="mt-3 h-24 rounded-xl bg-white/[0.02]" />
            )}

            <div className="mt-4 space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-fg-muted">
                Liderler
              </div>
              {topTraders.length > 0 ? (
                topTraders.map((t) => (
                  <HeroTraderRow key={t.trader_id} trader={t} />
                ))
              ) : (
                <div className="h-16 rounded-xl bg-white/[0.02]" />
              )}
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl border border-brand/20 bg-brand/5 p-3">
              <div className="text-xs text-fg">
                <div className="font-semibold text-brand">
                  10.000$ sanal kasa hazır
                </div>
                <div className="text-[11px] text-fg-muted">
                  Üye ol, takımını kur, performansı gör
                </div>
              </div>
              <Link
                href="/signup"
                className="rounded-md bg-brand px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-brand-dark"
              >
                Başla →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'success';
}) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-fg-dim">{label}</dt>
      <dd
        className={`mt-0.5 text-xl font-semibold md:text-2xl ${
          tone === 'success' ? 'text-emerald-300' : 'text-fg'
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function HeroSetupCard({
  setup,
}: {
  setup: LandingPayload['latest_setups'][0];
}) {
  const isLong = setup.position === 'long';
  const isShort = setup.position === 'short';
  const tone = isLong
    ? 'text-emerald-300'
    : isShort
      ? 'text-rose-300'
      : 'text-fg-dim';

  return (
    <div className="mt-3 rounded-xl border border-border bg-bg-card p-3 animate-fade-in">
      <div className="flex items-center gap-3">
        {setup.coin_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={setup.coin_image}
            alt=""
            className="h-9 w-9 rounded-full object-cover ring-1 ring-white/10"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 font-mono text-xs text-fg-muted ring-1 ring-white/10">
            {setup.coin_name.slice(0, 3)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-fg">
              {setup.coin_name}
            </span>
            <span className={`text-[11px] font-medium ${tone}`}>
              {isLong ? 'Long' : isShort ? 'Short' : '—'}
            </span>
            <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-fg-dim">
              {setup.category}
            </span>
          </div>
          <div className="mt-0.5 text-[11px] text-fg-dim">
            {setup.trader_name ?? '—'}
          </div>
        </div>
        {setup.r_value != null ? (
          <span className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-[11px] text-fg-muted ring-1 ring-white/10">
            R {setup.r_value.toFixed(1)}
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex items-center gap-3 font-mono text-[11px]">
        <PriceChip label="Giriş" value={setup.entry_value} tone="brand" />
        {setup.stop_value != null ? (
          <PriceChip label="Stop" value={setup.stop_value} tone="rose" />
        ) : null}
        {setup.profit_taking_1 != null ? (
          <PriceChip label="TP" value={setup.profit_taking_1} tone="emerald" />
        ) : null}
      </div>
    </div>
  );
}

function PriceChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'brand' | 'rose' | 'emerald';
}) {
  const toneClass =
    tone === 'brand'
      ? 'text-brand'
      : tone === 'rose'
        ? 'text-rose-300'
        : 'text-emerald-300';
  return (
    <div className="flex items-center gap-1">
      <span className="text-fg-dim">{label}</span>
      <span className={toneClass}>{formatPrice(value)}</span>
    </div>
  );
}

function formatPrice(n: number): string {
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(3);
  if (n >= 0.01) return n.toFixed(4);
  return n.toFixed(6);
}

function HeroTraderRow({
  trader,
}: {
  trader: LandingPayload['top_traders'][0];
}) {
  const name = displayName(trader);
  const roi = trader.monthly_roi;
  return (
    <div className="flex items-center gap-3 rounded-lg bg-white/[0.02] px-3 py-2">
      {trader.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={trader.image}
          alt=""
          className="h-7 w-7 rounded-full object-cover ring-1 ring-white/10"
        />
      ) : (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-[10px] font-semibold text-fg ring-1 ring-white/10">
          {name[0]?.toUpperCase() ?? '?'}
        </div>
      )}
      <span className="flex-1 truncate text-xs text-fg">{name}</span>
      <span className="text-[10px] text-fg-dim">{trader.followers} tk.</span>
      {roi != null ? (
        <span
          className={`w-14 text-right font-mono text-xs ${roi >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}
        >
          {roi >= 0 ? '+' : ''}
          {roi.toFixed(1)}%
        </span>
      ) : null}
    </div>
  );
}
