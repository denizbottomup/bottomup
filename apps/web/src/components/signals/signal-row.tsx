'use client';

import type { SignalRow as Row } from './types';

interface Props {
  row: Row;
  /** When set, used as the right-edge timestamp instead of created_at
   *  (e.g. for the recent list we want the close moment). */
  relTo?: string | null;
}

/**
 * Single-row signal card used in the active book + recent log. Same
 * visual rhythm as the trades-table in /home/foxy so a viewer who's
 * seen one can read the other without re-learning.
 */
export function SignalRow({ row, relTo }: Props) {
  const ageRef = relTo ?? row.last_acted_at ?? row.created_at;
  return (
    <li className="flex items-center gap-3 border-b border-border/60 px-4 py-3 hover:bg-bg-elev/30 transition">
      <Avatar
        src={row.trader_image}
        fallback={(row.trader_name ?? '?').slice(0, 1).toUpperCase()}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm">
          <span className="truncate font-medium text-fg">
            {row.trader_name ?? 'Anonim'}
          </span>
          <CoinPill coin={row.coin} />
          <PositionPill position={row.position} />
          <StatusPill status={row.status} />
        </div>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-[12px] tabular-nums text-fg-muted">
          <Field label="giriş" value={formatPrice(row.entry_value)} />
          <Field label="stop" value={formatPrice(row.stop_value)} tone="rose" />
          <Field
            label="tp1"
            value={formatPrice(row.profit_taking_1)}
            tone="mint"
          />
          <Field
            label="R"
            value={
              row.r_value == null
                ? '—'
                : `${row.r_value >= 0 ? '+' : ''}${row.r_value.toFixed(1)}`
            }
          />
        </div>
      </div>
      <div className="shrink-0 font-mono text-[11px] text-fg-dim">
        {relTime(ageRef)}
      </div>
    </li>
  );
}

function Avatar({ src, fallback }: { src: string | null; fallback: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt=""
        className="size-8 shrink-0 rounded-full bg-bg-elev object-cover"
      />
    );
  }
  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-bg-elev text-xs text-fg-muted">
      {fallback}
    </div>
  );
}

function CoinPill({ coin }: { coin: string }) {
  return (
    <span className="rounded-md bg-bg-elev px-1.5 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.06em] text-fg-muted">
      {coin.replace(/USDT$/i, '')}
    </span>
  );
}

function PositionPill({ position }: { position: Row['position'] }) {
  if (position === 'long') {
    return (
      <span className="rounded-full border border-mint/40 bg-mint/10 px-1.5 py-0.5 font-mono text-[10px] text-mint-soft">
        LONG
      </span>
    );
  }
  if (position === 'short') {
    return (
      <span className="rounded-full border border-rose-400/40 bg-rose-500/10 px-1.5 py-0.5 font-mono text-[10px] text-rose-200">
        SHORT
      </span>
    );
  }
  return null;
}

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_PILL[status as keyof typeof STATUS_PILL] ?? {
    label: status,
    tone: 'text-fg-dim border-border bg-bg-elev',
  };
  return (
    <span
      className={`rounded-full border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em] ${cfg.tone}`}
    >
      {cfg.label}
    </span>
  );
}

const STATUS_PILL: Record<string, { label: string; tone: string }> = {
  incoming: {
    label: 'bekliyor',
    tone: 'border-border bg-bg-elev text-fg-dim',
  },
  active: {
    label: 'aktif',
    tone: 'border-brand/40 bg-brand/10 text-brand-soft',
  },
  success: {
    label: 'tp',
    tone: 'border-mint/40 bg-mint/10 text-mint-soft',
  },
  stopped: {
    label: 'stop',
    tone: 'border-rose-400/40 bg-rose-500/10 text-rose-200',
  },
  closed: {
    label: 'kapatıldı',
    tone: 'border-border bg-bg-elev text-fg-muted',
  },
  cancelled: {
    label: 'iptal',
    tone: 'border-border bg-bg-elev text-fg-dim',
  },
};

function Field({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'mint' | 'rose';
}) {
  const valueClass =
    tone === 'mint'
      ? 'text-mint-soft'
      : tone === 'rose'
        ? 'text-rose-200'
        : 'text-fg';
  return (
    <span>
      <span className="text-[10.5px] uppercase tracking-[0.08em] text-fg-dim">
        {label}{' '}
      </span>
      <span className={valueClass}>{value}</span>
    </span>
  );
}

function formatPrice(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—';
  if (n >= 10000)
    return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (n >= 100)
    return `$${n.toLocaleString('en-US', { maximumFractionDigits: 1 })}`;
  if (n >= 1)
    return `$${n.toLocaleString('en-US', { maximumFractionDigits: 3 })}`;
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 6 })}`;
}

function relTime(iso: string | null): string {
  if (!iso) return '—';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '—';
  const sec = Math.max(0, (Date.now() - t) / 1000);
  if (sec < 60) return 'şimdi';
  if (sec < 3600) return `${Math.round(sec / 60)}dk`;
  if (sec < 86400) return `${Math.round(sec / 3600)}sa`;
  return `${Math.round(sec / 86400)}g`;
}
