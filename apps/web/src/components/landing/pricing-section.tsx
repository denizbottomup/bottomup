import { storeUrls } from './store-links';

const PLANS = [
  {
    code: 'monthly',
    name: 'Aylık',
    price: 30,
    priceLabel: '$30',
    periodLabel: 'ay',
    total: null,
    save: null,
    features: [
      'Tüm trader setup\'larına erişim',
      'Foxy AI risk yorumu',
      'Canlı pazar pulsu (CoinGlass)',
      '7 kanallı sohbet',
      'Web push bildirim',
      '10.000$ sanal kasa',
    ],
    cta: 'Aylık al',
    highlight: false,
  },
  {
    code: 'quarter',
    name: '3 Aylık',
    price: 25,
    priceLabel: '$25',
    periodLabel: 'ay',
    total: 75,
    save: '%17 tasarruf',
    features: [
      'Aylık planın tüm özellikleri',
      'OKX kopya trade aktif',
      'Takım yönetimi',
      '3 aylık performans raporları',
      'Öncelikli destek',
    ],
    cta: '3 Aylık al',
    highlight: true,
  },
  {
    code: 'half',
    name: '6 Aylık',
    price: 22.5,
    priceLabel: '$22.50',
    periodLabel: 'ay',
    total: 135,
    save: '%25 tasarruf',
    features: [
      '3 aylık planın tüm özellikleri',
      'Özel strateji danışmanlığı',
      'Yeni özelliklere erken erişim',
      '6 ay boyunca fiyat garantisi',
      'Kurucu topluluğu rozeti',
    ],
    cta: '6 Aylık al',
    highlight: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="border-y border-border bg-bg-card/30">
      <div className="mx-auto max-w-[1400px] px-4 py-14 md:px-8 md:py-20">
        <header className="mx-auto max-w-2xl text-center">
          <div className="text-[11px] uppercase tracking-[0.2em] text-brand">
            Fiyatlandırma
          </div>
          <h2 className="mt-1 text-3xl font-semibold md:text-4xl">
            Bir setup, bir kopya trade — kendini amorti eder
          </h2>
          <p className="mt-3 text-sm text-fg-muted">
            App Store ve Google Play üzerinden satın alırsın. 10.000$ sanal
            kasa üyelikle birlikte gelir. İstediğin zaman mağaza üzerinden
            iptal edersin.
          </p>
        </header>

        <div className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-3">
          {PLANS.map((p) => (
            <PlanCard key={p.code} plan={p} />
          ))}
        </div>

        <p className="mt-8 text-center text-[11px] text-fg-dim">
          Tüm planlar USD olarak gösterilir. Kredi kartı veya App Store / Google
          Play üzerinden ödersin. İstediğin zaman iptal, sorun çıkarsa tam iade.
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
          En popüler
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
          Toplam ${plan.total}{' '}
          {plan.save ? (
            <span className="ml-1 rounded-md bg-emerald-400/10 px-1.5 py-0.5 text-emerald-300 ring-1 ring-emerald-400/30">
              {plan.save}
            </span>
          ) : null}
        </div>
      ) : (
        <div className="mt-1 text-[11px] text-fg-dim">Tek seferlik, yenilenir</div>
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

      <a
        href={storeUrls.ios}
        target="_blank"
        rel="noreferrer"
        className={`mt-6 inline-flex items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold transition ${
          plan.highlight
            ? 'bg-brand text-white hover:bg-brand-dark'
            : 'border border-border bg-bg-card text-fg hover:bg-bg-elev'
        }`}
      >
        {plan.cta}
      </a>
    </div>
  );
}
