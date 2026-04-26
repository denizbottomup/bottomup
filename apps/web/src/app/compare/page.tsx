import type { Metadata } from 'next';
import Link from 'next/link';
import { LandingFooter } from '@/components/landing/landing-footer';
import { LandingNav } from '@/components/landing/nav';
import { COMPARISONS } from '@/content/compare';

const TITLE = 'BottomUP comparisons — copy trading platforms compared';
const DESCRIPTION =
  'Side-by-side comparisons of BottomUP and the major copy-trading platforms: signal audit, asset class, transparency, pricing, and availability.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: 'https://bottomup.app/compare' },
  openGraph: {
    type: 'website',
    url: 'https://bottomup.app/compare',
    siteName: 'BottomUP',
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    site: '@bottomupsocial',
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function CompareIndexPage() {
  return (
    <div className="min-h-screen">
      <LandingNav />
      <main className="mx-auto max-w-[960px] px-4 py-12 md:px-6 md:py-20">
        <header className="mb-12">
          <div className="mono-label">Compare</div>
          <h1 className="mt-2 text-4xl font-extrabold tracking-[-0.02em] md:text-5xl">
            How BottomUP compares
          </h1>
          <p className="mt-4 max-w-2xl text-fg-muted md:text-lg">
            Architectural comparisons against the major copy-trading
            platforms. Each page lists the axes that actually differ — signal
            audit, publisher universe, regulation, transparency — without
            value judgement.
          </p>
        </header>

        <ul className="grid gap-4 md:grid-cols-2">
          {COMPARISONS.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/compare/${c.slug}`}
                className="block rounded-2xl border border-border bg-bg-card/40 p-5 transition hover:border-white/30"
              >
                <div className="text-lg font-semibold">
                  BottomUP vs {c.competitor}
                </div>
                <p className="mt-2 text-sm text-fg-muted">{c.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <LandingFooter />
    </div>
  );
}
