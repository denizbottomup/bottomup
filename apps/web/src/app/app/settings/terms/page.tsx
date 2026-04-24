'use client';

import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <Link href="/app/settings" className="text-xs text-fg-muted hover:text-fg">
        ← Ayarlar
      </Link>
      <h1 className="mt-3 text-xl font-semibold text-fg">Kullanım şartları</h1>

      <section className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-sm leading-relaxed text-fg-muted">
        <p>
          Bottomup; finansal tavsiye değildir. Platformdaki analiz, setup ve
          yorumlar yalnızca bilgilendirme amaçlıdır. Alım-satım kararları
          tamamen kullanıcıya aittir.
        </p>
        <p>
          Kopya trade kullanımı için bağladığın borsa API anahtarlarının
          sorumluluğu sana aittir. Bottomup bu anahtarları yalnızca emir
          ileten ve okuyan işlemler için kullanır; çekim yetkisi talep etmez.
        </p>
        <p>
          Trader hesapları kendi analizlerini paylaşır; bu analizlerin sonucu
          Bottomup'ın sorumluluğunda değildir. Trader olmayan kullanıcılar
          setup paylaşamaz.
        </p>
        <p>
          Platformu kötüye kullanan (yanıltıcı sinyal, spam, taciz) hesapların
          erişimi uyarısız kapatılabilir.
        </p>
        <p className="text-fg-dim">
          Tam metin için{' '}
          <a
            href="https://www.bottomup.app/term_of_services"
            target="_blank"
            rel="noreferrer"
            className="text-brand hover:underline"
          >
            bottomup.app/term_of_services
          </a>{' '}
          sayfasına bak.
        </p>
      </section>
    </div>
  );
}
