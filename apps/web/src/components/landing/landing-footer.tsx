import Link from 'next/link';
import { Logo } from '@/components/logo';

const TRADE = process.env.NEXT_PUBLIC_TRADE_URL ?? '';

export function LandingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-bg-card/40">
      <div className="mx-auto max-w-[1400px] px-4 py-10 md:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2 md:col-span-2">
            <Logo variant="lockup" size="sm" />
            <p className="mt-3 max-w-sm text-[13px] text-fg-muted">
              Kripto'da sosyal trading, Türkiye'nin en çok takip edilen
              analistlerinden canlı sinyaller, AI risk yorumu ve OKX ile kopya
              trade.
            </p>
            <div className="mt-4 flex items-center gap-3 text-fg-muted">
              <a
                href="https://twitter.com/bottomaborsar"
                target="_blank"
                rel="noreferrer"
                aria-label="Twitter"
                className="hover:text-fg"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.46 6c-.77.35-1.6.58-2.46.69.89-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 01-1.93.07 4.28 4.28 0 004 2.98 8.521 8.521 0 01-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z" />
                </svg>
              </a>
              <a
                href="https://t.me/bottomupdestek"
                target="_blank"
                rel="noreferrer"
                aria-label="Telegram"
                className="hover:text-fg"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.053 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z" />
                </svg>
              </a>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-fg">
              Ürün
            </div>
            <ul className="mt-3 space-y-2 text-sm text-fg-muted">
              <li>
                <a href="#features" className="hover:text-fg">
                  Özellikler
                </a>
              </li>
              <li>
                <a href="#pulse" className="hover:text-fg">
                  Pazar pulsu
                </a>
              </li>
              <li>
                <a href="#leaderboard" className="hover:text-fg">
                  Liderler
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-fg">
                  Fiyat
                </a>
              </li>
            </ul>
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-fg">
              Hesap
            </div>
            <ul className="mt-3 space-y-2 text-sm text-fg-muted">
              <li>
                <Link href={`${TRADE}/signup`} className="hover:text-fg">
                  Kayıt ol
                </Link>
              </li>
              <li>
                <Link href={`${TRADE}/signin`} className="hover:text-fg">
                  Giriş
                </Link>
              </li>
              <li>
                <a href="#faq" className="hover:text-fg">
                  SSS
                </a>
              </li>
            </ul>
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-fg">
              Yasal
            </div>
            <ul className="mt-3 space-y-2 text-sm text-fg-muted">
              <li>
                <a
                  href="https://www.bottomup.app/term_of_services"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-fg"
                >
                  Kullanım şartları
                </a>
              </li>
              <li>
                <a
                  href="https://www.bottomup.app/privacy_policy"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-fg"
                >
                  Gizlilik
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-[11px] text-fg-dim md:flex-row">
          <div>© {year} bottomUP · Tüm hakları saklıdır.</div>
          <div className="text-center md:text-right">
            Bottomup finansal tavsiye vermez. Alım-satım kararları sana aittir.
          </div>
        </div>
      </div>
    </footer>
  );
}
