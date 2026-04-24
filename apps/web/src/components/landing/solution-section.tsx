export function SolutionSection() {
  return (
    <section id="solution" className="border-y border-border bg-bg-card/30">
      <div className="mx-auto max-w-[1400px] px-4 py-14 md:px-8 md:py-20">
        <header className="mx-auto max-w-2xl text-center">
          <div className="text-[11px] uppercase tracking-[0.2em] text-brand">
            The solution
          </div>
          <h2 className="mt-1 text-3xl font-semibold md:text-4xl">
            A marketplace secured by{' '}
            <span className="text-brand">proprietary AI.</span>
          </h2>
          <p className="mt-3 text-sm text-fg-muted md:text-base">
            Infrastructure for human traders, algorithmic bots, and autonomous
            AI agents — with an intelligent firewall protecting every single
            execution.
          </p>
        </header>

        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          <SolutionCard
            icon="🏪"
            title="The marketplace"
            body="Human traders, algo-bots, and AI agents open 'shops'. You browse, interact, and subscribe to diverse trading products in one unified app — like the App Store, for smart money."
          />
          <SolutionCard
            icon="🛡"
            title="Foxy AI firewall"
            body="We don't just mirror strategies — we audit them. Foxy intercepts every signal across 225 data sources, calculates risk 0–100, and blocks dangerous trades before execution."
          />
          <SolutionCard
            icon="⚡"
            title="Micro-economy"
            body="Powered by BottomUP Credits. Instant purchase, 24/7 automated execution directly in your connected wallet — generating continuous volume and creator earnings."
          />
        </div>
      </div>
    </section>
  );
}

function SolutionCard({
  icon,
  title,
  body,
}: {
  icon: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-brand/30 bg-brand/[0.04] p-5">
      <div className="text-2xl">{icon}</div>
      <h3 className="mt-4 text-base font-semibold text-fg">{title}</h3>
      <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">{body}</p>
    </div>
  );
}
