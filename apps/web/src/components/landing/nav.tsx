'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/logo';

const TRADE = process.env.NEXT_PUBLIC_TRADE_URL ?? '';

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
              Pazar pulsu
            </a>
            <a href="#leaderboard" className="hover:text-fg transition">
              Liderler
            </a>
            <a href="#features" className="hover:text-fg transition">
              Özellikler
            </a>
            <a href="#pricing" className="hover:text-fg transition">
              Fiyat
            </a>
            <a href="#faq" className="hover:text-fg transition">
              SSS
            </a>
          </nav>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <Link href={`${TRADE}/signin`} className="btn-ghost">
            Giriş
          </Link>
          <Link href={`${TRADE}/signup`} className="btn-primary">
            10.000$ kasayla başla
          </Link>
        </div>

        <button
          className="md:hidden rounded-lg border border-border p-2 text-fg"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Menü"
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
              Pazar pulsu
            </a>
            <a href="#leaderboard" className="py-2 text-fg-muted" onClick={() => setMobileOpen(false)}>
              Liderler
            </a>
            <a href="#features" className="py-2 text-fg-muted" onClick={() => setMobileOpen(false)}>
              Özellikler
            </a>
            <a href="#pricing" className="py-2 text-fg-muted" onClick={() => setMobileOpen(false)}>
              Fiyat
            </a>
            <a href="#faq" className="py-2 text-fg-muted" onClick={() => setMobileOpen(false)}>
              SSS
            </a>
            <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
              <Link href={`${TRADE}/signin`} className="btn-ghost justify-center">
                Giriş
              </Link>
              <Link href={`${TRADE}/signup`} className="btn-primary justify-center">
                10.000$ kasayla başla
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
