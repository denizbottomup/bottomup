const MCPS = [
  {
    icon: '🛡',
    title: 'Risk mitigation',
    body: "Flags revenge trading, excessive leverage, and unsafe allocation sizes on every trader you follow — in real time.",
  },
  {
    icon: '⏱',
    title: 'Trade timing',
    body: 'Watches order-book depth, macro events (FOMC, CPI, ETF news), and historical slippage to recommend the best entry and exit window.',
  },
  {
    icon: '🧩',
    title: 'Matchmaking',
    body: 'Profiles your risk appetite and pairs you with compatible trader styles — scalper, momentum, or long-term swing.',
  },
  {
    icon: '🔬',
    title: 'Token research',
    body: 'Examines contract health, developer activity, whale wallet behavior, and social surges. Generates investment hypotheses, not raw noise.',
  },
  {
    icon: '💎',
    title: 'Launch & airdrop scout',
    body: 'Monitors new deployments, testnet activity, and Telegram buzz. Alerts you to alpha early and identifies wallets eligible for airdrops.',
  },
  {
    icon: '⚖',
    title: 'Portfolio rebalancing',
    body: 'Detects over-exposure and sector correlation risk as markets move. Suggests hedges or rotation before drawdown hits.',
  },
  {
    icon: '⚠',
    title: 'Regulatory scanning',
    body: 'Pulls news feeds, exchange policy updates, and regional legal signals. Warns you about compliance risk — delistings, sanctions — before it hurts.',
  },
  {
    icon: '🎯',
    title: 'Sentiment divergence',
    body: "Catches hidden alpha when on-chain is bullish but Twitter/Reddit is bearish. Perfect for early positioning before the crowd wakes up.",
  },
  {
    icon: '🕵',
    title: 'Manipulation watchdog',
    body: 'Tracks influencer wallet activity, promotion timing, and amplification patterns. Flags coordinated pumps and paid viral hype.',
  },
];

export function McpSuiteSection() {
  return (
    <section id="mcp" className="relative">
      <div className="mx-auto max-w-[1400px] px-4 py-14 md:px-8 md:py-20">
        <header className="max-w-2xl">
          <div className="text-[11px] uppercase tracking-[0.2em] text-brand">
            MCP Suite
          </div>
          <h2 className="mt-1 text-2xl font-semibold md:text-3xl">
            Nine Modular Crypto Processors, working together.
          </h2>
          <p className="mt-3 text-sm text-fg-muted md:text-base">
            Each MCP is a specialized AI agent that turns information chaos
            into actionable insight. They run continuously alongside Foxy —
            so your trades arrive pre-audited, pre-timed, and pre-matched to
            your strategy.
          </p>
        </header>

        <div className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {MCPS.map((m) => (
            <div
              key={m.title}
              className="flex flex-col rounded-2xl border border-border bg-bg-card p-5 transition hover:border-brand/30"
            >
              <div className="text-2xl">{m.icon}</div>
              <h3 className="mt-4 text-base font-semibold text-fg">{m.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">
                {m.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
