'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { en } from './locales/en';
import { tr } from './locales/tr';
import { es } from './locales/es';
import { pt } from './locales/pt';
import { ru } from './locales/ru';
import { vi } from './locales/vi';
import { id } from './locales/id';
import { zh } from './locales/zh';
import { ko } from './locales/ko';
import { ar } from './locales/ar';
import type { Dict } from './locales/schema';

export type { Dict } from './locales/schema';

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

const COOKIE = 'bup-locale';

interface LocaleCtx {
  locale: LocaleCode;
  setLocale: (code: LocaleCode) => void;
  t: Dict;
}

const Ctx = createContext<LocaleCtx | null>(null);

function detectLocale(): LocaleCode {
  if (typeof window === 'undefined') return 'en';
  try {
    const stored = window.localStorage.getItem(COOKIE);
    if (stored && isLocale(stored)) return stored as LocaleCode;
  } catch {
    /* ignore */
  }
  const nav = window.navigator.language.toLowerCase();
  for (const l of LOCALES) {
    if (nav.startsWith(l.code)) return l.code;
  }
  return 'en';
}

function isLocale(code: string): code is LocaleCode {
  return LOCALES.some((l) => l.code === code);
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>('en');

  useEffect(() => {
    setLocaleState(detectLocale());
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
      document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    }
  }, [locale]);

  const setLocale = useCallback((code: LocaleCode) => {
    setLocaleState(code);
    try {
      window.localStorage.setItem(COOKIE, code);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<LocaleCtx>(
    () => ({ locale, setLocale, t: DICTS[locale] }),
    [locale, setLocale],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useT(): LocaleCtx {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error('useT must be used within a LocaleProvider');
  return ctx;
}
