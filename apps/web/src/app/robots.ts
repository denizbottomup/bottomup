import type { MetadataRoute } from 'next';

/**
 * Tells crawlers what to index and where the sitemap lives.
 *
 * We allow everything except the authenticated areas (`/account`,
 * `/api/*`) — those are user-private and shouldn't surface in SERPs.
 *
 * AI crawlers (GPTBot, ClaudeBot, PerplexityBot, etc.) are explicitly
 * allowed: surfacing in their training + retrieval pipelines is the
 * point of having the marketing site at all.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/account', '/api/'],
      },
    ],
    sitemap: 'https://bottomup.app/sitemap.xml',
    host: 'https://bottomup.app',
  };
}
