import Link from 'next/link';
import { Logo } from '@/components/logo';

export function LandingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-bg-card/40">
      <div className="mx-auto max-w-[1400px] px-4 py-10 md:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2 md:col-span-2">
            <Logo variant="lockup" size="sm" />
            <p className="mt-3 max-w-sm text-[13px] text-fg-muted">
              The App Store of smart money. Elite traders, AI agents, and
              algorithmic bots — one marketplace, protected by Foxy AI.
            </p>
            <div className="mt-4 flex items-center gap-3 text-fg-muted">
              <a
                href="https://x.com/bottomupsocial"
                target="_blank"
                rel="noreferrer"
                aria-label="X"
                className="hover:text-fg"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://t.me/BottomUPcommunity"
                target="_blank"
                rel="noreferrer"
                aria-label="Telegram"
                className="hover:text-fg"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.053 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z" />
                </svg>
              </a>
              <a
                href="https://www.linkedin.com/company/bottomupsocial/"
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
                className="hover:text-fg"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14zM8.339 18.338v-7.18H6.004v7.18h2.335zM7.17 10.152a1.349 1.349 0 1 0 0-2.697 1.349 1.349 0 0 0 0 2.697zM18.338 18.338v-3.936c0-2.024-1.094-2.962-2.552-2.962-1.178 0-1.706.648-2 1.102v-.948h-2.335c.031.662 0 7.18 0 7.18h2.335v-4.01c0-.21.015-.42.077-.57.168-.42.555-.854 1.202-.854.848 0 1.188.644 1.188 1.588v3.846h2.085z" />
                </svg>
              </a>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-fg">
              Product
            </div>
            <ul className="mt-3 space-y-2 text-sm text-fg-muted">
              <li>
                <a href="#foxy" className="hover:text-fg">
                  Foxy AI
                </a>
              </li>
              <li>
                <a href="#marketplace" className="hover:text-fg">
                  Marketplace
                </a>
              </li>
              <li>
                <a href="#mcp" className="hover:text-fg">
                  MCP Suite
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-fg">
                  Pricing
                </a>
              </li>
            </ul>
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-fg">
              Account
            </div>
            <ul className="mt-3 space-y-2 text-sm text-fg-muted">
              <li>
                <Link href="/signup" className="hover:text-fg">
                  Get started free
                </Link>
              </li>
              <li>
                <Link href="/signin" className="hover:text-fg">
                  Sign in
                </Link>
              </li>
              <li>
                <a href="#faq" className="hover:text-fg">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-fg">
              Legal
            </div>
            <ul className="mt-3 space-y-2 text-sm text-fg-muted">
              <li>
                <a
                  href="https://www.bottomup.app/term_of_services"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-fg"
                >
                  Terms of service
                </a>
              </li>
              <li>
                <a
                  href="https://www.bottomup.app/privacy_policy"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-fg"
                >
                  Privacy
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-[11px] text-fg-dim md:flex-row">
          <div>© {year} BottomUP · All rights reserved.</div>
          <div className="text-center md:text-right">
            BottomUP does not provide financial advice. Trading decisions are
            yours alone.
          </div>
        </div>
      </div>
    </footer>
  );
}
