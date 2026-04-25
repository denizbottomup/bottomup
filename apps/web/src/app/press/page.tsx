import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { LandingFooter } from '@/components/landing/landing-footer';
import { LandingNav } from '@/components/landing/nav';

const TITLE = 'Press kit — BottomUP';
const DESCRIPTION =
  'Press resources for journalists and researchers covering BottomUP: brand assets, key facts, founder bios, official boilerplate, media contact.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: 'https://bottomup.app/press' },
  openGraph: {
    type: 'website',
    url: 'https://bottomup.app/press',
    siteName: 'BottomUP',
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    site: '@bottomupsocial',
    title: TITLE,
    description: DESCRIPTION,
  },
};

const STATS: Array<{ label: string; value: string }> = [
  { label: 'Lifetime trade volume', value: '$1.59B' },
  { label: 'Organic mobile downloads', value: '107K+' },
  { label: 'Monthly active users', value: '18.4K' },
  { label: 'DAU / MAU', value: '24%' },
  { label: 'YoY revenue growth', value: '315%' },
  { label: 'Foxy AI data sources', value: '225' },
  { label: 'App locales', value: '10' },
  { label: 'Founded', value: '2024' },
];

const BRAND_COLORS: Array<{ name: string; hex: string; sample: string }> = [
  { name: 'Orange', hex: '#FF8A4C', sample: 'bg-[#FF8A4C]' },
  { name: 'Violet', hex: '#7C5CFF', sample: 'bg-[#7C5CFF]' },
  { name: 'Sky', hex: '#3B5BFF', sample: 'bg-[#3B5BFF]' },
  { name: 'Mint', hex: '#2BC18B', sample: 'bg-[#2BC18B]' },
  { name: 'Background', hex: '#0B0D10', sample: 'bg-[#0B0D10]' },
];

const LOGOS: Array<{ name: string; file: string; bg: 'light' | 'dark' }> = [
  { name: 'Logotype — color', file: '/logos/logotype-color.png', bg: 'dark' },
  { name: 'Logotype — color (light)', file: '/logos/logotype-color-light.png', bg: 'light' },
  { name: 'Logotype — black', file: '/logos/logotype-black.png', bg: 'light' },
  { name: 'Logotype — white', file: '/logos/logotype-white.png', bg: 'dark' },
  { name: 'Logomark — color', file: '/logos/logomark-color.png', bg: 'dark' },
  { name: 'Logomark — black', file: '/logos/logomark-black.png', bg: 'light' },
  { name: 'Logomark — white', file: '/logos/logomark-white.png', bg: 'dark' },
];

export default function PressPage() {
  return (
    <div className="min-h-screen">
      <LandingNav />
      <main className="mx-auto max-w-[960px] px-4 py-12 md:px-6 md:py-20">
        <header className="mb-12">
          <div className="mono-label">Press</div>
          <h1 className="mt-2 text-4xl font-extrabold tracking-[-0.02em] md:text-5xl">
            BottomUP press kit
          </h1>
          <p className="mt-4 max-w-2xl text-fg-muted md:text-lg">
            Resources for journalists, podcasters, and researchers covering
            BottomUP. Everything below is free to use without prior approval.
          </p>
        </header>

        <Section id="elevator" title="Elevator pitch">
          <p>
            BottomUP is the App Store of smart money — a marketplace where
            users subscribe to elite human traders, algorithmic bots, and
            autonomous AI agents to mirror their crypto trading strategies.
            Every signal is audited end-to-end by Foxy AI, a proprietary risk
            firewall trained on 225 data sources, before it reaches the
            user&apos;s connected wallet.
          </p>
        </Section>

        <Section id="boilerplate" title="Official boilerplate">
          <p className="rounded-2xl border border-border bg-bg-card/40 p-5 text-sm leading-relaxed text-fg-muted md:text-base">
            <strong className="text-fg">BottomUP, Inc.</strong> is a
            Delaware-incorporated AI-protected social copy-trading marketplace
            founded in 2024. The platform connects retail crypto traders to a
            curated marketplace of human traders, algorithmic bots, and
            autonomous AI agents on cryptocurrency exchanges (currently OKX,
            with Binance and Bybit on roadmap). Every signal is audited by
            Foxy AI, a proprietary risk firewall scoring trades 0–100 across
            225 data sources before execution. BottomUP is not a registered
            investment adviser. Copy-trading functionality is not currently
            offered to U.S. persons.
          </p>
        </Section>

        <Section id="stats" title="Key facts and figures">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-border bg-bg-card/40 p-4"
              >
                <div className="text-2xl font-extrabold tracking-tight md:text-3xl">
                  {s.value}
                </div>
                <div className="mt-1 text-[11px] uppercase tracking-wider text-fg-dim">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section id="logos" title="Logos">
          <p className="mb-4 text-sm text-fg-muted">
            Right-click any asset below to save. PNG only, transparent
            backgrounds. Vector files available on request.
          </p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {LOGOS.map((logo) => (
              <a
                key={logo.file}
                href={logo.file}
                download
                className={`group flex flex-col items-center justify-center rounded-2xl border border-border p-5 transition hover:border-white/30 ${
                  logo.bg === 'light' ? 'bg-white' : 'bg-bg-card'
                }`}
              >
                <Image
                  src={logo.file}
                  alt={logo.name}
                  width={200}
                  height={60}
                  unoptimized
                  className="h-12 w-auto object-contain"
                />
                <div
                  className={`mt-3 text-center text-[11px] uppercase tracking-wider ${
                    logo.bg === 'light' ? 'text-zinc-600' : 'text-fg-dim'
                  }`}
                >
                  {logo.name}
                </div>
              </a>
            ))}
          </div>
        </Section>

        <Section id="colors" title="Brand colors">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {BRAND_COLORS.map((c) => (
              <div
                key={c.hex}
                className="overflow-hidden rounded-2xl border border-border"
              >
                <div className={`h-16 ${c.sample}`} />
                <div className="p-3">
                  <div className="text-sm font-semibold">{c.name}</div>
                  <div className="font-mono text-[11px] text-fg-muted">
                    {c.hex}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section id="company" title="Company facts">
          <ul className="space-y-2 text-fg-muted">
            <li>
              <strong className="text-fg">Legal name:</strong> BottomUP, Inc.
            </li>
            <li>
              <strong className="text-fg">Headquartered:</strong> Wilmington,
              Delaware, United States
            </li>
            <li>
              <strong className="text-fg">Founded:</strong> 2024
            </li>
            <li>
              <strong className="text-fg">Industry:</strong> Financial
              technology · cryptocurrency · social trading
            </li>
            <li>
              <strong className="text-fg">Wikidata:</strong>{' '}
              <a
                href="https://www.wikidata.org/wiki/Q139559065"
                className="text-brand hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                Q139559065
              </a>
            </li>
            <li>
              <strong className="text-fg">App Store:</strong>{' '}
              <a
                href="https://apps.apple.com/tr/app/bottomup-sofi-trade-finance/id1661474993"
                className="text-brand hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                BottomUP — Sofi Trade Finance
              </a>
            </li>
            <li>
              <strong className="text-fg">Google Play:</strong>{' '}
              <a
                href="https://play.google.com/store/apps/details?id=com.bottomup.bottomupapp"
                className="text-brand hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                com.bottomup.bottomupapp
              </a>
            </li>
            <li>
              <strong className="text-fg">GitHub org:</strong>{' '}
              <a
                href="https://github.com/bottomupapp"
                className="text-brand hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                bottomupapp
              </a>
            </li>
          </ul>
        </Section>

        <Section id="contact" title="Media contact">
          <p>
            For interviews, quotes, or coverage requests, email{' '}
            <a
              href="mailto:press@bottomup.app"
              className="text-brand hover:underline"
            >
              press@bottomup.app
            </a>
            . Typical response time is under 24 hours on weekdays.
          </p>
        </Section>

        <Section id="further" title="Further reading">
          <ul className="space-y-2 text-fg-muted">
            <li>
              <Link href="/blog/foxy-ai-risk-firewall-how-it-works" className="text-brand hover:underline">
                How an AI risk firewall protects copy traders from blow-ups
              </Link>
            </li>
            <li>
              <Link href="/blog/what-is-auto-copy-trading" className="text-brand hover:underline">
                What is auto copy trading? A 2026 guide for retail crypto traders
              </Link>
            </li>
            <li>
              <Link href="/blog/ai-portfolio-management-crypto" className="text-brand hover:underline">
                AI portfolio management for crypto: how it actually works in 2026
              </Link>
            </li>
            <li>
              <Link href="/blog/tradfi-ai-agents-explained" className="text-brand hover:underline">
                TradFi AI agents, explained
              </Link>
            </li>
            <li>
              <a href="/llms-full.txt" className="text-brand hover:underline">
                Machine-readable company reference (/llms-full.txt)
              </a>
            </li>
          </ul>
        </Section>
      </main>
      <LandingFooter />
    </div>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-12">
      <h2 className="mb-4 text-2xl font-extrabold tracking-tight md:text-3xl">
        {title}
      </h2>
      <div className="text-base text-fg-muted md:text-lg">{children}</div>
    </section>
  );
}
