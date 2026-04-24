import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  metadataBase: new URL('https://bupcore.ai'),
  title: {
    default: 'bupcore — Kriptoyu okuyan trader topluluğu',
    template: '%s · bupcore',
  },
  description:
    "Türkiye'nin en çok takip edilen kripto analistlerinin setup'ları, Foxy AI risk yorumu, OKX kopya trade ve 10.000$ sanal kasa. Üye ol, takımını kur, performansı izle.",
  keywords: [
    'kripto',
    'trader',
    'kopya trade',
    'copy trading',
    'OKX',
    'kripto sinyal',
    'bottomup',
    'bupcore',
  ],
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    url: 'https://bupcore.ai',
    siteName: 'bupcore',
    title: 'bupcore — Kriptoyu okuyan trader topluluğu',
    description:
      '10.000$ sanal kasa, canlı trader sinyalleri, Foxy AI risk yorumu ve OKX kopya trade. Para koymadan dene; kazandığında canlıya geç.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'bupcore — Kriptoyu okuyan trader topluluğu',
    description:
      '10.000$ sanal kasa, canlı trader sinyalleri, Foxy AI ve OKX kopya trade.',
  },
  icons: { icon: '/icon.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={inter.variable}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
