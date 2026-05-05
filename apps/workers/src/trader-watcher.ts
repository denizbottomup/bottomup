import { Pool } from 'pg';
import type { Logger } from 'pino';
import type { RealtimeBus } from './realtime-bus.js';

/**
 * Polling-publisher for the public analyst directory. Hits the same SQL
 * the API's `PublicService.analystList()` uses, hashes each trader row,
 * and publishes deltas to:
 *   - `analyst:<lowercased name>`  → detail page subscribers
 *   - `analyst:*`                  → directory page subscribers
 *
 * Why poll instead of LISTEN/NOTIFY: trader_stats is recomputed by a
 * daily cron; followers + 30D-rolling derivations move slowly and the
 * existing legacy DB has no triggers wired. A 15s tick is plenty for
 * the directory's perceived "live" feel and keeps the watcher to one
 * indexed scan per interval.
 *
 * The payload shape MUST stay in sync with `Analyst` in
 * bupcore/lib/bottomup-api.ts so the frontend hook can splice an
 * incoming frame into table state without re-fetching.
 */

interface TraderRow {
  trader_id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  image: string | null;
  referral_code: string | null;
  followers: number;
  stats: {
    win_rate: number | null;
    monthly_win_rate: number | null;
    pnl: number | null;
    pnl_rate: number | null;
    monthly_pnl: number | null;
    monthly_pnl_rate: number | null;
    monthly_r: number | null;
    monthly_roi: number | null;
    rate: number | null;
    risk_score: number | null;
    stat_at: Date | null;
  };
}

export class TraderWatcher {
  private pool: Pool | null = null;
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly databaseUrl: string,
    private readonly bus: RealtimeBus,
    private readonly log: Logger,
    private readonly intervalMs: number = 15_000,
    private readonly limit: number = 100,
  ) {}

  async start(): Promise<void> {
    this.pool = new Pool({ connectionString: this.databaseUrl, max: 2 });
    await this.tick();
    this.timer = setInterval(() => void this.tick(), this.intervalMs);
    this.log.info({ intervalMs: this.intervalMs }, 'trader-watcher: started');
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    await this.pool?.end();
    this.pool = null;
  }

  private async tick(): Promise<void> {
    if (!this.pool || this.running) return;
    this.running = true;
    try {
      const rows = await this.fetchRows();
      for (const r of rows) {
        const key = (r.name ?? r.trader_id).toLowerCase();
        // RealtimeBus hash-dedups so unchanged rows don't hit the wire.
        // Two topics so detail (analyst:<name>) and directory
        // (analyst:*) clients both get the same frame. No tick-level
        // timestamp in the payload — that would defeat dedup; the
        // client stamps arrival time on its end.
        this.bus.publish('analyst', key, r);
        this.bus.publish('analyst', '*', r);
      }
    } catch (err) {
      this.log.warn({ err: (err as Error).message }, 'trader-watcher: tick failed');
    } finally {
      this.running = false;
    }
  }

  private async fetchRows(): Promise<TraderRow[]> {
    const rows = await this.pool!.query<Record<string, unknown>>(
      `SELECT u.id::text   AS trader_id,
              u.name,
              u.first_name,
              u.last_name,
              u.image,
              u.referral_code,
              (SELECT COUNT(*)::int FROM follow_notify f
                WHERE f.trader_id = u.id AND f.follow = TRUE AND f.is_deleted = FALSE) AS followers,
              ts.win_rate, ts.monthly_win_rate, ts.pnl, ts.pnl_rate,
              ts.monthly_pnl, ts.monthly_pnl_rate, ts.monthly_r, ts.monthly_roi,
              ts.rate, ts.risk_score, ts.stat_at
         FROM "user" u
         LEFT JOIN trader_stats ts ON ts.trader_id = u.id
        WHERE u.is_trader = TRUE AND u.is_active = TRUE AND u.is_deleted = FALSE
        ORDER BY ts.monthly_pnl DESC NULLS LAST
        LIMIT $1`,
      [this.limit],
    );

    return rows.rows.map((r) => ({
      trader_id: r.trader_id as string,
      name: (r.name as string | null) ?? null,
      first_name: (r.first_name as string | null) ?? null,
      last_name: (r.last_name as string | null) ?? null,
      image: (r.image as string | null) ?? null,
      referral_code: (r.referral_code as string | null) ?? null,
      followers: Number(r.followers ?? 0),
      stats: {
        win_rate: r.win_rate == null ? null : Number(r.win_rate),
        monthly_win_rate:
          r.monthly_win_rate == null ? null : Number(r.monthly_win_rate),
        pnl: r.pnl == null ? null : Number(r.pnl),
        pnl_rate: r.pnl_rate == null ? null : Number(r.pnl_rate),
        monthly_pnl: r.monthly_pnl == null ? null : Number(r.monthly_pnl),
        monthly_pnl_rate:
          r.monthly_pnl_rate == null ? null : Number(r.monthly_pnl_rate),
        monthly_r: r.monthly_r == null ? null : Number(r.monthly_r),
        monthly_roi: r.monthly_roi == null ? null : Number(r.monthly_roi),
        rate: r.rate == null ? null : Number(r.rate),
        risk_score: r.risk_score == null ? null : Number(r.risk_score),
        stat_at: (r.stat_at as Date | null) ?? null,
      },
    }));
  }
}
