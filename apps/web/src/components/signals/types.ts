/** Wire types for /me/signals/feed — match the NestJS service. */

export type SignalStatus =
  | 'incoming'
  | 'active'
  | 'success'
  | 'stopped'
  | 'closed'
  | 'cancelled';

export interface SignalRow {
  id: string;
  status: string;
  position: 'long' | 'short' | null;
  coin: string;
  entry_value: number | null;
  stop_value: number | null;
  profit_taking_1: number | null;
  r_value: number | null;
  trader_id: string | null;
  trader_name: string | null;
  trader_image: string | null;
  created_at: string | null;
  last_acted_at: string | null;
  closed_at: string | null;
}

export interface SignalsFeed {
  active: SignalRow[];
  recent: SignalRow[];
  generated_at: string;
  window_hours: number;
}

/**
 * Toast event surfaced from the client-side feed differ. Each event
 * is fire-once and decays after a few seconds; the container is the
 * page itself, not a global toast stack, so it lives alongside the
 * feed list.
 */
export interface SignalEvent {
  id: string;
  kind:
    | 'new' // setup just appeared in the active book
    | 'entry_hit' // incoming → active
    | 'tp_hit' // active → success
    | 'stopped' // active → stopped
    | 'closed' // active → closed (manual)
    | 'edit'; // entry/stop/tp1 changed
  setup: SignalRow;
  at: number;
}
