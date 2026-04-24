'use client';

import { useState } from 'react';

interface Brand {
  name: string;
  slug: string;
}

const PARTNERS: Brand[] = [
  { name: 'OKX', slug: 'okx' },
  { name: 'Bybit', slug: 'bybit' },
  { name: 'Bitget', slug: 'bitget' },
  { name: 'Animoca Brands', slug: 'animoca-brands' },
];

const BACKERS: Brand[] = [
  { name: 'Galata Business Angels', slug: 'galata-business-angels' },
  { name: 'Endeavor', slug: 'endeavor' },
];

export function PartnersSection() {
  return (
    <section className="relative border-y border-border bg-bg-card/30">
      <div className="mx-auto max-w-[1400px] px-4 py-12 md:px-8 md:py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1fr_1px_1fr]">
          <div>
            <div className="mono-label !text-fg-dim">Exchange &amp; ecosystem partners</div>
            <div className="mt-5 grid grid-cols-2 items-center gap-x-6 gap-y-5 sm:grid-cols-4">
              {PARTNERS.map((p) => (
                <BrandMark key={p.slug} brand={p} />
              ))}
            </div>
          </div>

          <div className="hidden bg-border md:block" />

          <div>
            <div className="mono-label !text-fg-dim">Backed by</div>
            <div className="mt-5 grid grid-cols-2 items-center gap-x-6 gap-y-5">
              {BACKERS.map((b) => (
                <BrandMark key={b.slug} brand={b} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Tries /partners/{slug}.svg first; if the asset 404s, falls back to a
 * styled wordmark. Drop a monochrome SVG (white fill, transparent bg)
 * at /apps/web/public/partners/{slug}.svg and it's live on next build.
 */
function BrandMark({ brand }: { brand: Brand }) {
  const [errored, setErrored] = useState(false);
  if (!errored) {
    return (
      <div className="flex h-10 items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/partners/${brand.slug}.svg`}
          alt={brand.name}
          className="h-8 w-auto max-w-[150px] object-contain opacity-70 transition hover:opacity-100"
          onError={() => setErrored(true)}
        />
      </div>
    );
  }
  return (
    <div
      className="flex h-10 select-none items-center justify-center text-center font-extrabold uppercase tracking-[0.08em] text-fg-muted transition hover:text-fg"
      style={{
        fontSize: clampSize(brand.name),
        letterSpacing: brand.name.length > 14 ? '0.06em' : '0.1em',
      }}
    >
      {brand.name}
    </div>
  );
}

function clampSize(name: string): string {
  if (name.length >= 20) return '11px';
  if (name.length >= 14) return '13px';
  return '16px';
}
