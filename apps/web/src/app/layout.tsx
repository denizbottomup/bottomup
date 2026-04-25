import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { LocaleProvider } from '@/lib/i18n';
import { CookieBanner } from '@/components/cookie-banner';
import { GtmNoScript, GtmScript } from '@/components/gtm';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

const TITLE = 'BottomUP — AI-protected social copy trading marketplace';
const DESCRIPTION =
  'BottomUP is the App Store of smart money: a marketplace for AI-based portfolio management, automated copy trading, and algorithmic crypto bots. Every signal is audited by the Foxy AI risk firewall across 225 data sources before it reaches your wallet.';

export const metadata: Metadata = {
  metadataBase: new URL('https://bupcore.ai'),
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
  authors: [{ name: 'BottomUP, Inc.', url: 'https://bupcore.ai' }],
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
    url: 'https://bupcore.ai',
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
  icons: { icon: '/icon.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <GtmScript />
      </head>
      <body>
        <GtmNoScript />
        <LocaleProvider>
          <AuthProvider>{children}</AuthProvider>
          <CookieBanner />
        </LocaleProvider>
      </body>
    </html>
  );
}
