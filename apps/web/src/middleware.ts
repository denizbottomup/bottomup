import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// bupcore.ai        = landing only, serves `/`. Anything else forwards to trade.
// trade.bupcore.ai  = auth + product. `/` redirects to `/signin` (which itself
//                     bounces to `/app` if the user is already logged in).
// localhost / preview domains fall through untouched so dev acts as a single app.

const LANDING_HOSTS = new Set(['bupcore.ai', 'www.bupcore.ai']);
const TRADE_HOST = 'trade.bupcore.ai';

export function middleware(req: NextRequest): NextResponse {
  const host = (req.headers.get('host') ?? '').toLowerCase();
  const { pathname, search } = req.nextUrl;

  if (LANDING_HOSTS.has(host)) {
    if (pathname === '/' || pathname === '') return NextResponse.next();
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

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/|api/|favicon.ico|icon.png|logos/|.*\\..*).*)'],
};
