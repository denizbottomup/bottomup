'use client';

import { useState } from 'react';

const QA: Array<{ q: string; a: string }> = [
  {
    q: 'Hesap açmadan deneyebilir miyim?',
    a: 'Hesap açmak gerekli ama ücretsiz. Üye olduğun anda 10.000$ sanal kasa yüklenir ve hiçbir ödeme bilgisi istenmez. İstediğin zaman silebilirsin.',
  },
  {
    q: '10.000$ sanal kasa nasıl çalışıyor?',
    a: 'Takımına kadar 6 trader seçiyorsun. Bu trader\'ların yayınladığı her setup senin kasanda gerçek fiyatlarla açılıyor. 30 gün sonunda kasanın kaç paraya geldiğini, hangi trader\'ın nasıl performans gösterdiğini görüyorsun.',
  },
  {
    q: 'OKX kopya trade güvenli mi?',
    a: 'API anahtarlarını sunucuda şifreli tutuyoruz, tarayıcına asla geri dönmez. Sadece Read + Trade izni yeterli; çekim (Withdraw) izni istemiyoruz. İstersen IP kısıtlaması da ekleyebilirsin. Anahtarı istediğin zaman OKX\'ten iptal edebilir, bizden de silebilirsin.',
  },
  {
    q: 'Trader\'lar nasıl seçiliyor?',
    a: 'Tüm trader\'lar Bottomup ekibi tarafından onaylanır. Her trader\'ın 180 günlük kümülatif kârı, win rate\'i ve risk profili açık — kimi takip edeceğine datayla karar verirsin.',
  },
  {
    q: 'Foxy AI ne işe yarıyor?',
    a: 'Her setup\'a özel risk skoru (0-100) ve Türkçe kısa yorum veriyor: entry-stop mantıklı mı, R/R uygun mu, haberlerle uyumlu mu, breakeven stop var mı? Anthropic Claude Haiku modeliyle çalışıyor.',
  },
  {
    q: 'Aboneliği istediğim zaman iptal edebilir miyim?',
    a: 'Evet. 3 aylık veya 6 aylık plandaysan da istediğin zaman yenilemeyi iptal edebilirsin, kalan süre boyunca erişim devam eder.',
  },
  {
    q: 'Hangi borsalar destekleniyor?',
    a: 'Şu an OKX destekleniyor. 2026 içinde Binance ve Bybit geliyor. Setup\'ları borsadan bağımsız olarak her yerde görebilirsin; sadece kopya trade OKX üzerinden.',
  },
  {
    q: 'Mobil uygulamada var mı?',
    a: 'Evet. iOS ve Android için Bottomup uygulaması App Store ve Google Play\'de mevcut. Tüm hesap bilgilerin web ve mobil arasında senkron.',
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="relative">
      <div className="mx-auto max-w-[900px] px-4 py-14 md:px-8 md:py-20">
        <header className="text-center">
          <div className="text-[11px] uppercase tracking-[0.2em] text-brand">
            Sık sorulanlar
          </div>
          <h2 className="mt-1 text-3xl font-semibold md:text-4xl">
            Merak ettiklerin
          </h2>
        </header>

        <div className="mt-10 space-y-2">
          {QA.map((item, i) => (
            <FaqItem key={i} q={item.q} a={item.a} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-bg-card transition hover:border-white/20">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-sm font-medium text-fg md:text-base">{q}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-fg-muted transition ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open ? (
        <div className="px-5 pb-5 text-sm leading-relaxed text-fg-muted">
          {a}
        </div>
      ) : null}
    </div>
  );
}
