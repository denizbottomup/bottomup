import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { storeUrls, StoreBadges } from '@/components/landing/store-badges';

export const metadata: Metadata = {
  title: 'Get BottomUP',
  description:
    'Download the BottomUP mobile app or open the web trader experience.',
  robots: { index: false, follow: false },
};

/**
 * Smart app link (`/go`) used in QR codes, email campaigns, and
 * `bottomup.app/go` → `trade.bupcore.ai/go` redirects.
 *
 * Mobile user-agents go straight to the store listing; everyone else
 * sees store badges plus a link to the web sign-in surface.
 */
export default async function GoPage() {
  const ua = (await headers()).get('user-agent') ?? '';

  if (/iPhone|iPad|iPod/i.test(ua)) {
    redirect(storeUrls.ios);
  }
  if (/Android/i.test(ua)) {
    redirect(storeUrls.android);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 px-6 py-16 bg-[#080a10] text-slate-100">
      <div className="text-center max-w-md space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          Get BottomUP
        </h1>
        <p className="text-sm text-slate-400">
          Download the app for iOS or Android, or continue in your browser.
        </p>
      </div>
      <StoreBadges size="md" />
      <Link
        href="https://trade.bupcore.ai/signin"
        className="text-sm font-medium text-indigo-400 hover:text-indigo-300 underline-offset-4 hover:underline"
      >
        Open web trader →
      </Link>
    </main>
  );
}
