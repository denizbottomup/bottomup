import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { LocaleProvider } from '@/lib/i18n';
import type { LocaleCode } from '@/lib/locale-config';
import { CookieBanner } from '@/components/cookie-banner';
import { GtmNoScript, GtmScript } from '@/components/gtm';
import './globals.css';

const KNOWN_LOCALES: LocaleCode[] = [
  'en',
  'tr',
  'es',
  'pt',
  'ru',
  'vi',
  'id',
  'zh',
  'ko',
  'ar',
];

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

const TITLE = 'BottomUP — AI-protected social copy trading marketplace';
const DESCRIPTION =
  'BottomUP is the App Store of smart money: a marketplace for AI-based portfolio management, automated copy trading, and algorithmic crypto bots. Every signal is audited by the Foxy AI risk firewall across 225 data sources before it reaches your wallet.';

export const metadata: Metadata = {
  metadataBase: new URL('https://bottomup.app'),
  title: {
    default: TITLE,
    template: '%s · BottomUP',
  },
  description: DESCRIPTION,
  applicationName: 'BottomUP',
  // Search-keyword surface area targeting the user-intent queries we
  // care about: social/copy trading, AI portfolio management, crypto
  // signals, AI-agent / algorithmic-bot marketplaces.
  keywords: [
    'social trading',
    'copy trading',
    'auto copy trading',
    'automated copy trading',
    'AI portfolio management',
    'AI-based portfolio management',
    'crypto signals',
    'crypto trading bots',
    'algorithmic trading marketplace',
    'AI trading agents',
    'AI risk firewall',
    'Foxy AI',
    'BottomUP',
    'OKX copy trading',
    'crypto trade copying',
    'smart money crypto',
  ],
  authors: [{ name: 'BottomUP, Inc.', url: 'https://bottomup.app' }],
  creator: 'BottomUP, Inc.',
  publisher: 'BottomUP, Inc.',
  category: 'finance',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    // The 1200×630 image is generated at build time by
    // app/opengraph-image.tsx; Next.js auto-injects it into the OG
    // meta tags for every route, so we don't list `images` here.
    type: 'website',
    locale: 'en_US',
    url: 'https://bottomup.app',
    siteName: 'BottomUP',
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    site: '@bottomupsocial',
    creator: '@bottomupsocial',
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  verification: {
    other: {
      // Bing Webmaster Tools site ownership verification.
      'msvalidate.01': '970D91B67F55D795CC10BC42C0DA252D',
    },
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The middleware sets `x-locale` on every request to either the
  // path-derived locale (e.g. `/tr` → "tr") or "en" for the canonical
  // root. Reading it here lets us SSR the correct `<html lang dir>`
  // without flashing English first.
  const h = await headers();
  const headerLocale = (h.get('x-locale') ?? 'en') as LocaleCode;
  const locale: LocaleCode = KNOWN_LOCALES.includes(headerLocale)
    ? headerLocale
    : 'en';
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} className={inter.variable}>
      <head>
        <GtmScript />
      </head>
      <body>
        <GtmNoScript />
        <LocaleProvider initialLocale={locale}>
          <AuthProvider>{children}</AuthProvider>
          <CookieBanner />
        </LocaleProvider>
      </body>
    </html>
  );
}
