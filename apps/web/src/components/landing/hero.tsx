import Link from 'next/link';
import type { LandingPayload } from './landing-data';

export function Hero({ data }: { data: LandingPayload | null }) {
  const stats = data?.stats;

  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-200px] h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-brand/10 blur-[120px]" />
        <div className="absolute right-[-100px] top-[100px] h-[400px] w-[400px] rounded-full bg-amber-400/5 blur-[80px]" />
      </div>

      <div className="mx-auto max-w-[1400px] px-4 pb-14 pt-12 md:px-8 md:pb-20 md:pt-20">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] text-emerald-300">
            <ShieldIcon />
            Foxy AI Shield — active risk audit on every trade
          </div>
          <h1 className="mt-6 text-[44px] font-semibold leading-[1.03] tracking-tight md:text-[64px] lg:text-[76px]">
            The App Store of <span className="text-brand">Smart Money.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-fg-muted md:text-lg">
            Elite traders, AI agents, and algorithmic bots — one marketplace.
            Subscribe to the best strategies across Crypto (and soon Stocks,
            Forex, Commodities), protected by Foxy AI's risk firewall.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="btn-primary animate-glow px-5 py-3 text-base"
            >
              Get started free
            </Link>
            <a href="#foxy" className="btn-ghost px-5 py-3 text-base">
              How Foxy protects you →
            </a>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            <AssetChip label="Crypto" live />
            <AssetChip label="Stocks" />
            <AssetChip label="Forex" />
            <AssetChip label="Commodities" />
          </div>
        </div>

        {stats ? (
          <div className="mx-auto mt-14 grid max-w-5xl grid-cols-2 gap-3 md:grid-cols-4">
            <KpiCard
              label="Trade volume"
              value="$1.59B"
              sub="Lifetime"
            />
            <KpiCard
              label="Downloads"
              value="107K+"
              sub="Organic · $0 CAC"
            />
            <KpiCard
              label="Monthly active"
              value="18.4K"
              sub="DAU/MAU 24%"
            />
            <KpiCard
              label="Trustpilot"
              value="4.4 / 5"
              sub="Excellent"
              tone="success"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function AssetChip({ label, live }: { label: string; live?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${
        live
          ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
          : 'border-border bg-bg-card text-fg-muted'
      }`}
    >
      {live ? (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-fg-dim" />
      )}
      {label}
      {!live ? (
        <span className="text-[9px] uppercase tracking-wider text-fg-dim">
          soon
        </span>
      ) : null}
    </span>
  );
}

function KpiCard({
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
    <div className="rounded-2xl border border-border bg-bg-card p-4 text-left">
      <div className="text-[10px] uppercase tracking-wider text-fg-dim">
        {label}
      </div>
      <div
        className={`mt-1 text-2xl font-semibold md:text-3xl ${
          tone === 'success' ? 'text-emerald-300' : 'text-fg'
        }`}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-fg-muted">{sub}</div>
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
