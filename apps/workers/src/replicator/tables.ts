/**
 * Tables we actively replicate from the legacy `umay.bottomup.app` Postgres
 * to the Railway Postgres. Ordered by business-importance.
 *
 * `cursorCol` must be a monotonic timestamptz column that exists on BOTH
 * source and target. If a table lacks such a column, set cursorCol=null —
 * the replicator will skip it (cheap tables can be re-snapshotted manually
 * or by a separate slower job).
 */

export interface TableReplicationSpec {
  name: string;
  pkCols: string[];
  cursorCol: string | null;
  excludeCols?: string[];
}

export const REPLICATED_TABLES: TableReplicationSpec[] = [
  // ─── Users & identity ─────────────────────────────────────────────
  { name: 'user', pkCols: ['id'], cursorCol: 'updated_at' },
  { name: 'trader_profile', pkCols: ['id'], cursorCol: 'updated_at' },

  // ─── Setups & social ──────────────────────────────────────────────
  { name: 'setup', pkCols: ['id'], cursorCol: 'updated_at' },
  { name: 'setup_events', pkCols: ['id'], cursorCol: 'event_time' },
  { name: 'setup_value_history', pkCols: ['id'], cursorCol: 'created_at' },
  { name: 'clap', pkCols: ['id'], cursorCol: 'created_at' },
  { name: 'report', pkCols: ['id'], cursorCol: 'created_at' },
  { name: 'follow_notify', pkCols: ['id'], cursorCol: 'updated_at' },

  // ─── Copy-trade ───────────────────────────────────────────────────
  { name: 'copy_trades', pkCols: ['id'], cursorCol: 'updated_at' },
  { name: 'copy_trade_order', pkCols: ['id'], cursorCol: 'updated_at' },
  { name: 'team_traders', pkCols: ['team_id', 'trader_id'], cursorCol: 'updated_at' },

  // ─── Trader performance & stats ──────────────────────────────────
  // pk is id, but setup_id has a UNIQUE constraint — and the source db
  // occasionally recycles ids for the same setup, so upsert must target
  // setup_id to avoid "duplicate key" conflicts on the UNIQUE index.
  { name: 'trader_setup_pnl_performance', pkCols: ['setup_id'], cursorCol: 'updated_at' },

  // ─── Market / watchlist ───────────────────────────────────────────
  { name: 'coin', pkCols: ['id'], cursorCol: 'updated_at' },
  { name: 'watch_list', pkCols: ['id'], cursorCol: 'updated_at' },

  // ─── Subscription & IAP ───────────────────────────────────────────
  { name: 'user_subscription', pkCols: ['id'], cursorCol: 'updated_at' },
  { name: 'product', pkCols: ['id'], cursorCol: 'updated_at' },
  { name: 'subscription_pool', pkCols: ['id'], cursorCol: 'updated_at' },

  // ─── Referral earnings ────────────────────────────────────────────
  { name: 'trader_referral_earning', pkCols: ['id'], cursorCol: 'updated_at' },

  // ─── Content feed ─────────────────────────────────────────────────
  { name: 'news', pkCols: ['id'], cursorCol: 'updated_at' },
  { name: 'calendar', pkCols: ['id'], cursorCol: 'updated_at' },

  // ─── Notifications ────────────────────────────────────────────────
  { name: 'user_notification', pkCols: ['id'], cursorCol: 'created_at' },
  { name: 'server_notification_messages', pkCols: ['id'], cursorCol: 'created_at' },

  // ─── Ads ──────────────────────────────────────────────────────────
  { name: 'ads', pkCols: ['id'], cursorCol: 'updated_at' },
];
