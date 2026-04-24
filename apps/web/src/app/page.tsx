import { FaqSection } from '@/components/landing/faq-section';
import { FinalCta } from '@/components/landing/final-cta';
import { FoxyFirewallSection } from '@/components/landing/foxy-firewall-section';
import { Hero } from '@/components/landing/hero';
import { LandingFooter } from '@/components/landing/landing-footer';
import { LandingNav } from '@/components/landing/nav';
import { LeaderboardSection } from '@/components/landing/leaderboard-section';
import { MarketplaceSection } from '@/components/landing/marketplace-section';
import { McpSuiteSection } from '@/components/landing/mcp-suite-section';
import { NewsSection } from '@/components/landing/news-section';
import { PricingSection } from '@/components/landing/pricing-section';
import { ProblemSolutionSection } from '@/components/landing/problem-solution-section';
import { PulseSection } from '@/components/landing/pulse-section';
import { TickerStrip } from '@/components/landing/ticker-strip';
import { fetchLanding } from '@/components/landing/landing-data';

export const revalidate = 60;

export default async function LandingPage() {
  const data = await fetchLanding();

  return (
    <div className="min-h-screen">
      <LandingNav />
      {data ? <TickerStrip pulse={data.pulse} /> : null}

      <Hero data={data} />
      <ProblemSolutionSection />
      <FoxyFirewallSection />
      <MarketplaceSection />

      {data ? <LeaderboardSection traders={data.top_traders} /> : null}

      <McpSuiteSection />

      {data ? <PulseSection pulse={data.pulse} /> : null}

      {data && data.news.length > 0 ? <NewsSection news={data.news} /> : null}

      <PricingSection />
      <FaqSection />
      <FinalCta />
      <LandingFooter />
    </div>
  );
}
