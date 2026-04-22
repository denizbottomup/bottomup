import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Monorepo: trace files from the workspace root so standalone output
  // includes hoisted node_modules correctly. Without this, Next.js emits
  // `.next/standalone/apps/web/server.js` with missing deps.
  outputFileTracingRoot: join(__dirname, '../../'),
  experimental: {
    externalDir: true,
  },
};

export default nextConfig;
