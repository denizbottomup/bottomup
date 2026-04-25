'use client';

import { useEffect, useState } from 'react';
import { Logo } from '@/components/logo';
import { useT } from '@/lib/i18n';
import { LanguageSwitcher } from './language-switcher';

export function LandingNav() {
  const { t } = useT();
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
  // its glass-on-dark look.
  const linkClass = scrolled
    ? 'text-fg-muted hover:text-fg'
    : 'text-zinc-600 hover:text-zinc-900';

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
            <a href="#foxy" className="py-2 text-fg-muted" onClick={() => setMobileOpen(false)}>
              {t.nav.foxy}
            </a>
            <a href="#marketplace" className="py-2 text-fg-muted" onClick={() => setMobileOpen(false)}>
              {t.nav.marketplace}
            </a>
            <a href="#mcp" className="py-2 text-fg-muted" onClick={() => setMobileOpen(false)}>
              {t.nav.mcp}
            </a>
            <a href="#leaderboard" className="py-2 text-fg-muted" onClick={() => setMobileOpen(false)}>
              {t.nav.traders}
            </a>
            <a href="#pricing" className="py-2 text-fg-muted" onClick={() => setMobileOpen(false)}>
              {t.nav.pricing}
            </a>
            <div className="mt-3 flex justify-center border-t border-border pt-3">
              <LanguageSwitcher />
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
