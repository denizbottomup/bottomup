export function MarketplaceSection() {
  return (
    <section id="marketplace" className="border-y border-border bg-bg-card/30">
      <div className="mx-auto max-w-[1400px] px-4 py-14 md:px-8 md:py-20">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-brand">
              The marketplace
            </div>
            <h2 className="mt-1 text-2xl font-semibold md:text-3xl">
              Three kinds of strategy. One subscription model.
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-fg-muted">
              Creators open shops. Users subscribe with BottomUP Credits.
              Strategies execute 24/7 directly in your connected wallet —
              every order first audited by Foxy.
            </p>
          </div>
          <span className="rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-[11px] text-brand">
            Marketplace go-live · May 2026
          </span>
        </header>

        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          <ShopCard
            emoji="👤"
            kind="Human traders"
            tagline="Follow the analysts who put their names on every call."
            bullets={[
              'Verified P&L curve, win rate, and risk profile',
              'Live published setups with entry / stop / TP',
              'Creator earns 25% of subscription + volume',
            ]}
          />
          <ShopCard
            emoji="🤖"
            kind="Algorithmic bots"
            tagline="Vetted, back-tested strategies running 24/7."
            bullets={[
              'Strategy source transparent, not a black box',
              'Subscribe once, executes while you sleep',
              'Foxy kills misbehaving bots the moment they drift',
            ]}
            highlight
          />
          <ShopCard
            emoji="🧠"
            kind="AI agents"
            tagline="Autonomous agents with specialized mandates."
            bullets={[
              'Alpha scout, rebalancer, hedger, airdrop hunter',
              'New agent types every 2 months',
              'Backed by the MCP Suite for context',
            ]}
          />
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-bg-card p-5">
          <div className="text-[11px] uppercase tracking-wider text-fg-dim">
            BottomUP Credits · how the micro-economy works
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
            <FlowStep
              n="1"
              title="Buy Credits"
              body="Credit card or crypto. Credits are the universal currency across every shop."
            />
            <FlowStep
              n="2"
              title="Subscribe to shops"
              body="Pick the traders, bots, or agents you trust. Cancel any time."
            />
            <FlowStep
              n="3"
              title="Foxy audits signals"
              body="Every order is scored 0–100 before it leaves the firewall."
            />
            <FlowStep
              n="4"
              title="Wallet executes"
              body="Approved orders route straight to your connected wallet, 24/7."
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function ShopCard({
  emoji,
  kind,
  tagline,
  bullets,
  highlight,
}: {
  emoji: string;
  kind: string;
  tagline: string;
  bullets: string[];
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col rounded-2xl border p-5 transition ${
        highlight
          ? 'border-brand/40 bg-brand/[0.06] shadow-xl shadow-brand/10'
          : 'border-border bg-bg-card'
      }`}
    >
      <div className="text-3xl">{emoji}</div>
      <h3 className="mt-3 text-base font-semibold text-fg">{kind}</h3>
      <p className="mt-1 text-[13px] text-fg-muted">{tagline}</p>
      <ul className="mt-4 flex flex-col gap-1.5 text-[13px] text-fg">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2">
            <svg
              className="mt-0.5 h-4 w-4 shrink-0 text-brand"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FlowStep({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/15 font-mono text-xs font-semibold text-brand ring-1 ring-brand/30">
        {n}
      </span>
      <div>
        <div className="text-sm font-semibold text-fg">{title}</div>
        <div className="mt-0.5 text-[12px] text-fg-muted">{body}</div>
      </div>
    </div>
  );
}
