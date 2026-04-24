'use client';

import Link from 'next/link';

const TIERS = [
  {
    code: 'trial',
    name: 'Deneme',
    price: 'Ücretsiz',
    desc: 'İlk 7 gün tüm premium özellikler açık.',
    bullets: ['Tüm traderları takip et', 'Foxy AI yorumları', 'Canlı fiyat akışı'],
  },
  {
    code: 'monthly',
    name: 'Aylık',
    price: '$29 / ay',
    desc: 'Kısa vadeli kullanım için.',
    bullets: [
      'Sınırsız setup takibi',
      'Foxy AI risk analizi',
      'Anlık bildirimler',
      'Watchlist + geçmiş erişimi',
    ],
  },
  {
    code: 'yearly',
    name: 'Yıllık',
    price: '$249 / yıl',
    highlight: true,
    desc: "Aylık'a göre %28 tasarruf.",
    bullets: [
      'Aylık planın tüm özellikleri',
      'Kopya trade (OKX entegrasyonu ile)',
      'Yıllık özel raporlar',
      'Öncelikli destek',
    ],
  },
];

export default function PlansPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-6">
      <Link href="/app/settings" className="text-xs text-fg-muted hover:text-fg">
        ← Ayarlar
      </Link>
      <h1 className="mt-3 text-2xl font-semibold text-fg">Planları incele</h1>
      <p className="mt-1 text-sm text-fg-muted">
        Aboneliğini mobilde App Store veya Google Play üzerinden yönetebilirsin.
        Web tarafında yakında Stripe ile satın alma devreye girecek.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        {TIERS.map((t) => (
          <div
            key={t.code}
            className={`rounded-2xl border p-5 ${
              t.highlight
                ? 'border-brand/40 bg-brand/[0.06] shadow-lg shadow-brand/10'
                : 'border-white/10 bg-white/[0.02]'
            }`}
          >
            <div className="text-[11px] uppercase tracking-wider text-fg-muted">
              {t.name}
            </div>
            <div className="mt-1 text-2xl font-semibold text-fg">{t.price}</div>
            <p className="mt-1 text-xs text-fg-muted">{t.desc}</p>
            <ul className="mt-4 flex flex-col gap-1.5 text-sm text-fg">
              {t.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            {t.highlight ? (
              <div className="mt-4 rounded-md bg-brand/15 px-3 py-2 text-center text-[11px] text-brand ring-1 ring-brand/30">
                En çok tercih edilen
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="text-sm font-semibold text-fg">Mevcut aboneliğin</h2>
        <p className="mt-1 text-xs text-fg-muted">
          Aktif + geçmiş aboneliklerini görmek için aşağıdaki linke tıkla.
        </p>
        <Link
          href="/app/profile/subscription"
          className="mt-3 inline-flex items-center gap-1 rounded-md bg-white/5 px-3 py-1.5 text-xs text-fg-muted ring-1 ring-white/10 hover:text-fg"
        >
          Aboneliklerim →
        </Link>
      </div>
    </div>
  );
}
