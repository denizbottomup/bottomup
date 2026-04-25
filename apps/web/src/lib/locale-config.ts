/**
 * Server-safe locale registry. Lives outside `i18n.tsx` (which is a
 * client component) so Server Components, middleware, layout, sitemap,
 * and metadata helpers can all import LOCALES without crossing the
 * client/server boundary.
 *
 * Keep this list in sync with `apps/workers/src/news-translator/locales.ts`.
 */
export const LOCALES = [
  { code: 'en', label: 'English', native: 'English', flag: '🇺🇸' },
  { code: 'tr', label: 'Turkish', native: 'Türkçe', flag: '🇹🇷' },
  { code: 'es', label: 'Spanish', native: 'Español', flag: '🇪🇸' },
  { code: 'pt', label: 'Portuguese', native: 'Português', flag: '🇧🇷' },
  { code: 'ru', label: 'Russian', native: 'Русский', flag: '🇷🇺' },
  { code: 'vi', label: 'Vietnamese', native: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'id', label: 'Indonesian', native: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'zh', label: 'Chinese', native: '中文', flag: '🇨🇳' },
  { code: 'ko', label: 'Korean', native: '한국어', flag: '🇰🇷' },
  { code: 'ar', label: 'Arabic', native: 'العربية', flag: '🇦🇪' },
] as const;

export type LocaleCode = (typeof LOCALES)[number]['code'];

export function isLocale(code: string): code is LocaleCode {
  return LOCALES.some((l) => l.code === code);
}

/**
 * Map a locale code to its public URL prefix.
 * `en` lives at the canonical root; everything else gets a 2-letter
 * prefix.
 */
export function localePath(code: LocaleCode): string {
  return code === 'en' ? '/' : `/${code}`;
}
