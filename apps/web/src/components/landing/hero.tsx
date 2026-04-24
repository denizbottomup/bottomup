import Link from 'next/link';
import type { LandingPayload } from './landing-data';

export function Hero({ data }: { data: LandingPayload | null }) {
  void data;

  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 grid-pattern" />
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-220px] h-[720px] w-[1200px] -translate-x-1/2 rounded-full bg-brand/15 blur-[150px]" />
        <div className="absolute right-[-160px] top-[80px] h-[480px] w-[480px] rounded-full bg-violet/20 blur-[120px]" />
        <div className="absolute left-[-140px] top-[260px] h-[440px] w-[440px] rounded-full bg-sky/15 blur-[130px]" />
        <div className="absolute bottom-[-200px] right-[25%] h-[360px] w-[360px] rounded-full bg-mint/15 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-[1400px] px-4 pb-16 pt-14 md:px-8 md:pb-24 md:pt-24">
        <div className="mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/[0.08] px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-emerald-300 backdrop-blur">
            <ShieldIcon />
            Foxy AI Shield · active
            <span className="mx-1 h-1 w-1 rounded-full bg-emerald-400/60" />
            225 data sources
          </div>
          <h1 className="mt-7 text-[48px] font-extrabold leading-[0.95] tracking-[-0.03em] md:text-[84px] lg:text-[104px]">
            <span className="block">The App Store of</span>
            <span className="block logo-gradient">Smart Money.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-fg-muted md:text-lg">
            Automated portfolio management that lets anyone mirror elite
            traders and AI agents via a decentralized marketplace.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="btn-primary animate-glow px-6 py-3.5 text-base font-semibold"
            >
              Start free →
            </Link>
            <a
              href="#foxy"
              className="btn-ghost px-6 py-3.5 text-base font-semibold"
            >
              How Foxy protects you
            </a>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            <AssetChip label="Crypto" live />
            <AssetChip label="Stocks" />
            <AssetChip label="Forex" />
            <AssetChip label="Commodities" />
          </div>
        </div>

        <div className="mx-auto mt-16 max-w-5xl">
          <div className="relative rounded-2xl border border-border bg-bg-card/60 p-[1px] backdrop-blur corner-ticks">
            <div className="grid grid-cols-2 divide-x divide-border rounded-[calc(1rem-1px)] bg-bg-card/80 md:grid-cols-4">
              <Kpi label="Trade volume" value="$1.59B" sub="Lifetime" />
              <Kpi label="Downloads" value="107K+" sub="$0 CAC" />
              <Kpi label="MAU" value="18.4K" sub="DAU/MAU 24%" />
              <Kpi
                label="Trustpilot"
                value="4.4 / 5"
                sub="Excellent"
                tone="success"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AssetChip({ label, live }: { label: string; live?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider backdrop-blur ${
        live
          ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
          : 'border-border bg-bg-card/50 text-fg-muted'
      }`}
    >
      {live ? (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-fg-dim" />
      )}
      {label}
      {!live ? (
        <span className="text-[9px] opacity-70">soon</span>
      ) : null}
    </span>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  sub: string;
  tone?: 'neutral' | 'success';
}) {
  return (
    <div className="p-5 text-left md:p-6">
      <div className="mono-label !text-fg-dim">{label}</div>
      <div
        className={`stat-num mt-2 text-3xl font-bold tracking-tight md:text-4xl ${
          tone === 'success' ? 'text-emerald-300' : 'text-fg'
        }`}
      >
        {value}
      </div>
      <div className="mt-1 text-[11px] text-fg-muted">{sub}</div>
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
