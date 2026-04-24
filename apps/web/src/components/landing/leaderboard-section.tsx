import Link from 'next/link';
import { displayName, type LandingPayload } from './landing-data';

const TRADE = process.env.NEXT_PUBLIC_TRADE_URL ?? '';

export function LeaderboardSection({
  traders,
  setups,
}: {
  traders: LandingPayload['top_traders'];
  setups: LandingPayload['latest_setups'];
}) {
  return (
    <section id="leaderboard" className="relative">
      <div className="mx-auto max-w-[1400px] px-4 py-14 md:px-8 md:py-20">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-brand">
              Trader liderleri + canlı sinyaller
            </div>
            <h2 className="mt-1 text-2xl font-semibold md:text-3xl">
              Kimleri takip edeceğini sana gösterelim
            </h2>
            <p className="mt-2 max-w-xl text-sm text-fg-muted">
              Aylık ROI'ye göre sıralanmış en iyi trader'lar ve şu an yayınlanan
              en son setup'lar. Üye olduğunda bunları takımına ekler, kasanda
              denersin.
            </p>
          </div>
          <Link
            href={`${TRADE}/signup`}
            className="btn-ghost whitespace-nowrap"
          >
            Tüm liderleri gör →
          </Link>
        </header>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fg-muted">
              <span className="h-px flex-1 bg-border" />
              En iyi trader'lar · Aylık ROI
              <span className="h-px flex-1 bg-border" />
            </div>
            <div className="space-y-2">
              {traders.length === 0 ? (
                <Empty text="Trader verisi henüz yüklenmedi." />
              ) : (
                traders.map((t, i) => <TraderRow key={t.trader_id} trader={t} rank={i + 1} />)
              )}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fg-muted">
              <span className="h-px flex-1 bg-border" />
              Son setup'lar · Canlı
              <span className="h-px flex-1 bg-border" />
            </div>
            <div className="space-y-2">
              {setups.length === 0 ? (
                <Empty text="Canlı setup bulunamadı." />
              ) : (
                setups.slice(0, 6).map((s) => <SetupRow key={s.id} setup={s} />)
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-fg-dim">
      {text}
    </div>
  );
}

function TraderRow({
  trader,
  rank,
}: {
  trader: LandingPayload['top_traders'][0];
  rank: number;
}) {
  const name = displayName(trader);
  const roi = trader.monthly_roi;
  const roiTone = roi == null
    ? 'text-fg-dim'
    : roi >= 0
      ? 'text-emerald-300'
      : 'text-rose-300';
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-bg-card p-3 transition hover:border-white/20">
      <span className="w-6 text-center font-mono text-xs text-fg-dim">
        {rank}
      </span>
      {trader.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={trader.image}
          alt=""
          className="h-9 w-9 rounded-full object-cover ring-1 ring-white/10"
        />
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-sm font-semibold text-fg ring-1 ring-white/10">
          {name[0]?.toUpperCase() ?? '?'}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-fg">{name}</div>
        <div className="text-[11px] text-fg-dim">
          {trader.followers.toLocaleString('tr-TR')} takipçi
          {trader.win_rate != null
            ? ` · %${Math.round(trader.win_rate * 100)} başarı`
            : ''}
        </div>
      </div>
      {roi != null ? (
        <span className={`font-mono text-sm font-semibold ${roiTone}`}>
          {roi >= 0 ? '+' : ''}
          {roi.toFixed(1)}%
        </span>
      ) : null}
    </div>
  );
}

function SetupRow({ setup }: { setup: LandingPayload['latest_setups'][0] }) {
  const isLong = setup.position === 'long';
  const isShort = setup.position === 'short';
  const tone = isLong
    ? 'text-emerald-300'
    : isShort
      ? 'text-rose-300'
      : 'text-fg-dim';

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-bg-card p-3 transition hover:border-white/20">
      {setup.coin_image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={setup.coin_image}
          alt=""
          className="h-8 w-8 rounded-full object-cover ring-1 ring-white/10"
        />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 font-mono text-[10px] text-fg-muted ring-1 ring-white/10">
          {setup.coin_name.slice(0, 3)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold text-fg">
            {setup.coin_name}
          </span>
          <span className={`text-[11px] font-medium ${tone}`}>
            {isLong ? 'Long' : isShort ? 'Short' : '—'}
          </span>
          <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-fg-dim">
            {setup.status}
          </span>
        </div>
        <div className="mt-0.5 truncate text-[11px] text-fg-dim">
          {setup.trader_name ?? '—'}
        </div>
      </div>
      {setup.r_value != null ? (
        <span
          className={`rounded-md px-2 py-0.5 font-mono text-[11px] ring-1 ${
            setup.r_value >= 2
              ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/30'
              : 'bg-white/5 text-fg-muted ring-white/10'
          }`}
        >
          R {setup.r_value.toFixed(1)}
        </span>
      ) : null}
    </div>
  );
}
