import type { Metadata } from 'next';
import { LOCALES, type LocaleCode } from '@/lib/locale-config';
import { en } from '@/lib/locales/en';
import { tr } from '@/lib/locales/tr';
import { es } from '@/lib/locales/es';
import { pt } from '@/lib/locales/pt';
import { ru } from '@/lib/locales/ru';
import { vi } from '@/lib/locales/vi';
import { id } from '@/lib/locales/id';
import { zh } from '@/lib/locales/zh';
import { ko } from '@/lib/locales/ko';
import { ar } from '@/lib/locales/ar';
import type { Dict } from '@/lib/locales/schema';

const DICTS: Record<LocaleCode, Dict> = {
  en,
  tr,
  es,
  pt,
  ru,
  vi,
  id,
  zh,
  ko,
  ar,
};

// Primary canonical for the marketing site. bupcore.ai is the lab
// alias — same code, same deploy — but every canonical link points
// here so SEO equity consolidates on the older, more-trusted domain.
const SITE = 'https://bottomup.app';

/** Maps our 2-letter locale codes to OG `locale` BCP-47 tags. */
const OG_LOCALE: Record<LocaleCode, string> = {
  en: 'en_US',
  tr: 'tr_TR',
  es: 'es_ES',
  pt: 'pt_BR',
  ru: 'ru_RU',
  vi: 'vi_VN',
  id: 'id_ID',
  zh: 'zh_CN',
  ko: 'ko_KR',
  ar: 'ar_AE',
};

function pathFor(locale: LocaleCode): string {
  return locale === 'en' ? '/' : `/${locale}`;
}

/**
 * Returns Next.js Metadata for the landing page in the given locale.
 *
 * - `alternates.canonical` points at this locale's URL — Google treats
 *   this as the version of record for the language.
 * - `alternates.languages` declares every locale's URL plus the
 *   `x-default` (used when no language matches the user). The
 *   x-default goes to "/" (English) per Google's convention.
 *
 * This is what unlocks per-language SERP results for queries like
 * "kopya trade" (Turkish) → /tr or "复制交易" (Chinese) → /zh.
 */
export function landingMetadata(locale: LocaleCode): Metadata {
  const t = DICTS[locale];
  const url = `${SITE}${pathFor(locale)}`;

  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    languages[l.code] = `${SITE}${pathFor(l.code)}`;
  }
  languages['x-default'] = `${SITE}/`;

  return {
    title: t.meta.title,
    description: t.meta.description,
    keywords: t.meta.keywords,
    alternates: {
      canonical: url,
      languages,
    },
    openGraph: {
      type: 'website',
      url,
      siteName: 'BottomUP',
      locale: OG_LOCALE[locale],
      title: t.meta.title,
      description: t.meta.description,
    },
    twitter: {
      card: 'summary_large_image',
      site: '@bottomupsocial',
      creator: '@bottomupsocial',
      title: t.meta.title,
      description: t.meta.description,
    },
  };
}
