import Link from 'next/link';
import { Logo } from '@/components/logo';

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Logo variant="lockup" size="md" />
          <nav className="flex items-center gap-2">
            <Link href="/signin" className="btn-ghost">
              Giriş yap
            </Link>
            <Link href="/signup" className="btn-primary">
              Kayıt ol
            </Link>
          </nav>
        </div>
      </header>

      <section className="flex-1">
        <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
          <h1 className="text-5xl md:text-6xl font-semibold tracking-tight">
            Kriptoyu okuyan <span className="text-brand">tilki</span> cebinde.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-fg-muted">
            Setup'lar, trader'lar, canlı fiyat akışı ve Foxy AI — hepsi bir arada.
            Mobil'de olan her şey artık tarayıcıda da.
          </p>
          <div className="mt-10 flex gap-3">
            <Link href="/signup" className="btn-primary px-6 py-3 text-base">
              Ücretsiz başla
            </Link>
            <Link href="/signin" className="btn-ghost px-6 py-3 text-base">
              Hesabım var
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-6 text-sm text-fg-muted flex items-center justify-between">
          <div>© {new Date().getFullYear()} bottomUP</div>
          <div className="flex gap-4">
            <a href="https://www.bottomup.app/term_of_services" target="_blank" rel="noreferrer" className="hover:text-fg">
              Kullanım şartları
            </a>
            <a href="https://www.bottomup.app/privacy_policy" target="_blank" rel="noreferrer" className="hover:text-fg">
              Gizlilik
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
