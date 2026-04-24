import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  metadataBase: new URL('https://bupcore.ai'),
  title: {
    default: 'bupcore — The App Store of Smart Money',
    template: '%s · bupcore',
  },
  description:
    'Elite traders, AI agents, and algorithmic bots — one marketplace, protected by Foxy AI. Every signal audited across 225 data sources before it reaches your wallet. $1.59B lifetime volume, 4.4/5 Trustpilot.',
  keywords: [
    'crypto',
    'social trading',
    'copy trading',
    'AI risk firewall',
    'Foxy AI',
    'trading marketplace',
    'algorithmic bots',
    'AI agents',
    'OKX',
    'bupcore',
    'bottomup',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://bupcore.ai',
    siteName: 'bupcore',
    title: 'bupcore — The App Store of Smart Money',
    description:
      'Elite traders, AI agents, algorithmic bots — one marketplace, protected by the Foxy AI risk firewall. 225 data sources, live across crypto (stocks, forex, commodities coming).',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'bupcore — The App Store of Smart Money',
    description:
      'One marketplace for elite traders, AI agents, and algorithmic bots. Every signal audited by Foxy AI before execution.',
  },
  icons: { icon: '/icon.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
