import type { Metadata } from 'next';
import Link from 'next/link';
import { LandingFooter } from '@/components/landing/landing-footer';
import { LandingNav } from '@/components/landing/nav';
import { POSTS } from '@/content/blog';

const TITLE = 'BottomUP Blog — copy trading, AI agents, crypto market data';
const DESCRIPTION =
  'Long-form posts on social copy trading, AI portfolio management, crypto trading bots, AI risk firewalls, and the state of TradFi AI agents.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: 'https://bottomup.app/blog' },
  openGraph: {
    type: 'website',
    url: 'https://bottomup.app/blog',
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

export default function BlogIndexPage() {
  const sorted = [...POSTS].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="min-h-screen">
      <LandingNav />
      <main className="mx-auto max-w-[900px] px-4 py-14 md:px-6 md:py-20">
        <header className="mb-12">
          <div className="mono-label">Blog</div>
          <h1 className="mt-2 text-4xl font-extrabold tracking-[-0.02em] md:text-5xl">
            Field notes on copy trading,{' '}
            <span className="logo-gradient pb-1">AI agents</span>, and risk.
          </h1>
          <p className="mt-4 max-w-2xl text-fg-muted md:text-lg">
            Deep dives we wish were on the internet when we started building
            BottomUP. Mostly product-agnostic — written for people figuring
            out how copy trading, trading bots, and AI risk audit actually
            work.
          </p>
        </header>

        <ul className="space-y-8">
          {sorted.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="group block rounded-2xl border border-border bg-bg-card/60 p-6 transition hover:border-white/20 hover:bg-bg-card md:p-7"
              >
                <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-fg-dim">
                  <time dateTime={post.date}>{formatDate(post.date)}</time>
                  <span>·</span>
                  <span>{post.readMinutes} min read</span>
                </div>
                <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-fg group-hover:text-brand md:text-3xl">
                  {post.title}
                </h2>
                <p className="mt-3 text-fg-muted">{post.description}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {post.keywords.slice(0, 4).map((k) => (
                    <span
                      key={k}
                      className="rounded-full border border-border bg-bg-card/50 px-2 py-0.5 font-mono text-[10px] text-fg-muted"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <LandingFooter />
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
