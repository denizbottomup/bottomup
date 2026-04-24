'use client';

import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <Link href="/app/settings" className="text-xs text-fg-muted hover:text-fg">
        ← Ayarlar
      </Link>
      <h1 className="mt-3 text-xl font-semibold text-fg">Gizlilik</h1>

      <section className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-sm leading-relaxed text-fg-muted">
        <p>
          Hesabını oluştururken verdiğin e-posta, isim ve telefon numarası
          yalnızca kimlik doğrulama, bildirim ve ödeme eşleştirmesi için
          kullanılır. Reklam amaçlı üçüncü taraflarla paylaşılmaz.
        </p>
        <p>
          Setup etkileşimlerin (alkış, watchlist, arşiv) trader istatistikleri
          ve sana özel öneriler için işlenir.
        </p>
        <p>
          Hesabını silersen profil bilgilerin 30 gün içinde silinir. Yasal
          saklama zorunluluğu olan kayıtlar (fatura, referans ödemesi) ilgili
          mevzuatta belirtilen süre kadar saklanır.
        </p>
        <p className="text-fg-dim">
          Tam metin için{' '}
          <a
            href="https://www.bottomup.app/privacy_policy"
            target="_blank"
            rel="noreferrer"
            className="text-brand hover:underline"
          >
            bottomup.app/privacy_policy
          </a>{' '}
          sayfasına bak.
        </p>
      </section>
    </div>
  );
}
