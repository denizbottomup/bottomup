'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/logo';

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 8);
    h();
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

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
          <nav className="hidden items-center gap-6 text-sm text-fg-muted md:flex">
            <a href="#pulse" className="hover:text-fg transition">
              Markets
            </a>
            <a href="#leaderboard" className="hover:text-fg transition">
              Traders
            </a>
            <a href="#features" className="hover:text-fg transition">
              Product
            </a>
            <a href="#pricing" className="hover:text-fg transition">
              Pricing
            </a>
            <a href="#faq" className="hover:text-fg transition">
              FAQ
            </a>
          </nav>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <Link href="/signin" className="btn-ghost">
            Sign in
          </Link>
          <Link href="/signup" className="btn-primary">
            Get started free
          </Link>
        </div>

        <button
          className="md:hidden rounded-lg border border-border p-2 text-fg"
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
            <a href="#pulse" className="py-2 text-fg-muted" onClick={() => setMobileOpen(false)}>
              Markets
            </a>
            <a href="#leaderboard" className="py-2 text-fg-muted" onClick={() => setMobileOpen(false)}>
              Traders
            </a>
            <a href="#features" className="py-2 text-fg-muted" onClick={() => setMobileOpen(false)}>
              Product
            </a>
            <a href="#pricing" className="py-2 text-fg-muted" onClick={() => setMobileOpen(false)}>
              Pricing
            </a>
            <a href="#faq" className="py-2 text-fg-muted" onClick={() => setMobileOpen(false)}>
              FAQ
            </a>
            <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
              <Link href="/signin" className="btn-ghost justify-center">
                Sign in
              </Link>
              <Link href="/signup" className="btn-primary justify-center">
                Get started free
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
