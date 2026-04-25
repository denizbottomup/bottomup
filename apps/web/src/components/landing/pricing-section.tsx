'use client';

import { useT } from '@/lib/i18n';
import { StoreBadges } from './store-badges';

// Tiers mirror the live App Store Connect "Plans" subscription group on
// app id 1661474993. Free tier is the in-app free experience (limited
// Foxy AI quota + 20% trader-signal visibility); the rest are
// auto-renewing subscriptions in USD.
//   free          → $0 / forever  (5 Foxy/day, 20% setup visibility)
//   monthly       → $49.99 / month
//   3 months      → $129.99 total ($43.33 / month, ~13% off monthly)
//   6 months      → $239.99 total ($40.00 / month, ~20% off monthly)
const PLAN_META = [
  {
    code: 'free',
    price: 0,
    priceLabel: '$0',
    total: null as number | null,
    highlight: false,
    saveKey: null as 'save_13' | 'save_20' | null,
  },
  {
    code: 'monthly',
    price: 49.99,
    priceLabel: '$49.99',
    total: null as number | null,
    highlight: false,
    saveKey: null as 'save_13' | 'save_20' | null,
  },
  {
    code: 'quarter',
    price: 43.33,
    priceLabel: '$43.33',
    total: 129.99,
    highlight: true,
    saveKey: 'save_13' as const,
  },
  {
    code: 'half',
    price: 40,
    priceLabel: '$40',
    total: 239.99,
    highlight: false,
    saveKey: 'save_20' as const,
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
              billedMonthly={t.pr.billed_monthly}
              billedUpfront={t.pr.billed_upfront}
              freeLabel={t.pr.free_label}
              saveLabel={
                p.saveKey === 'save_13'
                  ? t.pr.save_13
                  : p.saveKey === 'save_20'
                    ? t.pr.save_20
                    : null
              }
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
  price: number;
  priceLabel: string;
  total: number | null;
  highlight: boolean;
  features: string[];
}

function PlanCard({
  plan,
  mostPopular,
  billedMonthly,
  billedUpfront,
  freeLabel,
  saveLabel,
}: {
  plan: Plan;
  mostPopular: string;
  billedMonthly: string;
  billedUpfront: string;
  freeLabel: string;
  saveLabel: string | null;
}) {
  const isFree = plan.price === 0;
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
          {mostPopular}
        </div>
      ) : null}
      <div className="text-[11px] uppercase tracking-wider text-fg-muted">
        {plan.name}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-4xl font-semibold text-fg">{plan.priceLabel}</span>
        {isFree ? null : (
          <span className="text-sm text-fg-muted">/ mo</span>
        )}
      </div>
      {isFree ? (
        <div className="mt-1 text-[11px] text-fg-dim">{freeLabel}</div>
      ) : plan.total != null ? (
        <div className="mt-1 text-[11px] text-fg-dim">
          {billedUpfront.replace('{total}', `$${plan.total}`)}{' '}
          {saveLabel ? (
            <span className="ml-1 rounded-md bg-emerald-400/10 px-1.5 py-0.5 text-emerald-300 ring-1 ring-emerald-400/30">
              {saveLabel}
            </span>
          ) : null}
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
