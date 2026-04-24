export function FoxyFirewallSection() {
  return (
    <section id="foxy" className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/[0.06] blur-[140px]" />
      </div>

      <div className="mx-auto max-w-[1400px] px-4 py-14 md:px-8 md:py-20">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1fr_560px] lg:gap-14">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
              Foxy AI · Risk Firewall
            </div>
            <h2 className="mt-4 text-3xl font-semibold leading-tight md:text-4xl lg:text-5xl">
              Every trade{' '}
              <span className="text-emerald-300">audited</span> before it
              reaches your wallet.
            </h2>
            <p className="mt-5 max-w-xl text-base text-fg-muted">
              Foxy is a proprietary AI trained on 225 data sources. When a
              trader, bot, or agent publishes a signal, Foxy scores it 0–100
              against technicals, fundamentals, news, order book depth, and
              the creator's own risk pattern. If the score is red, the trade
              is blocked — even if you're subscribed.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Pillar
                icon="🔍"
                title="Audit"
                body="Every incoming signal is intercepted and scored across 225 sources before execution."
              />
              <Pillar
                icon="🚫"
                title="Block"
                body="Trades that breach your risk envelope are stopped at the firewall — not after the loss."
              />
              <Pillar
                icon="⚙"
                title="Optimize"
                body="Entry/exit orders are tuned to reduce slippage and increase net P&L inside your wallet."
              />
              <Pillar
                icon="🧪"
                title="Simulate"
                body="Build a portfolio, simulate team performance at live prices before committing real capital."
              />
            </div>
          </div>

          <FoxyDiagram />
        </div>
      </div>
    </section>
  );
}

function Pillar({
  icon,
  title,
  body,
}: {
  icon: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-card p-4">
      <div className="text-xl">{icon}</div>
      <div className="mt-2 text-sm font-semibold text-fg">{title}</div>
      <div className="mt-1 text-[12px] leading-relaxed text-fg-muted">
        {body}
      </div>
    </div>
  );
}

function FoxyDiagram() {
  return (
    <div className="relative rounded-2xl border border-border bg-bg-card/80 p-5 shadow-2xl">
      <div className="text-[10px] uppercase tracking-wider text-fg-dim">
        Signal flow
      </div>
      <div className="mt-4 space-y-3">
        <Node
          icon="👤"
          label="Trader / Bot / AI agent"
          sub="publishes a signal"
          tone="neutral"
        />
        <Arrow />
        <Node
          icon="🛡"
          label="Foxy AI firewall"
          sub="scores risk 0–100 · 225 data sources"
          tone="shield"
        />
        <div className="grid grid-cols-2 gap-3">
          <DecisionCard
            label="Risk > threshold"
            body="Blocked ✕"
            tone="danger"
          />
          <DecisionCard
            label="Risk OK"
            body="Optimized ✓"
            tone="success"
          />
        </div>
        <Arrow />
        <Node
          icon="💼"
          label="Your wallet"
          sub="execution, only if Foxy approves"
          tone="success"
        />
      </div>

      <div className="mt-5 rounded-xl border border-emerald-400/30 bg-emerald-400/[0.08] p-3 text-[11px] text-emerald-200">
        ✓ Foxy blocked 1,247 risky signals in the last 30 days across the
        marketplace.
      </div>
    </div>
  );
}

function Node({
  icon,
  label,
  sub,
  tone,
}: {
  icon: string;
  label: string;
  sub: string;
  tone: 'neutral' | 'shield' | 'success';
}) {
  const border =
    tone === 'shield'
      ? 'border-emerald-400/40 bg-emerald-400/[0.06]'
      : tone === 'success'
        ? 'border-brand/40 bg-brand/[0.06]'
        : 'border-border bg-bg';
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${border}`}>
      <span className="text-lg">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-fg">{label}</div>
        <div className="text-[11px] text-fg-muted">{sub}</div>
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex justify-center">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-fg-dim">
        <polyline points="7 10 12 15 17 10" />
      </svg>
    </div>
  );
}

function DecisionCard({
  label,
  body,
  tone,
}: {
  label: string;
  body: string;
  tone: 'danger' | 'success';
}) {
  const cls =
    tone === 'danger'
      ? 'border-rose-400/30 bg-rose-400/[0.06] text-rose-300'
      : 'border-emerald-400/30 bg-emerald-400/[0.06] text-emerald-300';
  return (
    <div className={`rounded-xl border p-3 text-center ${cls}`}>
      <div className="text-[10px] uppercase tracking-wider opacity-80">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold">{body}</div>
    </div>
  );
}
