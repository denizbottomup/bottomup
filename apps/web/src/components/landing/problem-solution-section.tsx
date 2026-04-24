const ROWS: Array<{
  problem: { title: string; body: string };
  solution: { title: string; body: string };
}> = [
  {
    problem: {
      title: 'Blind-copying trap',
      body: 'Copy-trading platforms just mirror human errors and unverified black-box bots. Zero active risk mitigation.',
    },
    solution: {
      title: 'Foxy AI firewall',
      body: 'Every signal scored 0–100 across 225 data sources. Risky trades blocked before they reach your wallet.',
    },
  },
  {
    problem: {
      title: 'Scattered creator economy',
      body: 'Top traders and bot devs juggle Telegram, Discord, and multiple exchange accounts just to reach followers.',
    },
    solution: {
      title: 'One unified marketplace',
      body: 'Human traders, algo bots, and AI agents open shops. Users browse and subscribe in one app with Credits.',
    },
  },
  {
    problem: {
      title: 'Siloed markets',
      body: 'Retail is trapped between Crypto and TradFi — separate apps, separate accounts, no cross-asset view.',
    },
    solution: {
      title: 'Multi-asset, one terminal',
      body: 'Crypto live today. Stocks, Forex, and Commodities land Q1 2027 on the same marketplace rails.',
    },
  },
];

export function ProblemSolutionSection() {
  return (
    <section id="why" className="relative">
      <div className="mx-auto max-w-[1400px] px-4 py-14 md:px-8 md:py-20">
        <header className="mx-auto max-w-2xl text-center">
          <div className="mono-label">The thesis</div>
          <h2 className="mt-2 text-4xl font-extrabold tracking-[-0.02em] md:text-6xl">
            Retail trading is broken.{' '}
            <span className="logo-gradient">We rebuilt it.</span>
          </h2>
        </header>

        <div className="mt-12 overflow-hidden rounded-3xl border border-border bg-bg-card/50">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="border-b border-border bg-rose-500/[0.04] px-5 py-3 md:border-b-0 md:border-r">
              <div className="mono-label text-rose-300">The problem</div>
            </div>
            <div className="bg-brand/[0.06] px-5 py-3">
              <div className="mono-label">The fix</div>
            </div>
          </div>

          {ROWS.map((r, i) => (
            <div
              key={r.problem.title}
              className={`grid grid-cols-1 md:grid-cols-2 ${
                i > 0 ? 'border-t border-border' : ''
              }`}
            >
              <div className="flex gap-4 border-b border-border bg-rose-500/[0.02] p-5 md:border-b-0 md:border-r">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-lg text-rose-300">
                  ✕
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-fg md:text-lg">
                    {r.problem.title}
                  </h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">
                    {r.problem.body}
                  </p>
                </div>
              </div>
              <div className="flex gap-4 bg-brand/[0.03] p-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/15 text-lg text-brand ring-1 ring-brand/40">
                  →
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-fg md:text-lg">
                    {r.solution.title}
                  </h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">
                    {r.solution.body}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
