/**
 * Locales the marketing site (bupcore.ai) supports. English is the
 * source language — every other locale is translated by the news
 * translator worker into the `news_text` table.
 *
 * Keep this list in sync with `apps/web/src/lib/i18n.tsx::LOCALES`.
 */
export interface TranslateLocale {
  code: string;
  /** Native-language name handed to the LLM in the prompt. */
  nativeName: string;
}

export const TARGET_LOCALES: TranslateLocale[] = [
  { code: 'tr', nativeName: 'Turkish (Türkçe)' },
  { code: 'es', nativeName: 'Spanish (Español)' },
  { code: 'pt', nativeName: 'Brazilian Portuguese (Português do Brasil)' },
  { code: 'ru', nativeName: 'Russian (Русский)' },
  { code: 'vi', nativeName: 'Vietnamese (Tiếng Việt)' },
  { code: 'id', nativeName: 'Indonesian (Bahasa Indonesia)' },
  { code: 'zh', nativeName: 'Simplified Chinese (简体中文)' },
  { code: 'ko', nativeName: 'Korean (한국어)' },
  { code: 'ar', nativeName: 'Modern Standard Arabic (العربية الفصحى)' },
];

export const TARGET_LOCALE_CODES = TARGET_LOCALES.map((l) => l.code);
