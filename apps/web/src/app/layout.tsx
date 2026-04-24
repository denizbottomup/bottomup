import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { LocaleProvider } from '@/lib/i18n';
import { CookieBanner } from '@/components/cookie-banner';
import { GtmNoScript, GtmScript } from '@/components/gtm';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  metadataBase: new URL('https://bupcore.ai'),
  title: {
    default: 'BottomUP — The App Store of Smart Money',
    template: '%s · BottomUP',
  },
  description:
    'Elite traders, AI agents, and algorithmic bots — one marketplace, protected by Foxy AI. Every signal audited across 225 data sources before it reaches your wallet.',
  keywords: [
    'BottomUP',
    'crypto',
    'social trading',
    'copy trading',
    'AI risk firewall',
    'Foxy AI',
    'trading marketplace',
    'algorithmic bots',
    'AI agents',
    'OKX',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://bupcore.ai',
    siteName: 'BottomUP',
    title: 'BottomUP — The App Store of Smart Money',
    description:
      'Elite traders, AI agents, algorithmic bots — one marketplace, protected by the Foxy AI risk firewall. 225 data sources, live across crypto (stocks, forex, commodities coming).',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BottomUP — The App Store of Smart Money',
    description:
      'One marketplace for elite traders, AI agents, and algorithmic bots. Every signal audited by Foxy AI before execution.',
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
