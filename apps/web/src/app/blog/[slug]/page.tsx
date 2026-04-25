import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LandingFooter } from '@/components/landing/landing-footer';
import { LandingNav } from '@/components/landing/nav';
import { POSTS, POST_BY_SLUG } from '@/content/blog';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(
  { params }: RouteParams,
): Promise<Metadata> {
  const { slug } = await params;
  const post = POST_BY_SLUG[slug];
  if (!post) return {};
  const url = `https://bottomup.app/blog/${slug}`;
  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords.join(', '),
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title: post.title,
      description: post.description,
      siteName: 'BottomUP',
      publishedTime: post.date,
      modifiedTime: post.modified ?? post.date,
      authors: ['https://bottomup.app'],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@bottomupsocial',
      creator: '@bottomupsocial',
      title: post.title,
      description: post.description,
    },
  };
}

export default async function BlogPostPage({ params }: RouteParams) {
  const { slug } = await params;
  const post = POST_BY_SLUG[slug];
  if (!post) notFound();

  const Mod = await post.mdx();
  const Content = Mod.default;

  // Per-post Article + BreadcrumbList JSON-LD. The site-wide
  // Organization graph already lives in <StructuredData /> on the
  // root landing — re-emitting here links the article to the
  // existing Organization @id so search engines treat the blog as
  // first-party content rather than a separate publisher.
  const articleLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        '@id': `https://bottomup.app/blog/${slug}#article`,
        headline: post.title,
        description: post.description,
        datePublished: post.date,
        dateModified: post.modified ?? post.date,
        keywords: post.keywords.join(', '),
        author: {
          '@type': 'Organization',
          '@id': 'https://bottomup.app/#organization',
          name: 'BottomUP',
          url: 'https://bottomup.app',
        },
        publisher: {
          '@id': 'https://bottomup.app/#organization',
        },
        mainEntityOfPage: `https://bottomup.app/blog/${slug}`,
        inLanguage: 'en',
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
            name: 'Blog',
            item: 'https://bottomup.app/blog',
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: post.title,
            item: `https://bottomup.app/blog/${slug}`,
          },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      <LandingNav />
      <main className="mx-auto max-w-[760px] px-4 py-12 md:px-6 md:py-20">
        <nav className="mb-8 text-sm text-fg-muted">
          <a href="/blog" className="hover:text-fg">
            ← All posts
          </a>
        </nav>

        <header className="mb-10">
          <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-fg-dim">
            <time dateTime={post.date}>{formatDate(post.date)}</time>
            <span>·</span>
            <span>{post.readMinutes} min read</span>
          </div>
          <h1 className="mt-3 text-4xl font-extrabold leading-[1.05] tracking-[-0.02em] md:text-5xl">
            {post.title}
          </h1>
          <p className="mt-5 text-lg text-fg-muted">{post.description}</p>
        </header>

        <article className="prose prose-invert max-w-none">
          <Content />
        </article>

        <footer className="mt-16 border-t border-border pt-8">
          <div className="flex flex-wrap gap-2">
            {post.keywords.map((k) => (
              <span
                key={k}
                className="rounded-full border border-border bg-bg-card/50 px-2.5 py-1 font-mono text-[11px] text-fg-muted"
              >
                {k}
              </span>
            ))}
          </div>
          <a
            href="/blog"
            className="mt-8 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"
          >
            ← Back to all posts
          </a>
        </footer>
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
