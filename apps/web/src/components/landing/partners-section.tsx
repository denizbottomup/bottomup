'use client';

import { useState } from 'react';
import { useT } from '@/lib/i18n';

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
  const { t } = useT();
  return (
    <section className="relative border-y border-border bg-bg-card/30">
      <div className="mx-auto max-w-[1400px] px-4 py-12 md:px-8 md:py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1fr_1px_1fr]">
          <div>
            <div className="mono-label !text-fg-dim">{t.partners.exchanges}</div>
            <div className="mt-5 grid grid-cols-2 items-center gap-x-6 gap-y-5 sm:grid-cols-4">
              {PARTNERS.map((p) => (
                <BrandMark key={p.slug} brand={p} />
              ))}
            </div>
          </div>

          <div className="hidden bg-border md:block" />

          <div>
            <div className="mono-label !text-fg-dim">{t.partners.backed_by}</div>
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
 * Wordmark-first brand renderer. The previous implementation relied
 * on `onError` to swap a broken `<img>` for a styled wordmark — which
 * worked in dev but failed on the production build: 404s arrived as
 * native broken-image icons before React could rehydrate and fire the
 * error handler, leaving "[broken icon] Bybit" stripes visible above
 * the fold. We now render the wordmark first and only reveal an `<img>`
 * if it actually loads (onLoad). If `/partners/{slug}.svg` lands on
 * disk later, the next build picks it up and the wordmark steps aside
 * automatically — no component change needed.
 */
function BrandMark({ brand }: { brand: Brand }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  return (
    <div className="relative flex h-10 items-center justify-center">
      <span
        className={`select-none text-center font-extrabold uppercase tracking-[0.08em] text-fg-muted transition hover:text-fg ${
          imageLoaded ? 'invisible' : ''
        }`}
        style={{
          fontSize: clampSize(brand.name),
          letterSpacing: brand.name.length > 14 ? '0.06em' : '0.1em',
        }}
      >
        {brand.name}
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/partners/${brand.slug}.svg`}
        alt=""
        aria-hidden="true"
        loading="lazy"
        onLoad={(e) => {
          // naturalWidth === 0 catches the case where a placeholder
          // (e.g. an HTML 404 page served as text/html) "loaded" but
          // contains no image data — keep the wordmark visible.
          if ((e.target as HTMLImageElement).naturalWidth > 0) {
            setImageLoaded(true);
          }
        }}
        className={`absolute inset-0 m-auto h-8 w-auto max-w-[150px] object-contain opacity-70 transition hover:opacity-100 ${
          imageLoaded ? '' : 'opacity-0 pointer-events-none'
        }`}
      />
    </div>
  );
}

function clampSize(name: string): string {
  if (name.length >= 20) return '11px';
  if (name.length >= 14) return '13px';
  return '16px';
}
