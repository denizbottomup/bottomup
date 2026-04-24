import Link from 'next/link';

export function FinalCta() {
  return (
    <section className="relative overflow-hidden border-t border-border">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/15 blur-[120px]" />
      </div>
      <div className="mx-auto max-w-[1100px] px-4 py-16 text-center md:px-8 md:py-24">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-3 py-1 text-xs text-brand">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
          10.000$ sanal kasa — üye olanlara anında
        </div>
        <h2 className="mt-5 text-3xl font-semibold leading-tight md:text-5xl">
          Bir sonraki kazanan setup'ı{' '}
          <span className="text-brand">kaçırma.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm text-fg-muted md:text-base">
          Türkiye'nin en iyi trader'ları şu an canlı yayında. Üye ol, takımını
          kur, kasada performansını gör. Hazır olduğunda OKX'e geç.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/signup" className="btn-primary px-6 py-3 text-base">
            Ücretsiz üye ol →
          </Link>
          <Link href="/signin" className="btn-ghost px-6 py-3 text-base">
            Giriş yap
          </Link>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-5 text-[11px] text-fg-dim">
          <span>✓ Kredi kartı istemez</span>
          <span>✓ 30 saniyede kayıt</span>
          <span>✓ İstediğin zaman sil</span>
        </div>
      </div>
    </section>
  );
}
