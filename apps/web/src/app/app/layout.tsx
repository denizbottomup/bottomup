'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Logo } from '@/components/logo';

const NAV = [
  { href: '/app', label: 'Grafik' },
  { href: '/app/feed', label: 'Akış' },
  { href: '/app/watchlist', label: 'Watchlist' },
  { href: '/app/news', label: 'Haberler' },
] as const;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
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
    <div className="h-screen flex flex-col">
      <header className="shrink-0 border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between gap-6">
          <div className="flex items-center gap-6 min-w-0">
            <Logo variant="lockup" size="sm" href="/app" />
            <nav className="flex items-center gap-1">
              {NAV.map((item) => {
                const active =
                  item.href === '/app'
                    ? pathname === '/app'
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-md px-3 py-1.5 text-sm transition ${
                      active
                        ? 'bg-white/5 text-fg ring-1 ring-white/10'
                        : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-fg-muted hidden sm:inline">{user.email}</span>
            <button onClick={() => void signOut()} className="btn-ghost text-sm">
              Çıkış
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 min-h-0 overflow-y-auto">{children}</main>
    </div>
  );
}
