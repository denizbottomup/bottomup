'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const KEY = 'bup-cookie-consent';

/**
 * Lightweight cookie-consent banner. Strictly necessary cookies are always
 * allowed; analytics (GTM) only fires when the user accepts. We persist
 * the choice in localStorage and push a consent update event onto the
 * GTM dataLayer so tags can gate on it.
 */
export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const existing = localStorage.getItem(KEY);
      if (!existing) setVisible(true);
      else pushConsent(existing as 'granted' | 'denied');
    } catch {
      setVisible(true);
    }
  }, []);

  const record = (choice: 'granted' | 'denied') => {
    try {
      localStorage.setItem(KEY, choice);
    } catch {
      /* ignore */
    }
    pushConsent(choice);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-2xl rounded-2xl border border-border bg-bg-card/95 p-4 text-sm shadow-2xl backdrop-blur md:bottom-5 md:inset-x-5"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <div className="flex-1 text-xs text-fg-muted">
          We use strictly necessary cookies for authentication and optional
          analytics cookies to understand aggregate usage. See our{' '}
          <Link href="/privacy" className="text-fg underline hover:text-brand">
            Privacy Policy
          </Link>
          .
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            onClick={() => record('denied')}
            className="btn-ghost px-3 py-2 text-xs"
          >
            Essential only
          </button>
          <button
            onClick={() => record('granted')}
            className="btn-primary px-3 py-2 text-xs"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}

type DataLayerEntry = Record<string, unknown>;
type WithDataLayer = { dataLayer?: DataLayerEntry[] };

function pushConsent(state: 'granted' | 'denied'): void {
  if (typeof window === 'undefined') return;
  const w = window as unknown as WithDataLayer;
  w.dataLayer = w.dataLayer ?? [];
  w.dataLayer.push({
    event: 'consent_update',
    ad_storage: state,
    analytics_storage: state,
    ad_user_data: state,
    ad_personalization: state,
  });
}
