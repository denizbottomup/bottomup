import Link from 'next/link';

export function FinalCta() {
  return (
    <section className="relative overflow-hidden border-t border-border">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/15 blur-[120px]" />
      </div>
      <div className="mx-auto max-w-[1100px] px-4 py-16 text-center md:px-8 md:py-24">
        <h2 className="text-4xl font-extrabold leading-[1.02] tracking-[-0.02em] md:text-6xl">
          Copy smart money.{' '}
          <span className="logo-gradient">Let Foxy filter the rest.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm text-fg-muted md:text-base">
          Traders, bots, and AI agents run live on the marketplace right now.
          Every signal audited. Every trade optimized. Sign up in 30 seconds
          and start browsing shops.
        </p>
        <p className="mx-auto mt-2 max-w-xl text-[11px] text-fg-dim">
          Not investment advice. Crypto trading carries a high risk of loss.
          Copy-trading is not available to U.S. persons.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/signup" className="btn-primary px-6 py-3 text-base">
            Get started free →
          </Link>
          <Link href="/signin" className="btn-ghost px-6 py-3 text-base">
            Sign in
          </Link>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-5 text-[11px] text-fg-dim">
          <span>✓ No credit card</span>
          <span>✓ 30-second signup</span>
          <span>✓ Delete anytime</span>
        </div>
      </div>
    </section>
  );
}
