'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import { BottomupWs, type WsServerFrame } from '@/lib/ws';
import type { SetupCard } from '@/components/setup-card';
import { SetupRow } from '@/components/setup-row';

type Tab = 'opportunities' | 'active';

interface FeedResponse {
  items: SetupCard[];
}

interface SetupReplicationPayload {
  table: string;
  row: Record<string, unknown>;
}

export default function FeedPage() {
  const [tab, setTab] = useState<Tab>('opportunities');
  const [opp, setOpp] = useState<SetupCard[] | null>(null);
  const [act, setAct] = useState<SetupCard[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pulses, setPulses] = useState<Record<string, number>>({});
  const [connected, setConnected] = useState(false);
  const [tags, setTags] = useState<Array<{ tag: string; count: number }> | null>(null);

  useEffect(() => {
    let alive = true;
    setErr(null);
    Promise.all([
      api<FeedResponse>('/feed/opportunities'),
      api<FeedResponse>('/feed/active'),
      api<{ items: Array<{ tag: string; count: number }> }>('/feed/tags?limit=12').catch(() => ({
        items: [],
      })),
    ])
      .then(([o, a, t]) => {
        if (!alive) return;
        setOpp(o.items);
        setAct(a.items);
        setTags(t.items);
      })
      .catch((x) => {
        if (!alive) return;
        const msg =
          x instanceof ApiError ? `${x.status} ${x.message}` : (x as Error).message;
        setErr(msg);
      });
    return () => {
      alive = false;
    };
  }, []);

  const wsRef = useRef<BottomupWs | null>(null);
  useEffect(() => {
    const ws = new BottomupWs();
    wsRef.current = ws;
    ws.connect();
    ws.bind('setup', '*');
    const off = ws.onMessage((frame) => {
      if (frame.channel === 'system') {
        setConnected(true);
        return;
      }
      if (frame.channel !== 'setup') return;
      applyFrame(frame, setOpp, setAct, setPulses);
    });
    return () => {
      off();
      ws.close();
      wsRef.current = null;
    };
  }, []);

  const loading = opp == null || act == null;
  const items = tab === 'opportunities' ? opp ?? [] : act ?? [];

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TabButton
            active={tab === 'opportunities'}
            onClick={() => setTab('opportunities')}
            label="Fırsatlar"
            count={opp?.length ?? null}
          />
          <TabButton
            active={tab === 'active'}
            onClick={() => setTab('active')}
            label="Aktif"
            count={act?.length ?? null}
          />
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/app/setup/search"
            className="rounded-md bg-white/5 px-3 py-1.5 text-xs font-medium text-fg-muted ring-1 ring-white/10 transition hover:text-fg"
          >
            Ara
          </Link>
          <Link
            href="/app/setup/new"
            className="rounded-md bg-brand/15 px-3 py-1.5 text-xs font-medium text-brand ring-1 ring-brand/30 transition hover:bg-brand/20"
          >
            + Yeni setup
          </Link>
          <LiveBadge connected={connected} />
        </div>
      </div>

      {tags && tags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <Link
              key={t.tag}
              href={`/app/tag/${encodeURIComponent(t.tag)}`}
              className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-fg-muted transition hover:border-brand/40 hover:text-fg"
            >
              <span className="font-mono">#{t.tag}</span>
              <span className="text-fg-dim">{t.count}</span>
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mt-5">
        {err ? (
          <EmptyState title="Akış yüklenemedi" hint={err} />
        ) : loading ? (
          <SkeletonList />
        ) : items.length === 0 ? (
          <EmptyState
            title={
              tab === 'opportunities'
                ? 'Şimdilik yeni fırsat yok'
                : 'Açık pozisyon görünmüyor'
            }
            hint="Takip ettiğin trader'lar yeni bir emir paylaştığında burada görünecek."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((s) => (
              <SetupRow key={s.id} setup={s} pulseKey={pulses[s.id] ?? 0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Apply a realtime frame to the local feed state. We expect payloads
 * shaped as { table: 'setup' | 'setup_events', row: <raw row> }. For
 * `setup` rows we patch in place; for `setup_events` we just nudge the
 * pulseKey so the matching row flashes.
 *
 * Cross-status transitions (incoming → active) move the item between
 * tabs.
 */
function applyFrame(
  frame: WsServerFrame,
  setOpp: React.Dispatch<React.SetStateAction<SetupCard[] | null>>,
  setAct: React.Dispatch<React.SetStateAction<SetupCard[] | null>>,
  setPulses: React.Dispatch<React.SetStateAction<Record<string, number>>>,
): void {
  const p = frame.data as SetupReplicationPayload | null;
  if (!p || typeof p !== 'object') return;

  if (p.table === 'setup_events') {
    const setupId = String((p.row as Record<string, unknown>).setup_id ?? '');
    if (setupId) bumpPulse(setupId, setPulses);
    return;
  }

  if (p.table !== 'setup') return;

  const raw = p.row as Record<string, unknown>;
  const id = String(raw.id ?? '');
  if (!id) return;

  bumpPulse(id, setPulses);

  const patch = (prev: SetupCard[] | null): SetupCard[] | null => {
    if (prev == null) return prev;
    return prev.map((s) => (s.id === id ? mergeRow(s, raw) : s));
  };
  setOpp(patch);
  setAct(patch);
}

function mergeRow(prev: SetupCard, raw: Record<string, unknown>): SetupCard {
  const n = (k: string): number | null => {
    const v = raw[k];
    if (v == null) return null;
    const x = Number(v);
    return Number.isFinite(x) ? x : null;
  };
  return {
    ...prev,
    status: ((raw.status as SetupCard['status']) ?? prev.status),
    position: ((raw.position as SetupCard['position']) ?? prev.position),
    entry_value: n('entry_value') ?? prev.entry_value,
    entry_value_end: n('entry_value_end') ?? prev.entry_value_end,
    stop_value: n('stop_value') ?? prev.stop_value,
    profit_taking_1: n('profit_taking_1') ?? prev.profit_taking_1,
    profit_taking_2: n('profit_taking_2') ?? prev.profit_taking_2,
    profit_taking_3: n('profit_taking_3') ?? prev.profit_taking_3,
    r_value: n('r_value') ?? prev.r_value,
    is_tp1: (raw.is_tp1 as boolean | null) ?? prev.is_tp1,
    is_tp2: (raw.is_tp2 as boolean | null) ?? prev.is_tp2,
    is_tp3: (raw.is_tp3 as boolean | null) ?? prev.is_tp3,
  };
}

function bumpPulse(
  id: string,
  setPulses: React.Dispatch<React.SetStateAction<Record<string, number>>>,
): void {
  setPulses((prev) => ({ ...prev, [id]: Date.now() }));
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number | null;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative rounded-lg px-4 py-2 text-sm font-medium transition ${
        active
          ? 'bg-white/5 text-fg ring-1 ring-white/10'
          : 'text-fg-muted hover:text-fg'
      }`}
    >
      <span>{label}</span>
      {count != null ? (
        <span
          className={`ml-2 rounded-md px-1.5 py-0.5 font-mono text-[10px] ring-1 ${
            active
              ? 'bg-brand/15 text-brand ring-brand/30'
              : 'bg-white/5 text-fg-dim ring-white/10'
          }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

function LiveBadge({ connected }: { connected: boolean }) {
  return (
    <span
      className={`flex items-center gap-2 rounded-md px-2 py-1 text-[11px] ring-1 ${
        connected
          ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/30'
          : 'bg-white/5 text-fg-dim ring-white/10'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          connected ? 'bg-emerald-400 animate-pulse' : 'bg-fg-dim'
        }`}
      />
      {connected ? 'Canlı' : 'Bağlanıyor…'}
    </span>
  );
}

function SkeletonList() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-xl border border-white/5 bg-white/[0.02]" />
      ))}
    </div>
  );
}

function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
      <div className="text-base font-medium text-fg">{title}</div>
      {hint ? <div className="mt-1 text-sm text-fg-muted">{hint}</div> : null}
    </div>
  );
}
