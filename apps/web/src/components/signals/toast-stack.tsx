'use client';

import { useEffect } from 'react';
import type { SignalEvent } from './types';

interface Props {
  events: SignalEvent[];
  onDismiss: (id: string) => void;
}

const AUTO_DISMISS_MS = 6_000;

/**
 * Sağ üst köşede yığılan toast'lar. Her event 6 sn sonra
 * kaybolur; max 5 görünür, fazlası kuyruğa düşmez (state
 * dropFromEnd ile parent'ta budanıyor).
 */
export function SignalsToastStack({ events, onDismiss }: Props) {
  useEffect(() => {
    if (events.length === 0) return;
    const timers = events.map((e) =>
      setTimeout(() => onDismiss(e.id), AUTO_DISMISS_MS),
    );
    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, [events, onDismiss]);

  if (events.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[340px] flex-col gap-2">
      {events.slice(0, 5).map((e) => (
        <ToastCard key={e.id} event={e} onDismiss={() => onDismiss(e.id)} />
      ))}
    </div>
  );
}

function ToastCard({
  event,
  onDismiss,
}: {
  event: SignalEvent;
  onDismiss: () => void;
}) {
  const { tone, headline } = describe(event);
  return (
    <div
      className={`pointer-events-auto rounded-2xl border ${tone} bg-bg-card/95 px-4 py-3 shadow-lg backdrop-blur transition`}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="mono-label !text-fg-dim">
            {event.setup.trader_name ?? 'Anonim'} ·{' '}
            {event.setup.coin.replace(/USDT$/i, '')}
          </div>
          <div className="mt-1 text-sm font-medium text-fg">{headline}</div>
          <Levels event={event} />
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Bildirimi kapat"
          className="-mr-1 -mt-1 size-6 shrink-0 rounded-full text-fg-dim hover:bg-bg-elev hover:text-fg transition"
        >
          ×
        </button>
      </div>
    </div>
  );
}

function Levels({ event }: { event: SignalEvent }) {
  const s = event.setup;
  const parts: string[] = [];
  if (s.entry_value != null) parts.push(`giriş ${fmt(s.entry_value)}`);
  if (s.stop_value != null) parts.push(`stop ${fmt(s.stop_value)}`);
  if (s.profit_taking_1 != null) parts.push(`tp1 ${fmt(s.profit_taking_1)}`);
  if (parts.length === 0) return null;
  return (
    <div className="mt-1.5 font-mono text-[11px] tabular-nums text-fg-muted">
      {parts.join(' · ')}
    </div>
  );
}

function describe(e: SignalEvent): { tone: string; headline: string } {
  const side =
    e.setup.position === 'long'
      ? 'LONG'
      : e.setup.position === 'short'
        ? 'SHORT'
        : '';
  switch (e.kind) {
    case 'new':
      return {
        tone: 'border-brand/40',
        headline: `Yeni ${side} setup açıldı`,
      };
    case 'entry_hit':
      return {
        tone: 'border-brand/40',
        headline: `${side} pozisyona girildi`,
      };
    case 'tp_hit':
      return {
        tone: 'border-mint/40',
        headline: `Take-profit vuruldu (${side})`,
      };
    case 'stopped':
      return {
        tone: 'border-rose-400/40',
        headline: `Stop tetiklendi (${side})`,
      };
    case 'closed':
      return {
        tone: 'border-border',
        headline: `Pozisyon kapatıldı (${side})`,
      };
    case 'edit':
      return {
        tone: 'border-brand/40',
        headline: `${side} setup güncellendi`,
      };
  }
}

function fmt(n: number): string {
  if (n >= 10000) return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (n >= 100) return `$${n.toLocaleString('en-US', { maximumFractionDigits: 1 })}`;
  if (n >= 1) return `$${n.toLocaleString('en-US', { maximumFractionDigits: 3 })}`;
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 6 })}`;
}
