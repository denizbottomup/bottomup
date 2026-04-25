import type { MetadataRoute } from 'next';
import { LOCALES } from '@/lib/locale-config';

const BASE = 'https://bupcore.ai';

/**
 * Public sitemap. Each locale variant of the landing page is listed
 * with proper hreflang `alternates.languages` so Google can serve the
 * right one per user — Turkish searcher gets /tr, Spanish gets /es,
 * etc.
 *
 * The canonical English version lives at "/", every other locale at
 * its prefix. The auth-free legal pages currently live on the trade
 * subdomain, so they're not listed here.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Build the alternates map once — every entry shares it because
  // they're all the same page, just in different languages.
  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    languages[l.code] = l.code === 'en' ? `${BASE}/` : `${BASE}/${l.code}`;
  }

  const landingEntries: MetadataRoute.Sitemap = LOCALES.map((l) => ({
    url: l.code === 'en' ? `${BASE}/` : `${BASE}/${l.code}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: l.code === 'en' ? 1.0 : 0.9,
    alternates: { languages },
  }));

  return landingEntries;
}
