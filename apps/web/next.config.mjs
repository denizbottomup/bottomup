import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import createMDX from '@next/mdx';

const __dirname = dirname(fileURLToPath(import.meta.url));

const withMDX = createMDX({
  extension: /\.mdx?$/,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Allow .mdx files to participate in the page graph (we import them
  // explicitly from content/blog/, not as routes).
  pageExtensions: ['ts', 'tsx', 'mdx'],
  // Monorepo: trace files from the workspace root so standalone output
  // includes hoisted node_modules correctly. Without this, Next.js emits
  // `.next/standalone/apps/web/server.js` with missing deps.
  outputFileTracingRoot: join(__dirname, '../../'),
  experimental: {
    externalDir: true,
  },
  async headers() {
    // robots.txt and sitemap.xml ship with `no-store`-ish caching
    // (5 min, must-revalidate) so search engines and AI crawlers always
    // fetch a fresh copy. Without this, Next.js tags /public files as
    // `max-age=31536000, immutable` and CDN caches stick a stale
    // robots.txt for a year — exactly what bit us when an old
    // AI-block file got pinned at the edge.
    return [
      {
        source: '/robots.txt',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=300, must-revalidate' },
        ],
      },
      {
        source: '/sitemap.xml',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=300, must-revalidate' },
        ],
      },
      {
        source: '/.well-known/security.txt',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
    ];
  },
};

export default withMDX(nextConfig);
