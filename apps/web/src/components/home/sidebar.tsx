'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Logo } from '@/components/logo';
import { useAuth } from '@/lib/auth-context';

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  /** When true, the link is rendered as disabled with a "Soon" pill. */
  comingSoon?: boolean;
}

/**
 * Vertical navigation rail for the authenticated `/home` shell.
 * Foxy is the first item per the product spec; the remaining tabs
 * are scaffolded as "Soon" placeholders so the IA is visible from
 * day one.
 */
export function HomeSidebar() {
  const pathname = usePathname();
  const { signOut, user } = useAuth();

  const items: NavItem[] = [
    { href: '/home/foxy', label: 'Foxy', icon: <FoxyIcon /> },
    { href: '/home/right-now', label: 'Right Now', icon: <RightNowIcon /> },
    { href: '/home/live-macro', label: 'Live Macro', icon: <LiveMacroIcon /> },
    { href: '/home/overview', label: 'Overview', icon: <OverviewIcon /> },
    { href: '/home/live', label: 'Live trades', icon: <LiveIcon /> },
    { href: '/home/traders', label: 'Traders', icon: <TradersIcon />, comingSoon: true },
    { href: '/home/copies', label: 'Copy trades', icon: <CopyIcon />, comingSoon: true },
    { href: '/account', label: 'Account', icon: <AccountIcon /> },
  ];

  return (
    <aside className="hidden md:flex md:w-[240px] md:flex-col md:border-r md:border-border md:bg-bg-card/50">
      <div className="flex items-center gap-2 px-4 py-4 border-b border-border">
        <Link href="/home/foxy" className="flex items-center">
          <Logo variant="lockup" size="sm" />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== '/home' && pathname?.startsWith(item.href));
          const cls = item.comingSoon
            ? 'pointer-events-none opacity-50'
            : active
              ? 'bg-white/5 text-fg ring-1 ring-white/10'
              : 'text-fg-muted hover:bg-white/[0.03] hover:text-fg';
          return (
            <Link
              key={item.href}
              href={item.comingSoon ? '#' : item.href}
              aria-disabled={item.comingSoon}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${cls}`}
            >
              <span className="flex h-5 w-5 items-center justify-center text-fg">
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {item.comingSoon ? (
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-fg-dim">
                  Soon
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-3 py-3">
        <div className="mb-2 truncate text-xs text-fg-dim">
          {user?.email ?? user?.displayName ?? '—'}
        </div>
        <button
          onClick={() => void signOut()}
          className="w-full rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-fg-muted hover:border-white/25 hover:text-fg transition"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}

function FoxyIcon() {
  // Brand-orange flame as the Foxy mark. Stroked path so it inherits
  // currentColor on hover/active states.
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M14 2c0 4-3 5-3 9s3 6 3 6-7-1-7-7c0-4 4-5 4-8 0 0 3 0 3 0z" />
      <circle cx="12" cy="17" r="3" />
    </svg>
  );
}

function LiveMacroIcon() {
  // Microphone — anchors the "live broadcast / spoken event" feeling.
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M19 11a7 7 0 0 1-14 0" />
      <path d="M12 18v3" />
    </svg>
  );
}

function RightNowIcon() {
  // Lightning bolt — instant directional signal.
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
    </svg>
  );
}

function OverviewIcon() {
  // 2x2 grid — dashboard/overview metaphor.
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function TradersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M3 17l4-4 4 3 7-8" />
      <path d="M14 8h4v4" />
    </svg>
  );
}

function LiveIcon() {
  // Pulse-style icon — concentric circle suggests the live feed.
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="11" opacity="0.4" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
    </svg>
  );
}
