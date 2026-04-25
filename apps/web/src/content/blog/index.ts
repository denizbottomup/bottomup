/**
 * Blog post registry.
 *
 * Each entry maps a slug (URL segment) to its MDX module path and
 * the metadata Next.js needs at build time for routing, sitemaps,
 * Schema.org Article markup, and the `/blog` listing page.
 *
 * Adding a new post:
 *   1. Drop `<slug>.mdx` into `apps/web/src/content/blog/posts/`.
 *   2. Add a `Post` entry below referencing it.
 *   3. The post is automatically picked up by:
 *        - `/blog` index page (sorted by date desc)
 *        - `/blog/<slug>` SSG route
 *        - `sitemap.xml` (priority 0.7, changefreq monthly)
 *        - per-post Article + BreadcrumbList JSON-LD
 *
 * The metadata here is the source of truth for SEO. Do NOT
 * duplicate title/description into the MDX file.
 */

export interface Post {
  /** URL slug — `apps/web/src/app/blog/[slug]/page.tsx` matches this. */
  slug: string;
  /** Title used in <h1>, og:title, twitter:title, sitemap entry. */
  title: string;
  /** Meta description (~155 chars). Drives SERP snippet + og:description. */
  description: string;
  /** ISO date the post first published. Drives <article:published_time>. */
  date: string;
  /** ISO date of the latest meaningful edit. Optional; defaults to `date`. */
  modified?: string;
  /** Long-tail keyword cluster — fed into the Article keywords + meta. */
  keywords: string[];
  /** Estimated read time in minutes — shown in the listing card. */
  readMinutes: number;
  /** Lazy-loaded MDX content. Returns `{ default: ComponentType }`. */
  mdx: () => Promise<{ default: React.ComponentType }>;
}

export const POSTS: Post[] = [
  {
    slug: 'what-is-auto-copy-trading',
    title:
      'What is auto copy trading? A 2026 guide for retail crypto traders',
    description:
      'Auto copy trading lets you mirror professional traders in real time, but it can also mirror their losses. Here is how it works in 2026 and what to look for in a platform.',
    date: '2026-04-25',
    keywords: [
      'auto copy trading',
      'automated copy trading',
      'crypto copy trading',
      'social trading',
      'how copy trading works',
      'copy trading risks',
    ],
    readMinutes: 7,
    mdx: () => import('./posts/what-is-auto-copy-trading.mdx'),
  },
  {
    slug: 'ai-portfolio-management-crypto',
    title:
      'AI portfolio management for crypto: how it actually works in 2026',
    description:
      'AI portfolio management has gone from buzzword to working product in 2026. We break down what AI agents actually do for crypto portfolios — risk, rebalancing, signal audit — and what they still cannot.',
    date: '2026-04-25',
    keywords: [
      'AI portfolio management',
      'AI crypto management',
      'AI trading agents',
      'automated portfolio management',
      'crypto AI assistant',
    ],
    readMinutes: 8,
    mdx: () => import('./posts/ai-portfolio-management-crypto.mdx'),
  },
  {
    slug: 'crypto-trading-bots-vs-copy-trading',
    title:
      'Crypto trading bots vs. copy trading: which one is right for you?',
    description:
      'Trading bots execute predefined logic 24/7. Copy trading mirrors a human or AI that you trust. The right choice depends on three questions — and most retail traders pick the wrong one.',
    date: '2026-04-25',
    keywords: [
      'crypto trading bots',
      'trading bot vs copy trading',
      'algorithmic trading',
      'crypto automation',
      'best crypto trading platform',
    ],
    readMinutes: 6,
    mdx: () => import('./posts/crypto-trading-bots-vs-copy-trading.mdx'),
  },
  {
    slug: 'tradfi-ai-agents-explained',
    title:
      'TradFi AI agents, explained: when traditional finance meets autonomous AI',
    description:
      "Autonomous AI agents are landing on traditional finance rails — equities, FX, commodities — not just crypto. We map who's building what, what works today, and where the regulators are pushing back.",
    date: '2026-04-25',
    keywords: [
      'TradFi AI agents',
      'financial AI agents',
      'AI in traditional finance',
      'autonomous trading agents',
      'AI broker',
    ],
    readMinutes: 8,
    mdx: () => import('./posts/tradfi-ai-agents-explained.mdx'),
  },
  {
    slug: 'foxy-ai-risk-firewall-how-it-works',
    title:
      'How an AI risk firewall protects copy traders from blow-ups',
    description:
      'Standard copy trading mirrors whatever the publisher sends — including 50× revenge trades. An AI risk firewall intercepts that signal before execution and blocks it. Here is how the audit works.',
    date: '2026-04-25',
    keywords: [
      'AI risk firewall',
      'crypto risk management',
      'copy trading safety',
      'Foxy AI',
      'trade audit',
    ],
    readMinutes: 6,
    mdx: () => import('./posts/foxy-ai-risk-firewall-how-it-works.mdx'),
  },
];

export const POST_BY_SLUG: Record<string, Post> = Object.fromEntries(
  POSTS.map((p) => [p.slug, p]),
);
