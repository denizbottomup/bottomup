import Link from 'next/link';

const PLANS = [
  {
    code: 'monthly',
    name: 'Monthly',
    price: 30,
    priceLabel: '$30',
    periodLabel: 'mo',
    total: null,
    save: null,
    features: [
      'Full marketplace access — traders, bots, AI agents',
      'Foxy AI firewall on every signal',
      'Live market dashboard (CoinGlass + Binance)',
      'Portfolio simulation against live prices',
      'Community chat · 7 channels',
      'Web + push notifications',
    ],
    cta: 'Start monthly',
    highlight: false,
  },
  {
    code: 'quarter',
    name: '3 Months',
    price: 25,
    priceLabel: '$25',
    periodLabel: 'mo',
    total: 75,
    save: 'Save 17%',
    features: [
      'Everything in Monthly',
      'OKX copy trading — one-click execution',
      'MCP Suite — all 9 AI agents',
      'Quarterly performance report',
      'Priority support',
    ],
    cta: 'Start quarterly',
    highlight: true,
  },
  {
    code: 'half',
    name: '6 Months',
    price: 22.5,
    priceLabel: '$22.50',
    periodLabel: 'mo',
    total: 135,
    save: 'Save 25%',
    features: [
      'Everything in Quarterly',
      '$BUP token rewards on trade volume',
      'Early access to TradFi markets (Q1 2027)',
      '1:1 strategy consult',
      'Founders community badge',
    ],
    cta: 'Start 6 months',
    highlight: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="border-y border-border bg-bg-card/30">
      <div className="mx-auto max-w-[1400px] px-4 py-14 md:px-8 md:py-20">
        <header className="mx-auto max-w-2xl text-center">
          <div className="text-[11px] uppercase tracking-[0.2em] text-brand">
            Pricing
          </div>
          <h2 className="mt-1 text-4xl font-extrabold tracking-[-0.02em] md:text-6xl">
            One blocked bad trade{' '}
            <span className="logo-gradient">covers the year.</span>
          </h2>
          <p className="mt-3 text-sm text-fg-muted">
            Subscriptions unlock the marketplace, Foxy firewall, and the full
            MCP Suite. Individual shops subscribe via BottomUP Credits —
            creators earn 25% of revenue they generate.
          </p>
        </header>

        <div className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-3">
          {PLANS.map((p) => (
            <PlanCard key={p.code} plan={p} />
          ))}
        </div>

        <p className="mt-8 text-center text-[11px] text-fg-dim">
          All plans billed in USD. Pay via credit card or App Store / Google
          Play. Cancel anytime — full refund if anything goes wrong.
        </p>
      </div>
    </section>
  );
}

function PlanCard({ plan }: { plan: (typeof PLANS)[number] }) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 transition ${
        plan.highlight
          ? 'border-brand/40 bg-brand/[0.06] shadow-2xl shadow-brand/10'
          : 'border-border bg-bg-card'
      }`}
    >
      {plan.highlight ? (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
          Most popular
        </div>
      ) : null}
      <div className="text-[11px] uppercase tracking-wider text-fg-muted">
        {plan.name}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-4xl font-semibold text-fg">{plan.priceLabel}</span>
        <span className="text-sm text-fg-muted">/ {plan.periodLabel}</span>
      </div>
      {plan.total != null ? (
        <div className="mt-1 text-[11px] text-fg-dim">
          ${plan.total} billed upfront{' '}
          {plan.save ? (
            <span className="ml-1 rounded-md bg-emerald-400/10 px-1.5 py-0.5 text-emerald-300 ring-1 ring-emerald-400/30">
              {plan.save}
            </span>
          ) : null}
        </div>
      ) : (
        <div className="mt-1 text-[11px] text-fg-dim">Billed monthly, renews</div>
      )}

      <ul className="mt-6 flex flex-1 flex-col gap-2 text-sm text-fg">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
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
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <Link
        href={`/signup?plan=${plan.code}`}
        className={`mt-6 inline-flex items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold transition ${
          plan.highlight
            ? 'bg-brand text-white hover:bg-brand-dark'
            : 'border border-border bg-bg-card text-fg hover:bg-bg-elev'
        }`}
      >
        {plan.cta}
      </Link>
    </div>
  );
}
