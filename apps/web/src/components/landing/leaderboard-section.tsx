import Link from 'next/link';
import { displayName, type LandingPayload } from './landing-data';

export function LeaderboardSection({
  traders,
}: {
  traders: LandingPayload['top_traders'];
}) {
  const shown = traders.filter((t) => t.monthly_trades > 0).slice(0, 6);

  return (
    <section id="leaderboard" className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 grid-pattern opacity-40" />
      <div className="mx-auto max-w-[1400px] px-4 py-14 md:px-8 md:py-20">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mono-label">Live leaderboard</div>
            <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">
              $10,000 on April 1st.{' '}
              <span className="brand-gradient">Where are they now?</span>
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-fg-muted md:text-base">
              Every trader starts the month with a virtual $10,000. Equal
              $1,000 slot per closed trade. Long/short aware. Numbers update
              as they trade.
            </p>
          </div>
          <Link
            href="/signup"
            className="btn-primary whitespace-nowrap px-5 py-3 text-base"
          >
            Browse marketplace →
          </Link>
        </header>

        {shown.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border px-4 py-12 text-center text-sm text-fg-dim">
            No closed trades yet this month — check back soon.
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {shown.map((t, i) => (
              <TraderCard key={t.trader_id} trader={t} rank={i + 1} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function TraderCard({
  trader,
  rank,
}: {
  trader: LandingPayload['top_traders'][0];
  rank: number;
}) {
  const name = displayName(trader);
  const winRate =
    trader.monthly_win_rate == null
      ? null
      : Math.round(trader.monthly_win_rate * 100);
  const positive = trader.virtual_return_pct >= 0;
  const returnTone = positive ? 'text-emerald-300' : 'text-rose-300';
  const balanceTone = positive ? 'text-fg' : 'text-rose-300';
  const accent = positive
    ? 'from-emerald-400/40 via-emerald-400/10'
    : 'from-rose-400/40 via-rose-400/10';

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-bg-card p-[1px] transition hover:border-white/20">
      <div
        className={`pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br ${accent} to-transparent opacity-0 transition group-hover:opacity-100`}
      />
      <div className="flex h-full flex-col rounded-[calc(1rem-1px)] bg-bg-card p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="mono-label !text-fg-dim">#{String(rank).padStart(2, '0')}</span>
            {trader.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={trader.image}
                alt=""
                className="h-12 w-12 rounded-full object-cover ring-2 ring-white/10"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-lg font-bold text-fg ring-2 ring-white/10">
                {name[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <div>
              <div className="text-base font-semibold text-fg">{name}</div>
              <div className="text-[11px] text-fg-dim stat-num">
                {trader.followers.toLocaleString('en-US')} followers
              </div>
            </div>
          </div>
          <span
            className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ring-1 ${
              positive
                ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/30'
                : 'bg-rose-400/10 text-rose-300 ring-rose-400/30'
            }`}
          >
            {positive ? '▲' : '▼'}{' '}
            {positive ? '+' : ''}
            {trader.virtual_return_pct.toFixed(1)}%
          </span>
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <div className="mono-label !text-fg-dim">Virtual balance</div>
          <div className={`stat-num mt-0.5 text-3xl font-bold md:text-4xl ${balanceTone}`}>
            ${trader.virtual_balance_usd.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="mt-0.5 text-[11px] text-fg-dim">
            from{' '}
            <span className="stat-num text-fg-muted">$10,000</span> this month
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <MiniStat
            label="Trades"
            value={trader.monthly_trades.toString()}
          />
          <MiniStat
            label="Wins"
            value={trader.monthly_wins.toString()}
            tone="success"
          />
          <MiniStat
            label="Win rate"
            value={winRate != null ? `${winRate}%` : '—'}
            tone={winRate != null && winRate >= 50 ? 'success' : 'neutral'}
          />
        </div>

        <div className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-rose-400/20">
          <div
            className="bg-emerald-400"
            style={{
              width: `${winRate == null ? 50 : Math.min(100, Math.max(0, winRate))}%`,
            }}
          />
        </div>

        <div className="mt-4 flex items-center justify-between text-[11px] text-fg-dim">
          <span
            className={`flex items-center gap-1 ${
              returnTone
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${positive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
            {positive ? 'Live' : 'Drawdown'}
          </span>
          <span>Foxy-audited signals only</span>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'success';
}) {
  return (
    <div className="rounded-lg bg-white/[0.03] p-2.5">
      <div className="text-[9px] uppercase tracking-wider text-fg-dim">
        {label}
      </div>
      <div
        className={`stat-num mt-0.5 text-sm font-bold ${
          tone === 'success' ? 'text-emerald-300' : 'text-fg'
        }`}
      >
        {value}
      </div>
    </div>
  );
}
