import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// bottomup.app      = primary marketing host. Locale-prefixed paths
//                     (/tr, /es, /zh, ...) plus the canonical "/" stay
//                     here. Everything else (auth, app, product) goes
//                     to trade.bupcore.ai.
// bupcore.ai        = secondary alias serving the same landing
//                     content. Canonical link tags point back at
//                     bottomup.app so SEO consolidates on the older,
//                     more-trusted domain.
// trade.bupcore.ai  = auth + product. "/" redirects to /signin (which
//                     itself bounces to /app if the user is already
//                     logged in).
// localhost / preview domains fall through untouched so dev acts as a
// single app.

const LANDING_HOSTS = new Set([
  'bottomup.app',
  'www.bottomup.app',
  'bupcore.ai',
  'www.bupcore.ai',
]);
const TRADE_HOST = 'trade.bupcore.ai';

/** Locales that get their own URL prefix. Default `en` lives at "/". */
const LOCALE_PREFIXES = new Set([
  'tr',
  'es',
  'pt',
  'ru',
  'vi',
  'id',
  'zh',
  'ko',
  'ar',
]);

/**
 * Detect the locale a request belongs to. Returns `en` for the
 * canonical root, or the matched 2-letter prefix when the path starts
 * with one of LOCALE_PREFIXES. The result is forwarded to the app via
 * the `x-locale` header so the root layout can SSR `<html lang dir>`
 * correctly without resorting to client-side mutation.
 */
function detectLocale(pathname: string): string {
  const seg = pathname.split('/')[1] ?? '';
  if (LOCALE_PREFIXES.has(seg)) return seg;
  return 'en';
}

/**
 * True when a path is a landing-page route — root, a locale prefix
 * root (`/tr`), or a path nested under one (`/tr/foo` reserved for
 * future use). Anything else on bupcore.ai is treated as
 * accidentally-on-landing and bounced to trade.
 */
function isLandingPath(pathname: string): boolean {
  if (pathname === '' || pathname === '/') return true;
  const seg = pathname.split('/')[1] ?? '';
  return LOCALE_PREFIXES.has(seg);
}

export function middleware(req: NextRequest): NextResponse {
  const host = (req.headers.get('host') ?? '').toLowerCase();
  const { pathname, search } = req.nextUrl;

  if (LANDING_HOSTS.has(host)) {
    if (isLandingPath(pathname)) {
      const res = NextResponse.next();
      res.headers.set('x-locale', detectLocale(pathname));
      return res;
    }
    const to = new URL(pathname + search, `https://${TRADE_HOST}`);
    return NextResponse.redirect(to, 308);
  }

  if (host === TRADE_HOST) {
    if (pathname === '/' || pathname === '') {
      const to = new URL('/signin', `https://${TRADE_HOST}`);
      return NextResponse.redirect(to, 307);
    }
    return NextResponse.next();
  }

  // Localhost / preview / Vercel deploy URLs: still attach x-locale so
  // SSR works in dev.
  const res = NextResponse.next();
  res.headers.set('x-locale', detectLocale(pathname));
  return res;
}

export const config = {
  matcher: ['/((?!_next/|api/|favicon.ico|icon.png|logos/|.*\\..*).*)'],
};
