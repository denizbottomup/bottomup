const ITEMS: Array<{
  when: string;
  title: string;
  body: string;
  status: 'live' | 'next' | 'later';
}> = [
  {
    when: 'Feb 2026',
    title: 'Foxy AI Core',
    body: 'Full crypto market analysis with 0–100 technical & fundamental scoring. Portfolio simulation against live prices.',
    status: 'live',
  },
  {
    when: 'April 2026',
    title: 'Web launch',
    body: 'Cross-platform financial terminal — the full product lands in the browser alongside iOS and Android.',
    status: 'next',
  },
  {
    when: 'April 2026',
    title: 'Foxy Firewall v0',
    body: 'Trade Guard model: active risk engine scoring every signal across 225 data sources, blocking risky trades before wallet execution.',
    status: 'next',
  },
  {
    when: 'May 2026',
    title: 'Marketplace go-live',
    body: 'Strategy marketplace launches. BottomUP Credits via credit card or crypto — subscribe to human traders, AI agents, and algo bots.',
    status: 'next',
  },
  {
    when: 'June 2026',
    title: 'Social Finance 2.0',
    body: 'Chat rooms, short-form video insights, live-streamed trade sessions. AI-driven simultaneous translation — communicate in any language.',
    status: 'later',
  },
  {
    when: 'June 2026',
    title: 'Foxy Profit Engine',
    body: 'Order optimization module. Foxy auto-tunes entry and exit to reduce slippage and lift net P&L.',
    status: 'later',
  },
  {
    when: 'Aug 2026',
    title: 'Alpha Scan Bot',
    body: 'Autonomous high-frequency scanner surfacing the most promising projects, airdrops, and early-stage opportunities.',
    status: 'later',
  },
  {
    when: 'Q4 2026',
    title: 'Foxy AI v1.0',
    body: 'Full AI risk firewall shipped: every marketplace signal audited end-to-end.',
    status: 'later',
  },
  {
    when: 'Q1 2027',
    title: 'TradFi launch',
    body: 'Stocks, forex, and commodities on the marketplace — multi-asset smart money in one app.',
    status: 'later',
  },
];

export function RoadmapSection() {
  return (
    <section id="roadmap" className="relative">
      <div className="mx-auto max-w-[1400px] px-4 py-14 md:px-8 md:py-20">
        <header className="max-w-2xl">
          <div className="text-[11px] uppercase tracking-[0.2em] text-brand">
            Roadmap
          </div>
          <h2 className="mt-1 text-2xl font-semibold md:text-3xl">
            From marketplace to multi-asset, in public.
          </h2>
          <p className="mt-3 text-sm text-fg-muted md:text-base">
            A concrete product timeline through Q1 2027. Foxy ships in
            layers, the marketplace opens in May, and TradFi follows crypto
            once regulatory clearance lands.
          </p>
        </header>

        <ol className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((it) => (
            <li
              key={`${it.when}-${it.title}`}
              className="rounded-2xl border border-border bg-bg-card p-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-fg-dim">
                  {it.when}
                </span>
                <StatusPill status={it.status} />
              </div>
              <h3 className="mt-2 text-base font-semibold text-fg">{it.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">
                {it.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function StatusPill({ status }: { status: 'live' | 'next' | 'later' }) {
  const styles =
    status === 'live'
      ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/30'
      : status === 'next'
        ? 'bg-brand/15 text-brand ring-brand/30'
        : 'bg-white/5 text-fg-dim ring-white/10';
  const label =
    status === 'live' ? 'Live' : status === 'next' ? 'Next' : 'Planned';
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${styles}`}
    >
      {label}
    </span>
  );
}
