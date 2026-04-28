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

  // The hero is dark in every state — the white-hero variant we used
  // to ship was retired. Nav links + CTAs use the high-contrast `fg`
  // token over both transparent (top-of-page) and `bg/80` (scrolled)
  // backgrounds; brand-orange marks the hover affordance. We keep
  // the `scrolled` flag only to swap in the glass-blur backdrop, not
  // to change text color — the previous `text-zinc-900` (assuming a
  // white hero) rendered black-on-black and was unreadable.
  const linkClass = 'text-fg hover:text-brand';

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
              href="/home"
              className="rounded-full border border-white/25 px-4 py-1.5 text-sm font-semibold text-fg transition hover:border-brand hover:text-brand"
            >
              {t.nav.account ?? 'Home'}
            </Link>
          ) : (
            <>
              <Link
                href="/signin"
                className="rounded-full px-4 py-1.5 text-sm font-semibold text-fg transition hover:text-brand"
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
          className="md:hidden rounded-lg border border-white/20 p-2 text-fg"
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
                  href="/home"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-full border border-border px-4 py-2 text-center text-sm font-semibold text-fg"
                >
                  {t.nav.account ?? 'Home'}
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
