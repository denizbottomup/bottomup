export function FeaturesSection() {
  return (
    <section id="features" className="relative">
      <div className="mx-auto max-w-[1400px] px-4 py-14 md:px-8 md:py-20">
        <header className="max-w-2xl">
          <div className="text-[11px] uppercase tracking-[0.2em] text-brand">
            What we do
          </div>
          <h2 className="mt-1 text-2xl font-semibold md:text-3xl">
            Social crypto trading, all on one screen
          </h2>
          <p className="mt-2 text-sm text-fg-muted md:text-base">
            Bupcore isn't another terminal. It lets you follow the setups top
            analysts publish, ask Foxy AI about anything you don't
            understand, and — when you're ready — copy-trade them with a
            single click.
          </p>
        </header>

        <div className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon="📡"
            title="Live trader signals"
            body="See entry, stop, and TP levels from the most-followed analysts the instant they publish. Updates stream over WebSocket — no refresh, no delay."
          />
          <FeatureCard
            icon="🧠"
            title="Foxy AI risk verdict"
            body="Every setup ships with an AI-written risk note: entry-stop sanity, R/R, breakeven-stop detection, news alignment. Plain language, not another indicator."
          />
          <FeatureCard
            icon="📊"
            title="Market dashboard"
            body="Fear & Greed, BTC dominance, funding rate, liquidations, open interest. CoinGlass + Binance aggregated in a single panel."
          />
          <FeatureCard
            icon="🤝"
            title="OKX copy trading"
            body="If your virtual team performs, plug in your OKX API (Read + Trade only — never Withdraw). Our worker places the same orders on your account."
          />
          <FeatureCard
            icon="💬"
            title="Community chat"
            body="Seven curated channels — general, setups, ideas, analysis, gem hunt, FX, indices. Firestore-backed, realtime."
          />
          <FeatureCard
            icon="⭐"
            title="Watchlist + archive"
            body="Every setup you clap or watchlist is auto-archived. Check performance later, learn what worked and what didn't."
          />
          <FeatureCard
            icon="🔔"
            title="Push + web alerts"
            body="The trader you follow opens a new setup — you get it on your phone and in your browser instantly."
          />
          <FeatureCard
            icon="📈"
            title="Trader profiles + PnL"
            body="180-day cumulative P&L curve, win rate, risk profile, trade history. Don't rely on marketing — see real performance."
          />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-bg-card p-5 transition hover:border-white/20">
      <div className="text-3xl">{icon}</div>
      <h3 className="mt-4 text-base font-semibold text-fg">{title}</h3>
      <p className="mt-2 flex-1 text-[13px] leading-relaxed text-fg-muted">
        {body}
      </p>
    </div>
  );
}
