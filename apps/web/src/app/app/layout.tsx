'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Logo } from '@/components/logo';
import { SearchBar } from '@/components/search-bar';
import { api } from '@/lib/api';

const NAV = [
  { href: '/app', label: 'Grafik' },
  { href: '/app/feed', label: 'Akış' },
  { href: '/app/analytics', label: 'Analitik' },
  { href: '/app/watchlist', label: 'Watchlist' },
  { href: '/app/analysts', label: 'Analistler' },
  { href: '/app/together', label: 'Kopya' },
  { href: '/app/foxy', label: 'Foxy AI' },
  { href: '/app/chat', label: 'Sohbet' },
  { href: '/app/news', label: 'Haberler' },
  { href: '/app/notifications', label: 'Bildirimler', badgeKey: 'notifications' as const },
] as const;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const [unread, setUnread] = useState<number>(0);

  useEffect(() => {
    if (!loading && !user) router.replace('/signin');
  }, [loading, user, router]);

  const refreshUnread = useCallback(async () => {
    if (!user) return;
    try {
      const r = await api<{ unread: number }>('/user/me/notifications?limit=1');
      setUnread(r.unread);
    } catch {
      /* silent */
    }
  }, [user]);

  // Refetch unread count on every pathname change + on explicit mark-read event
  useEffect(() => {
    void refreshUnread();
  }, [pathname, refreshUnread]);

  useEffect(() => {
    const h = (): void => {
      setUnread(0);
    };
    window.addEventListener('bup:notifications-read', h);
    return () => window.removeEventListener('bup:notifications-read', h);
  }, []);

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
                const hasBadge = 'badgeKey' in item && item.badgeKey === 'notifications' && unread > 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative rounded-md px-3 py-1.5 text-sm transition ${
                      active
                        ? 'bg-white/5 text-fg ring-1 ring-white/10'
                        : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    <span>{item.label}</span>
                    {hasBadge ? (
                      <span className="ml-1.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-brand px-1 font-mono text-[10px] font-semibold text-white">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              <SearchBar />
            </div>
            <Link
              href="/app/profile"
              className="hidden text-sm text-fg-muted transition hover:text-fg lg:inline"
            >
              {user.email}
            </Link>
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
