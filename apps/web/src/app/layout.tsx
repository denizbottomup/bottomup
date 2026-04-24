import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  metadataBase: new URL('https://bupcore.ai'),
  title: {
    default: 'bupcore — Social crypto trading',
    template: '%s · bupcore',
  },
  description:
    "Follow the setups of top crypto traders in real time. Foxy AI risk verdict, OKX copy trading, and a $10,000 virtual portfolio on every free signup.",
  keywords: [
    'crypto',
    'social trading',
    'copy trading',
    'OKX',
    'trading signals',
    'bupcore',
    'bottomup',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://bupcore.ai',
    siteName: 'bupcore',
    title: 'bupcore — Social crypto trading',
    description:
      '$10,000 virtual portfolio, live trader signals, Foxy AI risk verdict, and OKX copy trading. Test first — go live when you\'re up.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'bupcore — Social crypto trading',
    description:
      '$10,000 virtual portfolio, live trader signals, Foxy AI, OKX copy trading.',
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
