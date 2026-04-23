'use client';

import { useEffect, useState } from 'react';
import { BottomupWs } from './ws';

/**
 * Live market ticker store. A single `BottomupWs` is shared across the
 * whole app — the first `useTicker(...)` call bootstraps a connection
 * bound to `spot:*` + `futures:*`; the last hook unmount closes it.
 *
 * Each subscriber only re-renders when its own symbol ticks, so a feed
 * page with 50 rows doesn't force 50 renders per Binance frame. The
 * worker already throttles publishes to ~1 Hz per symbol.
 *
 * Payload matches the mobile contract:
 *   { open, close, high, low, change, color: 'g'|'r', ts, tsm }
 * (all decimals are strings).
 */
export interface TickerPayload {
  open: string;
  close: string;
  high: string;
  low: string;
  change: string;
  color: 'g' | 'r';
  ts: number;
  tsm: number;
}

const store = new Map<string, TickerPayload>();
const listeners = new Map<string, Set<() => void>>();

let ws: BottomupWs | null = null;
let refCount = 0;

function ensureConnected(): void {
  if (ws) return;
  ws = new BottomupWs();
  ws.connect();
  ws.bind('spot', '*');
  ws.bind('futures', '*');
  ws.onMessage((frame) => {
    if (frame.channel !== 'spot' && frame.channel !== 'futures') return;
    const key = String(frame.id || '').toUpperCase();
    if (!key) return;
    const data = frame.data as Partial<TickerPayload> | null;
    if (!data || typeof data !== 'object') return;
    const payload: TickerPayload = {
      open: String(data.open ?? ''),
      close: String(data.close ?? ''),
      high: String(data.high ?? ''),
      low: String(data.low ?? ''),
      change: String(data.change ?? ''),
      color: (data.color === 'r' ? 'r' : 'g') as 'g' | 'r',
      ts: Number(data.ts ?? Date.now()),
      tsm: Number(data.tsm ?? Date.now()),
    };
    store.set(key, payload);
    const set = listeners.get(key);
    if (set) for (const l of set) l();
  });
}

function teardownIfIdle(): void {
  if (refCount > 0) return;
  ws?.close();
  ws = null;
}

/**
 * Subscribe the current component to live price updates for a single
 * coin (e.g. "BTCUSDT"). Returns the most recent payload or null if
 * nothing has been received yet.
 */
export function useTicker(symbol: string | null | undefined): TickerPayload | null {
  const key = (symbol ?? '').toUpperCase();
  const [snapshot, setSnapshot] = useState<TickerPayload | null>(() =>
    key ? store.get(key) ?? null : null,
  );

  useEffect(() => {
    if (!key) return;
    refCount++;
    ensureConnected();

    let set = listeners.get(key);
    if (!set) {
      set = new Set();
      listeners.set(key, set);
    }
    const listener = (): void => {
      const next = store.get(key) ?? null;
      setSnapshot(next);
    };
    set.add(listener);
    listener();

    return () => {
      set!.delete(listener);
      if (set!.size === 0) listeners.delete(key);
      refCount = Math.max(0, refCount - 1);
      // Defer teardown so rapid re-mounts (Strict Mode, route churn)
      // don't flap the socket.
      setTimeout(teardownIfIdle, 3000);
    };
  }, [key]);

  return snapshot;
}
