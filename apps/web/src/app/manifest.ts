import type { MetadataRoute } from 'next';

/**
 * Web App Manifest. Two purposes:
 *
 *   1. PWA installability — Chrome/Edge/Safari will offer "Install
 *      app" once the manifest + a service worker are present. We
 *      don't ship an SW yet, so installability falls back to "Add
 *      to home screen" on mobile, which is still useful.
 *   2. Entity reinforcement — Google's SoftwareApplication rich
 *      result expects a manifest reachable from the document, and
 *      LLMs that crawl manifest.webmanifest get an additional
 *      structured signal that this is a real app, not just a
 *      marketing site. Pairs with the JSON-LD SoftwareApplication
 *      graph in `components/landing/structured-data.tsx`.
 *
 * Next.js auto-routes this file to `/manifest.webmanifest` and
 * injects the `<link rel="manifest">` into every page.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BottomUP — AI-protected social copy trading',
    short_name: 'BottomUP',
    description:
      'AI-protected social copy trading marketplace. Mirror elite traders, algorithmic bots, and AI agents — every signal audited by Foxy AI.',
    id: 'https://bottomup.app/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    // Brand colors from the press kit. Theme color is the address-
    // bar tint on Android Chrome; background_color is the splash
    // screen color before the SPA paints.
    theme_color: '#FF8A4C',
    background_color: '#0B0D10',
    lang: 'en',
    categories: ['finance', 'business', 'productivity'],
    icons: [
      {
        src: '/logos/logomark-color.png',
        sizes: '410x410',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
