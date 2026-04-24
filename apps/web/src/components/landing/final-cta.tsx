import Link from 'next/link';

export function FinalCta() {
  return (
    <section className="relative overflow-hidden border-t border-border">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/15 blur-[120px]" />
      </div>
      <div className="mx-auto max-w-[1100px] px-4 py-16 text-center md:px-8 md:py-24">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-3 py-1 text-xs text-brand">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
          $10,000 virtual portfolio — instant on signup
        </div>
        <h2 className="mt-5 text-3xl font-semibold leading-tight md:text-5xl">
          Don't miss the next{' '}
          <span className="text-brand">winning setup.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm text-fg-muted md:text-base">
          The top crypto traders are live right now. Sign up, build your team,
          track your portfolio — go live on OKX when you're ready.
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
