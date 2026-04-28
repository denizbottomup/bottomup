import { FaqSection } from './faq-section';
import { FoxyFirewallSection } from './foxy-firewall-section';
import { Hero } from './hero';
import { IntroVideoSection } from './intro-video-section';
import { LandingFooter } from './landing-footer';
import { LandingNav } from './nav';
import { LeaderboardSection } from './leaderboard-section';
import { MarketplaceSection } from './marketplace-section';
import { McpSuiteSection } from './mcp-suite-section';
import { MobilePreviewSection } from './mobile-preview-section';
import { PartnersSection } from './partners-section';
import { NewsSection } from './news-section';
import { PricingSection } from './pricing-section';
import { ProblemSolutionSection } from './problem-solution-section';
import { PulseSection } from './pulse-section';
import { StructuredData } from './structured-data';
import { TickerStrip } from './ticker-strip';
import { fetchLanding } from './landing-data';
import type { LocaleCode } from '@/lib/locale-config';

/**
 * Shared landing-page body. Both `app/page.tsx` (canonical English at
 * `/`) and `app/[locale]/page.tsx` (every other locale at `/tr`,
 * `/es`, ...) render this — they only differ in metadata and which
 * dictionary the LocaleProvider has been seeded with.
 *
 * The data fetch is locale-aware so the news cards arrive translated
 * on the very first render rather than after a client refetch.
 */
export async function LandingShell({ locale }: { locale: LocaleCode }) {
  const data = await fetchLanding(locale);

  return (
    <div className="min-h-screen">
      <StructuredData locale={locale} />
      <LandingNav />
      {data ? <TickerStrip pulse={data.pulse} /> : null}

      <Hero data={data} />
      <PartnersSection />
      <MobilePreviewSection />
      <IntroVideoSection />
      <ProblemSolutionSection />
      <FoxyFirewallSection />
      <MarketplaceSection />

      <LeaderboardSection />

      <McpSuiteSection />

      {data ? <PulseSection pulse={data.pulse} /> : null}

      {data && data.news.length > 0 ? <NewsSection news={data.news} /> : null}

      <PricingSection />
      <FaqSection />
      <LandingFooter />
    </div>
  );
}
