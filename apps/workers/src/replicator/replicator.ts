import { Pool } from 'pg';
import type { Logger } from 'pino';
import { REPLICATED_TABLES, type TableReplicationSpec } from './tables.js';
import type { RealtimeBus } from '../realtime-bus.js';

const CURSOR_SLACK_MS = 2_000;
const BATCH_SIZE = 500;

// Tables whose per-row changes we push to the ws gateway. Replicator emits
// AFTER each successful upsert so clients see an atomic, consistent view.
const REALTIME_TABLES: Record<string, 'setup' | 'trader'> = {
  setup: 'setup',
  setup_events: 'setup',
  trader_profile: 'trader',
  follow_notify: 'trader',
};

export interface ReplicatorOpts {
  // Base URL of the bottomup-backend /internal/replication router, e.g.
  // https://api.bottomup.app/internal/replication — NOT a Postgres DSN.
  // Source Postgres is Hetzner-firewalled with no static-IP allowlist path
  // (Railway's outbound IPv4 is Pro-plan-only and unavailable here), so we
  // pull rows over HTTPS instead of connecting to the DB port directly.
  sourceApiUrl: string;
  sourceApiKey: string;
  targetUrl: string;
  log: Logger;
  realtime?: RealtimeBus | null;
}

/**
 * Polls each table for rows newer than the last-seen cursor (via the
 * bottomup-backend replication API) and upserts them into the target DB.
 *
 * Deletes are NOT captured — logical replication would be needed for that.
 */
export class Replicator {
  private readonly sourceApiUrl: string;
  private readonly sourceApiKey: string;
  private readonly dst: Pool;
  private readonly log: Logger;
  private readonly cursors = new Map<string, string | null>();
  private readonly realtime: RealtimeBus | null;
  private ticking = false;

  constructor(opts: ReplicatorOpts) {
    this.sourceApiUrl = opts.sourceApiUrl.replace(/\/+$/, '');
    this.sourceApiKey = opts.sourceApiKey;
    this.dst = new Pool({
      connectionString: opts.targetUrl,
      ssl: { rejectUnauthorized: false as const },
      max: 3,
      idleTimeoutMillis: 30_000,
    });
    this.log = opts.log;
    this.realtime = opts.realtime ?? null;

    // Swallow idle-client errors so one bad connection doesn't crash the
    // whole process — the pool will reconnect on next checkout.
    this.dst.on('error', (err) => this.log.warn({ err: err.message }, 'replicator: dst pool idle error'));
  }

  async start(): Promise<void> {
    // Bootstrap cursors from target's current max, then back up by 24h.
    //
    // Why the rewind: legacy rows whose `updated_at` is earlier than the
    // target table's MAX(updated_at) get permanently skipped — the cursor
    // starts ahead of them and the polling query (`WHERE col > cursor`)
    // never sees them. We hit this in production with a trader who
    // renamed themselves at 00:21 while another row landed at 14:02 in
    // the same day; bootstrap then anchored the cursor at 14:02 and the
    // 00:21 update was orphaned forever.
    //
    // Rewinding by 24h on every start re-considers the past day's
    // changes. Upserts are idempotent (INSERT ON CONFLICT DO UPDATE),
    // so the only cost is one extra batch's worth of round-trips per
    // restart — cheap relative to the alternative of stale rows.
    const REWIND_MS = 24 * 60 * 60 * 1000;
    const dst = await this.dst.connect();
    try {
      for (const spec of REPLICATED_TABLES) {
        if (!spec.cursorCol) continue;
        const { rows } = await dst.query(
          `SELECT MAX(${q(spec.cursorCol)}) AS v FROM ${q(spec.name)}`,
        );
        const raw = rows[0]?.v ?? null;
        if (raw == null) {
          this.cursors.set(spec.name, null);
          continue;
        }
        const ms = (raw instanceof Date ? raw.getTime() : new Date(String(raw)).getTime()) - REWIND_MS;
        this.cursors.set(spec.name, new Date(ms).toISOString());
      }
    } finally {
      dst.release();
    }
    this.log.info(
      { tables: this.cursors.size, rewindMs: REWIND_MS },
      'replicator: cursors bootstrapped',
    );
  }

  async stop(): Promise<void> {
    await this.dst.end();
  }

  /**
   * Run one full tick. Skips if a previous tick is still in flight (long
   * initial ticks can exceed the polling interval).
   */
  async tickAll(): Promise<{ synced: Record<string, number>; errors: Record<string, string> }> {
    if (this.ticking) {
      this.log.debug('replicator: previous tick still running, skipping');
      return { synced: {}, errors: {} };
    }
    this.ticking = true;
    const synced: Record<string, number> = {};
    const errors: Record<string, string> = {};
    try {
      for (const spec of REPLICATED_TABLES) {
        try {
          const n = await this.tickTable(spec);
          if (n > 0) synced[spec.name] = n;
        } catch (err) {
          errors[spec.name] = (err as Error).message;
          this.log.warn({ table: spec.name, err: (err as Error).message }, 'replicator: tick failed');
        }
      }
    } finally {
      this.ticking = false;
    }
    return { synced, errors };
  }

  private async tickTable(spec: TableReplicationSpec): Promise<number> {
    const dstCols = await this.getDstColumns(spec);
    if (dstCols.length === 0) return 0;

    const jsonCols = await this.getJsonColumns(spec.name);

    const cursor = this.cursors.get(spec.name) ?? null;
    // Same slack the old direct-SQL query applied via `$1::timestamptz -
    // INTERVAL '2000ms'` — absorbs clock skew between rows committed within
    // the same tick window so none land exactly on the cursor boundary and
    // get skipped.
    const since = spec.cursorCol
      ? new Date(new Date(cursor ?? '1970-01-01').getTime() - CURSOR_SLACK_MS).toISOString()
      : undefined;

    const rows = await this.fetchSourceRows(spec.name, since, BATCH_SIZE);
    if (rows.length === 0) return 0;

    // Source now returns every column it has (SELECT * on the backend) —
    // intersect with dst's columns here, same safety net the old two-sided
    // information_schema intersection gave us against schema drift.
    const firstRow = rows[0];
    const cols = dstCols.filter((c) => Object.prototype.hasOwnProperty.call(firstRow, c));
    if (cols.length === 0) return 0;

    // Fresh target checkout for the upsert transaction. Each row is
    // wrapped in its own SAVEPOINT — a single bad row (e.g. duplicate
    // email on the user table) fails ROLLBACK TO SAVEPOINT only and
    // the rest of the batch still commits. Without this, one bad row
    // poisons the whole batch and the cursor never advances.
    const dst = await this.dst.connect();
    let skipped = 0;
    let lastSkipErr: string | null = null;
    try {
      await dst.query('BEGIN');
      await dst.query(`SET LOCAL session_replication_role = 'replica'`);
      const upsertSql = buildUpsert(spec, cols);
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i] as Record<string, unknown>;
        const values = cols.map((c) => {
          const v = row[c];
          if (v === undefined || v === null) return null;
          if (jsonCols.has(c) && typeof v === 'object') return JSON.stringify(v);
          return v;
        });
        const sp = `sp_${i}`;
        await dst.query(`SAVEPOINT ${sp}`);
        try {
          await dst.query(upsertSql, values);
          await dst.query(`RELEASE SAVEPOINT ${sp}`);
        } catch (err) {
          await dst.query(`ROLLBACK TO SAVEPOINT ${sp}`);
          skipped += 1;
          lastSkipErr = (err as Error).message;
        }
      }
      await dst.query('COMMIT');
    } catch (err) {
      await dst.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      dst.release();
    }
    if (skipped > 0) {
      this.log.warn(
        { table: spec.name, skipped, total: rows.length, lastErr: lastSkipErr },
        'replicator: rows skipped',
      );
    }

    if (spec.cursorCol) {
      const lastRow = rows[rows.length - 1];
      const lastVal = lastRow?.[spec.cursorCol] as string | undefined;
      if (lastVal) this.cursors.set(spec.name, lastVal);
    }

    const channel = REALTIME_TABLES[spec.name];
    if (channel && this.realtime) {
      for (const row of rows) {
        const setupId =
          spec.name === 'setup_events'
            ? (row.setup_id as string | null | undefined)
            : spec.name === 'setup'
              ? (row.id as string | null | undefined)
              : null;
        if (setupId) {
          this.realtime.publish(channel, String(setupId), {
            table: spec.name,
            row,
            cursor: spec.cursorCol ? row[spec.cursorCol] : null,
          });
        } else if (channel === 'trader') {
          const traderId =
            (row.trader_id as string | null | undefined) ??
            (row.id as string | null | undefined);
          if (traderId) {
            this.realtime.publish(channel, String(traderId), {
              table: spec.name,
              row,
            });
          }
        }

        // Analyst-page invalidation: when a setup transitions to a
        // closed status, the trader's detail page (PerfMatrix, equity
        // curve, monthly bars, recent trades) needs to refetch. We
        // publish a lightweight notification on `analyst:<trader_id>`
        // so the detail-page client component can call router.refresh().
        // RealtimeBus dedups on payload hash, so a re-upsert of the
        // same closed setup (cursor slack overlap) won't re-notify.
        if (spec.name === 'setup') {
          const status = String(row.status ?? '');
          const traderId = row.trader_id as string | null | undefined;
          if (
            traderId &&
            (status === 'success' || status === 'stopped' || status === 'closed')
          ) {
            this.realtime.publish('analyst', String(traderId), {
              kind: 'trades-changed',
              setupId: row.id,
              status,
            });
          }
        }
      }
    }

    return rows.length;
  }

  /** GET {sourceApiUrl}/tables/{table}?since=...&limit=... — see
   * bottomup-backend apps/replication/api.py for the contract. */
  private async fetchSourceRows(
    table: string,
    since: string | undefined,
    limit: number,
  ): Promise<Record<string, unknown>[]> {
    const url = new URL(`${this.sourceApiUrl}/tables/${encodeURIComponent(table)}`);
    url.searchParams.set('limit', String(limit));
    if (since) url.searchParams.set('since', since);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${this.sourceApiKey}` },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`replication source fetch failed: ${res.status} ${body}`.trim());
    }
    return (await res.json()) as Record<string, unknown>[];
  }

  private async getDstColumns(spec: TableReplicationSpec): Promise<string[]> {
    const cached = dstColsCache.get(spec.name);
    if (cached) return cached;
    const { rows } = await this.dst.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema='public' AND table_name=$1`,
      [spec.name],
    );
    const excluded = new Set(spec.excludeCols ?? []);
    const cols = rows.map((r) => r.column_name).filter((c) => !excluded.has(c));
    dstColsCache.set(spec.name, cols);
    return cols;
  }

  private async getJsonColumns(table: string): Promise<Set<string>> {
    const cached = jsonColsCache.get(table);
    if (cached) return cached;
    const { rows } = await this.dst.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema='public' AND table_name=$1
          AND data_type IN ('json', 'jsonb')`,
      [table],
    );
    const set = new Set(rows.map((r) => r.column_name));
    jsonColsCache.set(table, set);
    return set;
  }
}

const dstColsCache = new Map<string, string[]>();
const jsonColsCache = new Map<string, Set<string>>();

function q(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function buildUpsert(spec: TableReplicationSpec, cols: string[]): string {
  const colList = cols.map(q).join(', ');
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
  const pkList = spec.pkCols.map(q).join(', ');
  const nonPkCols = cols.filter((c) => !spec.pkCols.includes(c));
  const updates = nonPkCols.map((c) => `${q(c)} = EXCLUDED.${q(c)}`).join(', ');
  return nonPkCols.length > 0
    ? `INSERT INTO ${q(spec.name)} (${colList}) VALUES (${placeholders})
         ON CONFLICT (${pkList}) DO UPDATE SET ${updates}`
    : `INSERT INTO ${q(spec.name)} (${colList}) VALUES (${placeholders})
         ON CONFLICT (${pkList}) DO NOTHING`;
}
