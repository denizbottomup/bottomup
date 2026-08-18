import type { Logger } from 'pino';
import type { RealtimeBus } from './realtime-bus.js';

/**
 * Polling-publisher for the public analyst directory. Hits FastAPI
 * `/public/analysts` (same pnl_setup6 window as status.bottomup.app)
 * and publishes to:
 *   - `analyst:<lowercased name>`  → detail page subscribers
 *   - `analyst:*`                  → directory page subscribers
 *
 * Used to scan the Railway replica's `trader_stats`. That copy froze;
 * the live API is the source of truth now.
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
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly backendUrl: string,
    private readonly bus: RealtimeBus,
    private readonly log: Logger,
    private readonly intervalMs: number = 15_000,
    private readonly limit: number = 100,
  ) {}

  async start(): Promise<void> {
    await this.tick();
    this.timer = setInterval(() => void this.tick(), this.intervalMs);
    this.log.info(
      { intervalMs: this.intervalMs, backendUrl: this.backendUrl },
      'trader-watcher: started',
    );
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const rows = await this.fetchRows();
      for (const r of rows) {
        const key = (r.name ?? r.trader_id).toLowerCase();
        // Single per-id publish. The ws gateway fans this same frame
        // out to both `analyst:<name>` topic subscribers (detail page)
        // and `analyst:*` topic subscribers (directory page), so a
        // second publish here would (a) duplicate every frame for
        // wildcard clients and (b) thrash the dedup cache because
        // every row would overwrite the same `analyst:*` slot.
        //
        // publishAlways (not the deduped publish) because the LIVE
        // badge on the page needs a proof-of-life frame on every
        // tick, not only on data change.
        this.bus.publishAlways('analyst', key, r);
      }
    } catch (err) {
      this.log.warn({ err: (err as Error).message }, 'trader-watcher: tick failed');
    } finally {
      this.running = false;
    }
  }

  private async fetchRows(): Promise<TraderRow[]> {
    const url = new URL('/public/analysts', this.backendUrl);
    url.searchParams.set('limit', String(this.limit));
    url.searchParams.set('order_by', 'monthly_pnl');
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (!res.ok) {
      throw new Error(`public/analysts ${res.status}`);
    }
    return (await res.json()) as TraderRow[];
  }
}
