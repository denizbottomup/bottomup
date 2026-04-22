'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace('/signin');
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-fg-muted">
        Yükleniyor…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link href="/app" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-brand" />
            <span className="font-semibold">bottomUP</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-fg-muted hidden sm:inline">{user.email}</span>
            <button onClick={() => void signOut()} className="btn-ghost text-sm">
              Çıkış
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
