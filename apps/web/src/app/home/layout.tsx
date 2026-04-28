'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { HomeSidebar } from '@/components/home/sidebar';

/**
 * Authenticated app shell. Every `/home/*` route renders inside the
 * sidebar layout. Anonymous viewers get bounced to /signin (which
 * itself redirects back here once auth resolves).
 */
export default function HomeLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace('/signin');
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-fg-muted">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-bg">
      <HomeSidebar />
      <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
    </div>
  );
}
