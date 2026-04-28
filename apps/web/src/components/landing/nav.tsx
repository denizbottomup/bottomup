'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/logo';
import { useT } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { LanguageSwitcher } from './language-switcher';

export function LandingNav() {
  const { t } = useT();
  const { user, loading: authLoading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 8);
    h();
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  // The hero now sits on a light background. Until the user scrolls
  // past it, nav text needs to be dark to stay readable on white;
  // once the user is on the dark sections below, nav goes back to
  // its glass-on-dark look. Both states aim for high contrast — the
  // earlier `text-fg-muted` on dark and `text-zinc-600` on light
  // were too faint to read at small nav sizes.
  const linkClass = scrolled
    ? 'text-fg hover:text-brand'
    : 'text-zinc-900 hover:text-brand';

  return (
    <header
      className={`sticky top-0 z-40 transition-colors ${
        scrolled
          ? 'bg-bg/80 backdrop-blur-md border-b border-border'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3 md:px-8">
        <div className="flex items-center gap-8">
          <Logo variant="lockup" size="sm" />
          <nav className="hidden items-center gap-6 text-sm md:flex">
            <a href="#foxy" className={`transition ${linkClass}`}>
              {t.nav.foxy}
            </a>
            <a href="#marketplace" className={`transition ${linkClass}`}>
              {t.nav.marketplace}
            </a>
            <a href="#mcp" className={`transition ${linkClass}`}>
              {t.nav.mcp}
            </a>
            <a href="#leaderboard" className={`transition ${linkClass}`}>
              {t.nav.traders}
            </a>
            <a href="#pricing" className={`transition ${linkClass}`}>
              {t.nav.pricing}
            </a>
          </nav>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <LanguageSwitcher />
          {/*
            Auth CTAs sit in the nav at all times — logged-out
            visitors see Sign in + Sign up free; signed-in users see
            their Account link. We render nothing while Firebase is
            still resolving (`authLoading`) to avoid the CTA briefly
            flickering for already-signed-in viewers on hard reload.
          */}
          {authLoading ? null : user ? (
            <Link
              href="/account"
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                scrolled
                  ? 'border-white/25 text-fg hover:border-brand hover:text-brand'
                  : 'border-zinc-400 text-zinc-900 hover:border-brand hover:text-brand'
              }`}
            >
              {t.nav.account ?? 'Account'}
            </Link>
          ) : (
            <>
              <Link
                href="/signin"
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  scrolled ? 'text-fg hover:text-brand' : 'text-zinc-900 hover:text-brand'
                }`}
              >
                {t.nav.signin}
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-black hover:bg-brand/90"
              >
                {t.nav.signup}
              </Link>
            </>
          )}
        </div>

        <button
          className={`md:hidden rounded-lg border p-2 ${
            scrolled
              ? 'border-border text-fg'
              : 'border-zinc-300 text-zinc-700'
          }`}
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {mobileOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="7" x2="21" y2="7" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="17" x2="21" y2="17" />
              </>
            )}
          </svg>
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-border bg-bg md:hidden">
          <nav className="flex flex-col p-4 text-sm">
            <a href="#foxy" className="py-2 text-fg hover:text-brand" onClick={() => setMobileOpen(false)}>
              {t.nav.foxy}
            </a>
            <a href="#marketplace" className="py-2 text-fg hover:text-brand" onClick={() => setMobileOpen(false)}>
              {t.nav.marketplace}
            </a>
            <a href="#mcp" className="py-2 text-fg hover:text-brand" onClick={() => setMobileOpen(false)}>
              {t.nav.mcp}
            </a>
            <a href="#leaderboard" className="py-2 text-fg hover:text-brand" onClick={() => setMobileOpen(false)}>
              {t.nav.traders}
            </a>
            <a href="#pricing" className="py-2 text-fg hover:text-brand" onClick={() => setMobileOpen(false)}>
              {t.nav.pricing}
            </a>
            <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
              {authLoading ? null : user ? (
                <Link
                  href="/account"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-full border border-border px-4 py-2 text-center text-sm font-semibold text-fg"
                >
                  {t.nav.account ?? 'Account'}
                </Link>
              ) : (
                <>
                  <Link
                    href="/signup"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-full bg-brand px-4 py-2 text-center text-sm font-semibold text-black"
                  >
                    {t.nav.signup}
                  </Link>
                  <Link
                    href="/signin"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-full border border-white/20 px-4 py-2 text-center text-sm font-semibold text-fg"
                  >
                    {t.nav.signin}
                  </Link>
                </>
              )}
              <div className="mt-2 flex justify-center">
                <LanguageSwitcher />
              </div>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
