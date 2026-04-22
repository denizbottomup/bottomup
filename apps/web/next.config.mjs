/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    // Let Next.js bundle workspace packages from parent node_modules
    externalDir: true,
  },
};

export default nextConfig;
