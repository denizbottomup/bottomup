'use client';

import { useT } from '@/lib/i18n';
import { StoreBadges } from './store-badges';

// Tiers mirror the live App Store Connect "Plans" subscription group on
// app id 1661474993. USD figures track the in-app paywall: each paid
// tier shows the current price against a struck-through list price
// (~50% off), the same framing the app uses. `was` is the list price;
// `total` is the upfront amount billed for the period.
//   free     → $0 / forever  (5 Foxy/day, 20% setup visibility)
//   monthly  → $14.99 / month            (list $29.99,  −50%)
//   3 months → $42.99 total / $14.33 mo  (list $85.99,  −50%)  · Most popular
//   6 months → $74.99 total / $12.50 mo  (list $149.99, −50%)  · Best value
const PLAN_META = [
  {
    code: 'free',
    priceLabel: '$0',
    was: null as string | null,
    total: null as number | null,
    highlight: false,
    badge: null as 'popular' | 'best' | null,
  },
  {
    code: 'monthly',
    priceLabel: '$14.99',
    was: '$29.99',
    total: null as number | null,
    highlight: false,
    badge: null as 'popular' | 'best' | null,
  },
  {
    code: 'quarter',
    priceLabel: '$14.33',
    was: '$85.99',
    total: 42.99,
    highlight: true,
    badge: 'popular' as const,
  },
  {
    code: 'half',
    priceLabel: '$12.50',
    was: '$149.99',
    total: 74.99,
    highlight: false,
    badge: 'best' as const,
  },
];

export function PricingSection() {
  const { t } = useT();
  const plans = PLAN_META.map((m, i) => ({
    ...m,
    name: t.pr.plans[i]?.name ?? '',
    features: t.pr.plans[i]?.features ?? [],
  }));
  return (
    <section id="pricing" className="border-y border-border bg-bg-card/30">
      <div className="mx-auto max-w-[1400px] px-4 py-14 md:px-8 md:py-20">
        <header className="mx-auto max-w-2xl text-center">
          <div className="text-[11px] uppercase tracking-[0.2em] text-brand">
            {t.pr.label}
          </div>
          <h2 className="mt-1 text-4xl font-extrabold tracking-[-0.02em] md:text-6xl">
            {t.pr.headline_1}{' '}
            <span className="logo-gradient">{t.pr.headline_2}</span>
          </h2>
          <p className="mt-3 text-sm text-fg-muted">
            {t.pr.subtitle}
          </p>
        </header>

        <div className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => (
            <PlanCard
              key={p.code}
              plan={p}
              mostPopular={t.pr.most_popular}
              bestValue={t.pr.best_value ?? 'Best value'}
              billedMonthly={t.pr.billed_monthly}
              billedUpfront={t.pr.billed_upfront}
              freeLabel={t.pr.free_label}
            />
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <StoreBadges />
        </div>

        <p className="mt-6 text-center text-[11px] text-fg-dim">
          {t.pr.footer}
        </p>
      </div>
    </section>
  );
}

interface Plan {
  code: string;
  name: string;
  priceLabel: string;
  was: string | null;
  total: number | null;
  highlight: boolean;
  badge: 'popular' | 'best' | null;
  features: string[];
}

function PlanCard({
  plan,
  mostPopular,
  bestValue,
  billedMonthly,
  billedUpfront,
  freeLabel,
}: {
  plan: Plan;
  mostPopular: string;
  bestValue: string;
  billedMonthly: string;
  billedUpfront: string;
  freeLabel: string;
}) {
  const isFree = plan.priceLabel === '$0';
  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 transition ${
        plan.highlight
          ? 'border-brand/40 bg-brand/[0.06] shadow-2xl shadow-brand/10'
          : plan.badge === 'best'
            ? 'border-violet/40 bg-violet/[0.05]'
            : 'border-border bg-bg-card'
      }`}
    >
      {plan.badge === 'popular' ? (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
          {mostPopular}
        </div>
      ) : plan.badge === 'best' ? (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
          {bestValue}
        </div>
      ) : null}
      <div className="text-[11px] uppercase tracking-wider text-fg-muted">
        {plan.name}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-4xl font-semibold text-fg">{plan.priceLabel}</span>
        {isFree ? null : (
          <span className="text-sm text-fg-muted">/ mo</span>
        )}
        {plan.was ? (
          <span className="text-sm text-fg-dim line-through">{plan.was}</span>
        ) : null}
      </div>
      {isFree ? (
        <div className="mt-1 text-[11px] text-fg-dim">{freeLabel}</div>
      ) : plan.total != null ? (
        <div className="mt-1 text-[11px] text-fg-dim">
          {billedUpfront.replace('{total}', `$${plan.total}`)}
        </div>
      ) : (
        <div className="mt-1 text-[11px] text-fg-dim">{billedMonthly}</div>
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
    </div>
  );
}
