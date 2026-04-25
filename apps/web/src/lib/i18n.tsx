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
import { LOCALES, type LocaleCode } from './locale-config';

export type { Dict } from './locales/schema';
export { LOCALES, type LocaleCode, localePath, isLocale } from './locale-config';

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

function isLocale(code: string): code is LocaleCode {
  return LOCALES.some((l) => l.code === code);
}

/**
 * Wraps the app with a locale-aware translation context.
 *
 * Server components in `app/[locale]/page.tsx` (and the root) pass the
 * URL-derived `initialLocale` so the very first render is already in
 * the user's language — no English flash. The provider then keeps the
 * `<html lang>` and `<html dir>` attributes in sync on the client and
 * persists the choice to a cookie so the next request to the bare
 * root could redirect (future work) or simply remember.
 */
export function LocaleProvider({
  children,
  initialLocale = 'en',
}: {
  children: ReactNode;
  initialLocale?: LocaleCode;
}) {
  const [locale, setLocaleState] = useState<LocaleCode>(initialLocale);

  // Keep state in sync if the route changes (e.g. user clicks the
  // language switcher and we navigate to `/tr`).
  useEffect(() => {
    setLocaleState(initialLocale);
  }, [initialLocale]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
      document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    }
  }, [locale]);

  const setLocale = useCallback((code: LocaleCode) => {
    setLocaleState(code);
    // Persist for non-app contexts (e.g. ?locale-aware API calls
    // from client code) and so the choice survives a hard reload.
    try {
      if (typeof document !== 'undefined') {
        const expires = new Date();
        expires.setFullYear(expires.getFullYear() + 1);
        document.cookie = `${COOKIE}=${code}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
      }
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

