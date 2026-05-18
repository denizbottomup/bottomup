'use client';

import type { CoinMatch } from '@/lib/coin-extract';
import type { FoxyCoinSetup, FoxySetupsByCoin } from './types';

interface Props {
  coin: CoinMatch;
  setups: FoxySetupsByCoin | null;
  loading: boolean;
}

/**
 * Per-trader breakdown of every active setup on the queried coin —
 * "kim, ne yöne, hangi seviyelerden". Sits between the verdict hero
 * and the TradingView embed so the trader can map names to lines on
 * the chart immediately.
 */
export function FoxyTradesTable({ coin, setups, loading }: Props) {
  return (
    <section className="rounded-2xl border border-border bg-bg-card overflow-hidden">
      <div className="flex items-baseline justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-baseline gap-3">
          <h3 className="text-sm font-semibold text-fg">
            BottomUP trader'ları · {coin.symbol}
          </h3>
          {!loading && setups ? (
            <span className="font-mono text-[11px] text-fg-dim">
              {setups.active.length} aktif setup
            </span>
          ) : null}
        </div>
        <div className="mono-label !text-fg-dim">giriş · stop · tp1 · R</div>
      </div>

      {loading ? (
        <TableSkeleton />
      ) : !setups || setups.active.length === 0 ? (
        <div className="px-4 py-6 text-sm text-fg-dim">
          Bu coinde şu an aktif trader setup'ı yok.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[10.5px] uppercase tracking-[0.1em] text-fg-dim">
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left font-normal">Trader</th>
                <th className="px-3 py-2 text-left font-normal">Pozisyon</th>
                <th className="px-3 py-2 text-right font-normal">Giriş</th>
                <th className="px-3 py-2 text-right font-normal">Stop</th>
                <th className="px-3 py-2 text-right font-normal">TP1</th>
                <th className="px-3 py-2 text-right font-normal">R</th>
                <th className="px-4 py-2 text-right font-normal">Yaş</th>
              </tr>
            </thead>
            <tbody>
              {setups.active.map((s, i) => (
                <SetupRow key={s.id} setup={s} striped={i % 2 === 1} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function SetupRow({
  setup,
  striped,
}: {
  setup: FoxyCoinSetup;
  striped: boolean;
}) {
  return (
    <tr
      className={`border-b border-border/60 ${
        striped ? 'bg-bg-elev/30' : ''
      }`}
    >
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          {setup.trader_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={setup.trader_image}
              alt=""
              className="size-6 rounded-full bg-bg-elev object-cover"
            />
          ) : (
            <div className="flex size-6 items-center justify-center rounded-full bg-bg-elev text-[10px] text-fg-muted">
              {(setup.trader_name ?? '?').slice(0, 1).toUpperCase()}
            </div>
          )}
          <span className="truncate text-fg">
            {setup.trader_name ?? 'Anonim'}
          </span>
        </div>
      </td>
      <td className="px-3 py-2.5">
        <PositionPill position={setup.position} />
      </td>
      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-fg">
        {formatPrice(setup.entry_value)}
      </td>
      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-rose-200">
        {formatPrice(setup.stop_value)}
      </td>
      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-mint-soft">
        {formatPrice(setup.profit_taking_1)}
      </td>
      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-fg-muted">
        {formatR(setup.r_value)}
      </td>
      <td className="px-4 py-2.5 text-right font-mono text-[11px] text-fg-dim">
        {relTime(setup.last_acted_at ?? setup.created_at)}
      </td>
    </tr>
  );
}

function PositionPill({ position }: { position: FoxyCoinSetup['position'] }) {
  if (position === 'long') {
    return (
      <span className="rounded-full border border-mint/40 bg-mint/10 px-2 py-0.5 font-mono text-[11px] text-mint-soft">
        LONG
      </span>
    );
  }
  if (position === 'short') {
    return (
      <span className="rounded-full border border-rose-400/40 bg-rose-500/10 px-2 py-0.5 font-mono text-[11px] text-rose-200">
        SHORT
      </span>
    );
  }
  return <span className="text-fg-dim">—</span>;
}

function TableSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-7 w-full animate-pulse rounded bg-bg-elev/60" />
      ))}
    </div>
  );
}

function formatPrice(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—';
  // Crypto prices span ~$0.00001 (memes) to $100k+ (BTC). Pick a
  // reasonable precision per magnitude — keeps the column narrow
  // without obscuring meaningful digits.
  if (n >= 10000) return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (n >= 100) return `$${n.toLocaleString('en-US', { maximumFractionDigits: 1 })}`;
  if (n >= 1) return `$${n.toLocaleString('en-US', { maximumFractionDigits: 3 })}`;
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 6 })}`;
}

function formatR(r: number | null): string {
  if (r == null || !Number.isFinite(r)) return '—';
  const sign = r >= 0 ? '+' : '';
  return `${sign}${r.toFixed(1)}`;
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
