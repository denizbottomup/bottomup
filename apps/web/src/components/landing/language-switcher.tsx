'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { LOCALES, localePath, useT, type LocaleCode } from '@/lib/i18n';

export function LanguageSwitcher() {
  const { locale, setLocale } = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-bg-card/60 px-3 text-xs text-fg-muted transition hover:border-white/20 hover:text-fg"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-sm leading-none">{current.flag}</span>
        <span className="font-medium">{current.code.toUpperCase()}</span>
        <svg
          className={`h-3 w-3 text-fg-dim transition ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open ? (
        <ul
          role="listbox"
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-bg-card shadow-2xl"
        >
          {LOCALES.map((l) => {
            const active = l.code === locale;
            return (
              <li key={l.code}>
                <button
                  type="button"
                  onClick={() => {
                    const code = l.code as LocaleCode;
                    setLocale(code);
                    setOpen(false);
                    // Navigate to the locale's canonical URL so the
                    // SSR'd `<html lang>` and metadata match what the
                    // user just selected. Cookie persistence stays in
                    // the provider for a future "remember on /" flow.
                    router.push(localePath(code));
                  }}
                  role="option"
                  aria-selected={active}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition ${
                    active
                      ? 'bg-brand/10 text-brand'
                      : 'text-fg-muted hover:bg-white/[0.03] hover:text-fg'
                  }`}
                >
                  <span className="text-base leading-none">{l.flag}</span>
                  <span className="flex-1">{l.native}</span>
                  <span className="font-mono text-[10px] text-fg-dim">
                    {l.code.toUpperCase()}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
