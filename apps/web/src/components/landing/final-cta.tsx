'use client';

import Link from 'next/link';
import { useT } from '@/lib/i18n';

export function FinalCta() {
  const { t } = useT();
  return (
    <section className="relative overflow-hidden border-t border-border">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/15 blur-[120px]" />
      </div>
      <div className="mx-auto max-w-[1100px] px-4 py-16 text-center md:px-8 md:py-24">
        <h2 className="text-4xl font-extrabold leading-[1.02] tracking-[-0.02em] md:text-6xl">
          {t.final.headline_1}{' '}
          <span className="logo-gradient">{t.final.headline_2}</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm text-fg-muted md:text-base">
          {t.final.sub}
        </p>
        <p className="mx-auto mt-2 max-w-xl text-[11px] text-fg-dim">
          {t.final.disclaimer}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/signup" className="btn-primary px-6 py-3 text-base">
            {t.final.cta_primary}
          </Link>
          <Link href="/signin" className="btn-ghost px-6 py-3 text-base">
            {t.final.cta_secondary}
          </Link>
        </div>
      </div>
    </section>
  );
}
