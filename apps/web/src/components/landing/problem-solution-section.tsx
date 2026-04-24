const ROWS: Array<{
  problem: { title: string; body: string };
  solution: { title: string; body: string };
}> = [
  {
    problem: {
      title: 'You copy bad trades',
      body: 'Your trader revenge-trades with 50x leverage — and so do you. No filter, no second opinion, no stop.',
    },
    solution: {
      title: 'An AI chief of risk',
      body: 'Foxy AI audits every signal across 225 data sources and blocks trades that don\'t pass — even if your trader sent them.',
    },
  },
  {
    problem: {
      title: 'Your alpha is scattered',
      body: 'Top traders live on Telegram. Bot devs on Discord. Signals on three exchanges. You spend more time switching tabs than executing.',
    },
    solution: {
      title: 'One app, every strategy',
      body: 'Human traders, algo bots, and AI agents all sell in one marketplace. Subscribe with Credits, orders run 24/7 in your wallet.',
    },
  },
  {
    problem: {
      title: 'Siloed markets, siloed you',
      body: 'Crypto on one app, stocks on another, forex somewhere else. You can\'t run a cross-asset thesis without five logins.',
    },
    solution: {
      title: 'Multi-asset from one terminal',
      body: 'Crypto live today. Stocks, forex, and commodities arrive Q1 2027 on the same rails — one account, one portfolio view.',
    },
  },
];

export function ProblemSolutionSection() {
  return (
    <section id="why" className="relative">
      <div className="mx-auto max-w-[1400px] px-4 py-14 md:px-8 md:py-20">
        <header className="mx-auto max-w-3xl text-center">
          <div className="mono-label">The thesis</div>
          <h2 className="mt-2 text-4xl font-extrabold tracking-[-0.02em] md:text-6xl">
            Retail trading is broken.{' '}
            <span className="logo-gradient">We rebuilt it.</span>
          </h2>
          <p className="mt-4 text-base text-fg-muted md:text-lg">
            Automated portfolio management that lets anyone mirror elite
            traders and AI agents via a decentralized marketplace — audited
            end-to-end by our proprietary risk firewall.
          </p>
        </header>

        <div className="mt-12 overflow-hidden rounded-3xl border border-border bg-bg-card/50">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="border-b border-border bg-rose-500/[0.06] px-5 py-3 md:border-b-0 md:border-r">
              <div className="mono-label !text-rose-300">Before BottomUP</div>
            </div>
            <div className="bg-mint/[0.08] px-5 py-3">
              <div className="mono-label !text-mint">With BottomUP</div>
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
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-lg text-rose-300 ring-1 ring-rose-500/30">
                  ✕
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-fg md:text-lg">
                    {r.problem.title}
                  </h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">
                    {r.problem.body}
                  </p>
                </div>
              </div>
              <div className="flex gap-4 bg-mint/[0.04] p-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mint/15 text-lg text-mint ring-1 ring-mint/40">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-fg md:text-lg">
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
