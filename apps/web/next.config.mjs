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
};

export default withMDX(nextConfig);
