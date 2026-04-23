'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import { SetupChart } from './setup-chart';
import type { SetupCard } from './setup-card';

interface FoxyVerdict {
  risk_score: number;
  verdict: 'TP_LIKELY' | 'NEUTRAL' | 'STOP_LIKELY';
  confidence: number;
  comment: string;
}

interface SetupEvent {
  id: number;
  event_time: string | null;
  action: string | null;
  changed_column: string | null;
  old_value: string | null;
  new_value: string | null;
  trader_name: string | null;
  trader_image: string | null;
}

type FoxyState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok'; value: FoxyVerdict }
  | { kind: 'err'; message: string };

type EventsState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok'; value: SetupEvent[] }
  | { kind: 'err'; message: string };

export function SetupRow({ setup, pulseKey = 0 }: { setup: SetupCard; pulseKey?: number }) {
  const [open, setOpen] = useState(false);
  const [foxy, setFoxy] = useState<FoxyState>({ kind: 'idle' });
  const [events, setEvents] = useState<EventsState>({ kind: 'idle' });
  const [pulsing, setPulsing] = useState(false);
  const isLong = setup.position === 'long';
  const isShort = setup.position === 'short';

  useEffect(() => {
    if (!open || foxy.kind !== 'idle') return;
    setFoxy({ kind: 'loading' });
    api<FoxyVerdict>(`/feed/foxy/${setup.id}`)
      .then((v) => setFoxy({ kind: 'ok', value: v }))
      .catch((x) => {
        const msg =
          x instanceof ApiError ? `${x.status} ${x.message}` : (x as Error).message;
        setFoxy({ kind: 'err', message: msg });
      });
  }, [open, foxy.kind, setup.id]);

  useEffect(() => {
    if (!open) return;
    setEvents({ kind: 'loading' });
    api<{ items: SetupEvent[] }>(`/feed/setup/${setup.id}/events?limit=20`)
      .then((r) => setEvents({ kind: 'ok', value: r.items }))
      .catch((x) => {
        const msg =
          x instanceof ApiError ? `${x.status} ${x.message}` : (x as Error).message;
        setEvents({ kind: 'err', message: msg });
      });
  }, [open, setup.id, pulseKey]);

  // Flash the row when pulseKey changes (WS update arrived).
  useEffect(() => {
    if (!pulseKey) return;
    setPulsing(true);
    const t = setTimeout(() => setPulsing(false), 1200);
    return () => clearTimeout(t);
  }, [pulseKey]);

  const traderName =
    setup.trader.name ||
    [setup.trader.first_name, setup.trader.last_name].filter(Boolean).join(' ').trim() ||
    'Trader';
  const traderInitial = traderName[0]?.toUpperCase() ?? '?';
  const coinCode = (setup.coin.code || setup.coin_name || '').toUpperCase();

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-white/[0.02] transition hover:border-white/20 ${
        pulsing ? 'border-brand/60 ring-1 ring-brand/30' : 'border-white/10'
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        className="grid w-full cursor-pointer grid-cols-[auto_minmax(0,1.2fr)_minmax(0,2fr)_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 text-left hover:bg-white/[0.02]"
      >
        {/* Direction */}
        <DirectionPill position={setup.position} />

        {/* Coin + trader */}
        <div className="flex min-w-0 items-center gap-2">
          <CoinGlyph src={setup.coin.image} code={coinCode} />
          <div className="min-w-0">
            <div className="truncate font-mono text-sm font-semibold text-fg">{coinCode}</div>
            <div className="truncate text-[11px] text-fg-dim">
              {setup.trader.id ? (
                <Link
                  href={`/app/trader/${setup.trader.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-medium text-fg-muted transition hover:text-brand"
                >
                  {traderName}
                </Link>
              ) : (
                <span className="text-fg-muted">{traderName}</span>
              )}
              {' · '}
              {setup.category === 'futures' ? 'Fut' : 'Spot'} · {setup.order_type}
            </div>
          </div>
        </div>

        {/* Prices */}
        <div className="hidden min-w-0 items-center gap-3 font-mono text-[11px] md:flex">
          <PriceChip label="E" value={formatRange(setup.entry_value, setup.entry_value_end)} tone="accent" />
          <PriceChip label="S" value={formatNum(setup.stop_value)} tone="danger" />
          <PriceChip label="TP1" value={formatNum(setup.profit_taking_1)} tone="success" hit={!!setup.is_tp1} />
          {setup.profit_taking_2 != null ? (
            <PriceChip label="TP2" value={formatNum(setup.profit_taking_2)} tone="success" hit={!!setup.is_tp2} />
          ) : null}
        </div>

        {/* R */}
        <div className="hidden text-right font-mono text-[11px] text-fg-muted md:block">
          {setup.r_value != null ? `R ${setup.r_value.toFixed(1)}` : '—'}
        </div>

        {/* Foxy chip */}
        <FoxyChip foxy={foxy} open={open} />
      </div>

      {open ? (
        <div className="border-t border-white/5 bg-black/20">
          <div className="grid gap-4 p-4 lg:grid-cols-[1fr_320px]">
            <SetupChart
              symbol={setup.coin_name}
              entry={setup.entry_value}
              entryHigh={setup.entry_value_end}
              stop={setup.stop_value}
              tp1={setup.profit_taking_1}
              tp2={setup.profit_taking_2}
              tp3={setup.profit_taking_3}
              position={isLong ? 'long' : isShort ? 'short' : null}
              height={280}
            />

            <FoxyPanel foxy={foxy} traderInitial={traderInitial} traderName={traderName} />
          </div>

          <EventsTimeline events={events} />
        </div>
      ) : null}
    </div>
  );
}

function EventsTimeline({ events }: { events: EventsState }) {
  if (events.kind === 'idle') return null;
  return (
    <div className="border-t border-white/5 px-4 py-3">
      <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wider text-fg-dim">
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
          <circle cx="5" cy="5" r="3" fill="currentColor" />
        </svg>
        Trader Güncellemeleri
      </div>
      {events.kind === 'loading' ? (
        <div className="space-y-1.5">
          <div className="h-2 w-1/2 animate-pulse rounded bg-white/10" />
          <div className="h-2 w-2/3 animate-pulse rounded bg-white/10" />
          <div className="h-2 w-1/3 animate-pulse rounded bg-white/10" />
        </div>
      ) : events.kind === 'err' ? (
        <p className="text-xs text-rose-300/80">Akış yüklenemedi: {events.message}</p>
      ) : events.value.length === 0 ? (
        <p className="text-xs text-fg-dim">Henüz güncelleme yok.</p>
      ) : (
        <ol className="space-y-1.5">
          {events.value.map((e) => (
            <li key={e.id} className="flex items-start gap-2 text-[12px] leading-relaxed">
              <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-white/30" />
              <span className="min-w-0 flex-1">
                <EventLine e={e} />
              </span>
              <span className="shrink-0 font-mono text-[10px] text-fg-dim">
                {formatAgo(e.event_time)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function EventLine({ e }: { e: SetupEvent }) {
  const col = humanColumn(e.changed_column);
  if (e.action === 'insert') {
    return <span className="text-fg">Setup paylaşıldı.</span>;
  }
  if (e.action === 'update' && col) {
    const from = fmtVal(e.old_value);
    const to = fmtVal(e.new_value);
    if (from && to && from !== to) {
      return (
        <span className="text-fg">
          <span className="text-fg-muted">{col}</span>{' '}
          <span className="font-mono text-rose-300/90 line-through decoration-rose-400/40">
            {from}
          </span>{' '}
          →{' '}
          <span className="font-mono text-emerald-300">{to}</span>
        </span>
      );
    }
    if (to) {
      return (
        <span className="text-fg">
          <span className="text-fg-muted">{col}</span>{' '}
          <span className="font-mono text-emerald-300">{to}</span>
        </span>
      );
    }
    return <span className="text-fg-muted">{col} güncellendi</span>;
  }
  return <span className="text-fg-muted">{e.action} {e.changed_column ?? ''}</span>;
}

function humanColumn(col: string | null): string {
  if (!col) return '';
  const map: Record<string, string> = {
    status: 'Durum',
    entry_value: 'Giriş',
    entry_value_end: 'Giriş üst',
    stop_value: 'Stop',
    profit_taking_1: 'TP1',
    profit_taking_2: 'TP2',
    profit_taking_3: 'TP3',
    is_tp1: 'TP1 vuruldu',
    is_tp2: 'TP2 vuruldu',
    is_tp3: 'TP3 vuruldu',
    close_price: 'Kapanış',
    note: 'Not',
    open_leverage: 'Kaldıraç',
  };
  return map[col] ?? col;
}

function fmtVal(v: string | null): string | null {
  if (v == null) return null;
  const n = Number(v);
  if (Number.isFinite(n)) {
    const abs = Math.abs(n);
    const digits = abs >= 1000 ? 2 : abs >= 1 ? 4 : 6;
    return n.toLocaleString('en-US', { maximumFractionDigits: digits });
  }
  return v;
}

function formatAgo(iso: string | null): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const diffS = Math.max(1, Math.round((Date.now() - t) / 1000));
  if (diffS < 60) return `${diffS}s`;
  const m = Math.round(diffS / 60);
  if (m < 60) return `${m}dk`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}sa`;
  const d = Math.round(h / 24);
  return `${d}g`;
}

function DirectionPill({ position }: { position: 'long' | 'short' | null }) {
  if (position === 'long') {
    return (
      <span className="rounded-md bg-emerald-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30">
        Long
      </span>
    );
  }
  if (position === 'short') {
    return (
      <span className="rounded-md bg-rose-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-300 ring-1 ring-rose-400/30">
        Short
      </span>
    );
  }
  return (
    <span className="rounded-md bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-fg-muted ring-1 ring-white/10">
      —
    </span>
  );
}

function CoinGlyph({ src, code }: { src: string | null; code: string }) {
  const initial = code.slice(0, 3) || '?';
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className="h-7 w-7 rounded-full object-cover ring-1 ring-white/10"
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = 'none';
        const next = e.currentTarget.nextElementSibling as HTMLElement | null;
        if (next) next.style.display = 'flex';
      }}
    />
  ) : (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 font-mono text-[9px] font-bold text-fg-muted">
      {initial}
    </div>
  );
}

type ChipTone = 'accent' | 'success' | 'danger';
function PriceChip({ label, value, tone, hit }: { label: string; value: string; tone: ChipTone; hit?: boolean }) {
  const toneClass =
    tone === 'success'
      ? 'text-emerald-300'
      : tone === 'danger'
        ? 'text-rose-300'
        : 'text-fg';
  return (
    <div
      className={`flex items-center gap-1 rounded-md border px-2 py-0.5 ${
        hit ? 'border-emerald-400/30 bg-emerald-400/5' : 'border-white/5 bg-white/[0.02]'
      }`}
    >
      <span className="text-[9px] uppercase tracking-wider text-fg-dim">{label}</span>
      <span className={`${toneClass} tabular-nums`}>{value}</span>
    </div>
  );
}

function FoxyChip({ foxy, open }: { foxy: FoxyState; open: boolean }) {
  if (foxy.kind === 'ok') {
    const v = foxy.value;
    const toneClass =
      v.verdict === 'TP_LIKELY'
        ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/30'
        : v.verdict === 'STOP_LIKELY'
          ? 'bg-rose-400/10 text-rose-300 ring-rose-400/30'
          : 'bg-amber-300/10 text-amber-200 ring-amber-300/30';
    return (
      <span className={`ml-2 flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-semibold ring-1 ${toneClass}`}>
        <FoxyIcon />
        <span className="tabular-nums">{v.risk_score}</span>
      </span>
    );
  }
  if (foxy.kind === 'loading') {
    return (
      <span className="ml-2 flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1 text-[10px] text-fg-muted ring-1 ring-white/10">
        <FoxyIcon /> …
      </span>
    );
  }
  if (foxy.kind === 'err') {
    return (
      <span className="ml-2 flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1 text-[10px] text-fg-dim ring-1 ring-white/10">
        <FoxyIcon /> —
      </span>
    );
  }
  return (
    <span className={`ml-2 flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1 text-[10px] font-medium ring-1 ring-white/10 ${open ? 'text-fg' : 'text-fg-muted'}`}>
      <FoxyIcon /> Foxy
    </span>
  );
}

function FoxyPanel({ foxy, traderInitial, traderName }: { foxy: FoxyState; traderInitial: string; traderName: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-fg-dim">
        <FoxyIcon /> Foxy AI
      </div>

      {foxy.kind === 'loading' ? (
        <div className="space-y-2">
          <div className="h-2 w-2/3 animate-pulse rounded bg-white/10" />
          <div className="h-2 w-full animate-pulse rounded bg-white/10" />
          <div className="h-2 w-5/6 animate-pulse rounded bg-white/10" />
        </div>
      ) : foxy.kind === 'err' ? (
        <p className="text-sm text-rose-300">{foxy.message}</p>
      ) : foxy.kind === 'ok' ? (
        <>
          <RiskGauge value={foxy.value.risk_score} verdict={foxy.value.verdict} />
          <p className="text-sm leading-relaxed text-fg">{foxy.value.comment}</p>
          <div className="text-[11px] text-fg-dim">
            Güven: {foxy.value.confidence}% · Setup: {traderName}
          </div>
        </>
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-sm font-semibold text-fg ring-1 ring-white/10">
          {traderInitial}
        </div>
      )}
    </div>
  );
}

function RiskGauge({ value, verdict }: { value: number; verdict: FoxyVerdict['verdict'] }) {
  const label =
    verdict === 'TP_LIKELY' ? 'TP olası' : verdict === 'STOP_LIKELY' ? 'Stop olası' : 'Dengeli';
  const gradient =
    'linear-gradient(90deg, #34d399 0%, #fbbf24 55%, #f87171 100%)';
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div className="text-[10px] uppercase tracking-wider text-fg-dim">Risk skoru</div>
        <div className="font-mono text-sm text-fg">
          {value}
          <span className="text-fg-dim">/100</span>
        </div>
      </div>
      <div className="mt-1 h-1.5 w-full rounded-full bg-white/5">
        <div
          className="h-1.5 rounded-full"
          style={{ width: `${value}%`, backgroundImage: gradient }}
        />
      </div>
      <div className="mt-1 text-[11px] text-fg-muted">{label}</div>
    </div>
  );
}

function FoxyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 20 20" aria-hidden className="shrink-0">
      <path
        fill="currentColor"
        d="M10 2c1.8 1.2 3 2.8 3 4.5 1.5.4 3 1.8 3 3.7 0 1.6-.9 3-2.2 3.6L13 17l-2-1.5L9 17l-.8-3.2C6.9 13.2 6 11.8 6 10.2c0-1.9 1.5-3.3 3-3.7C9 4.8 10 3.2 10 2Zm-1.7 8.2a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Zm3.4 0a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Z"
      />
    </svg>
  );
}

function formatNum(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  const digits = abs >= 1000 ? 2 : abs >= 1 ? 4 : 6;
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

function formatRange(a: number, b: number | null): string {
  if (b == null || b === a) return formatNum(a);
  return `${formatNum(a)} – ${formatNum(b)}`;
}
