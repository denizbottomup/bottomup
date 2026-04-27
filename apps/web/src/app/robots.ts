import type { MetadataRoute } from 'next';

/**
 * Dynamic robots.txt — Next.js route handler. We deliberately use a
 * route handler here instead of a static `public/robots.txt` because
 * Railway's managed Cloudflare in front of bottomup.app caches static
 * files as `max-age=31536000, immutable` and pinned a stale AI-block
 * file at the edge for ~7 days. Dynamic routes get `cf-cache-status:
 * DYNAMIC` and respect the short TTL we send back.
 *
 * AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended,
 * Applebot-Extended, CCBot, etc.) are explicitly allowed: surfacing in
 * their training + retrieval pipelines is the whole point of the
 * marketing site and the llms.txt / llms-full.txt investment.
 */
export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/account', '/api/'] },
      { userAgent: 'GPTBot', allow: '/' },
      { userAgent: 'ClaudeBot', allow: '/' },
      { userAgent: 'PerplexityBot', allow: '/' },
      { userAgent: 'Google-Extended', allow: '/' },
      { userAgent: 'Applebot-Extended', allow: '/' },
      { userAgent: 'CCBot', allow: '/' },
    ],
    sitemap: 'https://bottomup.app/sitemap.xml',
    host: 'https://bottomup.app',
  };
}
