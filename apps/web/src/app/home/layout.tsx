'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

/**
 * Authenticated app shell. Post-login is a single prompt surface
 * (Foxy) — no sidebar, no module tabs. Anonymous viewers get bounced
 * to /signin (which redirects back here once auth resolves).
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
    <div className="min-h-screen bg-bg">
      <main className="min-w-0 overflow-x-hidden">{children}</main>
    </div>
  );
}
