'use client';

import { useEffect } from 'react';

const DASHBOARD_URL =
  process.env.NEXT_PUBLIC_TRADER_DASHBOARD_URL ||
  'https://trader-dashboard-production.up.railway.app';

export function TraderDetailModal({
  analyst,
  displayName,
  onClose,
}: {
  analyst: string;
  displayName: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const src = `${DASHBOARD_URL}/?embed=true&analyst=${encodeURIComponent(analyst)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-stretch bg-black/80 backdrop-blur-md md:items-center md:justify-center md:p-6"
      onClick={onClose}
    >
      <div
        className="relative flex h-full w-full flex-col overflow-hidden bg-bg-card shadow-2xl md:h-[90vh] md:max-w-[1200px] md:rounded-2xl md:border md:border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-bg-card/90 px-5 py-3 backdrop-blur">
          <div className="min-w-0">
            <div className="mono-label">Trader analytics</div>
            <div className="mt-0.5 truncate text-base font-bold text-fg">
              {displayName}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-lg text-fg ring-1 ring-white/10 hover:bg-white/10"
          >
            ×
          </button>
        </div>

        <iframe
          src={src}
          title={`${displayName} — analytics`}
          className="h-full w-full flex-1 border-0"
          loading="lazy"
        />
      </div>
    </div>
  );
}
