'use client';

import Link from 'next/link';
import { useT } from '@/lib/i18n';

const PLAN_META = [
  {
    code: 'monthly',
    price: 30,
    priceLabel: '$30',
    total: null as number | null,
    highlight: false,
    saveKey: null as 'save_17' | 'save_25' | null,
  },
  {
    code: 'quarter',
    price: 25,
    priceLabel: '$25',
    total: 75,
    highlight: true,
    saveKey: 'save_17' as const,
  },
  {
    code: 'half',
    price: 22.5,
    priceLabel: '$22.50',
    total: 135,
    highlight: false,
    saveKey: 'save_25' as const,
  },
];

export function PricingSection() {
  const { t } = useT();
  const plans = PLAN_META.map((m, i) => ({
    ...m,
    name: t.pr.plans[i]?.name ?? '',
    cta: t.pr.plans[i]?.cta ?? '',
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

        <div className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-3">
          {plans.map((p) => (
            <PlanCard
              key={p.code}
              plan={p}
              mostPopular={t.pr.most_popular}
              billedMonthly={t.pr.billed_monthly}
              billedUpfront={t.pr.billed_upfront}
              saveLabel={
                p.saveKey === 'save_17'
                  ? t.pr.save_17
                  : p.saveKey === 'save_25'
                    ? t.pr.save_25
                    : null
              }
            />
          ))}
        </div>

        <p className="mt-8 text-center text-[11px] text-fg-dim">
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
  cta: string;
}

function PlanCard({
  plan,
  mostPopular,
  billedMonthly,
  billedUpfront,
  saveLabel,
}: {
  plan: Plan;
  mostPopular: string;
  billedMonthly: string;
  billedUpfront: string;
  saveLabel: string | null;
}) {
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
        <span className="text-sm text-fg-muted">/ mo</span>
      </div>
      {plan.total != null ? (
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
