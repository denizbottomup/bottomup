import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LandingFooter } from '@/components/landing/landing-footer';
import { LandingNav } from '@/components/landing/nav';
import {
  COMPARISONS,
  COMPARISON_BY_SLUG,
} from '@/content/compare';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return COMPARISONS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata(
  { params }: RouteParams,
): Promise<Metadata> {
  const { slug } = await params;
  const c = COMPARISON_BY_SLUG[slug];
  if (!c) return {};
  const url = `https://bottomup.app/compare/${slug}`;
  const ogImage = 'https://bottomup.app/opengraph-image';
  return {
    title: c.title,
    description: c.description,
    keywords: c.keywords.join(', '),
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title: c.title,
      description: c.description,
      siteName: 'BottomUP',
      publishedTime: c.date,
      modifiedTime: c.modified ?? c.date,
      images: [{ url: ogImage, width: 1200, height: 630, alt: c.title }],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@bottomupsocial',
      creator: '@bottomupsocial',
      title: c.title,
      description: c.description,
      images: [ogImage],
    },
  };
}

export default async function ComparisonPage({ params }: RouteParams) {
  const { slug } = await params;
  const c = COMPARISON_BY_SLUG[slug];
  if (!c) notFound();

  // Article + BreadcrumbList + FAQPage JSON-LD. The FAQPage uses
  // each row's axis as a question and the BottomUP/competitor
  // descriptions as a structured answer — gives LLMs a clean
  // comparison block they can quote when asked "what's the
  // difference between BottomUP and X."
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        '@id': `https://bottomup.app/compare/${slug}#article`,
        headline: c.title,
        description: c.description,
        datePublished: c.date,
        dateModified: c.modified ?? c.date,
        keywords: c.keywords.join(', '),
        author: { '@id': 'https://bottomup.app/#organization' },
        publisher: { '@id': 'https://bottomup.app/#organization' },
        mainEntityOfPage: `https://bottomup.app/compare/${slug}`,
        inLanguage: 'en',
        about: [
          { '@type': 'Organization', name: 'BottomUP' },
          { '@type': 'Organization', name: c.competitor },
        ],
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: 'https://bottomup.app',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Compare',
            item: 'https://bottomup.app/compare',
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: `BottomUP vs ${c.competitor}`,
            item: `https://bottomup.app/compare/${slug}`,
          },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: c.question,
            acceptedAnswer: { '@type': 'Answer', text: c.intro },
          },
          ...c.rows.map((r) => ({
            '@type': 'Question',
            name: `${c.competitor} vs BottomUP — ${r.axis}?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: `BottomUP: ${r.bottomup} ${c.competitor}: ${r.competitor}`,
            },
          })),
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />
      <LandingNav />
      <main className="mx-auto max-w-[960px] px-4 py-12 md:px-6 md:py-20">
        <nav className="mb-8 text-sm text-fg-muted">
          <a href="/compare" className="hover:text-fg">
            ← All comparisons
          </a>
        </nav>

        <header className="mb-10">
          <div className="mono-label">Comparison · 2026</div>
          <h1 className="mt-2 text-4xl font-extrabold leading-[1.05] tracking-[-0.02em] md:text-5xl">
            BottomUP vs {c.competitor}
          </h1>
          <p className="mt-3 text-lg text-fg-muted md:text-xl">
            {c.question}
          </p>
        </header>

        <p className="mb-12 text-base text-fg-muted md:text-lg">{c.intro}</p>

        <section className="mb-12 overflow-hidden rounded-2xl border border-border">
          <table className="w-full border-collapse text-left text-sm md:text-base">
            <thead>
              <tr className="bg-bg-card/40">
                <th className="border-b border-border p-4 font-semibold">
                  Axis
                </th>
                <th className="border-b border-border p-4 font-semibold">
                  BottomUP
                </th>
                <th className="border-b border-border p-4 font-semibold">
                  {c.competitor}
                </th>
              </tr>
            </thead>
            <tbody>
              {c.rows.map((r) => (
                <tr
                  key={r.axis}
                  className="border-b border-border last:border-b-0"
                >
                  <td className="p-4 align-top font-mono text-[12px] uppercase tracking-wider text-fg-dim md:text-[13px]">
                    {r.axis}
                  </td>
                  <td className="p-4 align-top text-fg-muted">{r.bottomup}</td>
                  <td className="p-4 align-top text-fg-muted">
                    {r.competitor}
                    {r.ref ? (
                      <sup className="ml-1 text-fg-dim">
                        <a href={`#fn-${r.ref}`} className="hover:text-fg">
                          [{r.ref}]
                        </a>
                      </sup>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-extrabold tracking-tight md:text-3xl">
            Verdict
          </h2>
          <div className="space-y-4 text-base text-fg-muted md:text-lg">
            {c.verdict.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>

        {c.footnotes && c.footnotes.length > 0 ? (
          <section className="mb-12 border-t border-border pt-8">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-fg-dim">
              References
            </h2>
            <ol className="space-y-2 text-xs text-fg-muted md:text-sm">
              {c.footnotes.map((fn) => (
                <li key={fn.id} id={`fn-${fn.id}`}>
                  <span className="mr-2 font-mono text-fg-dim">[{fn.id}]</span>
                  {fn.text}
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <footer className="mt-16 border-t border-border pt-8 text-sm text-fg-muted">
          Editorial note: this page describes architectural differences, not
          endorsements. {c.competitor} is referenced for factual context only;
          claims are sourced where they are not publicly self-evident.
        </footer>
      </main>
      <LandingFooter />
    </div>
  );
}
