import { CompetitiveSection } from '@/components/landing/competitive-section';
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
import { ProblemSection } from '@/components/landing/problem-section';
import { PulseSection } from '@/components/landing/pulse-section';
import { RoadmapSection } from '@/components/landing/roadmap-section';
import { SolutionSection } from '@/components/landing/solution-section';
import { TickerStrip } from '@/components/landing/ticker-strip';
import { TractionSection } from '@/components/landing/traction-section';
import { fetchLanding } from '@/components/landing/landing-data';

export const revalidate = 60;

export default async function LandingPage() {
  const data = await fetchLanding();

  return (
    <div className="min-h-screen">
      <LandingNav />
      {data ? <TickerStrip pulse={data.pulse} /> : null}

      <Hero data={data} />
      <ProblemSection />
      <SolutionSection />
      <FoxyFirewallSection />
      <MarketplaceSection />

      {data ? (
        <LeaderboardSection
          traders={data.top_traders}
          setups={data.latest_setups}
        />
      ) : null}

      <McpSuiteSection />

      {data ? <PulseSection pulse={data.pulse} /> : null}

      <TractionSection />
      <CompetitiveSection />
      <RoadmapSection />

      {data && data.news.length > 0 ? <NewsSection news={data.news} /> : null}

      <PricingSection />
      <FaqSection />
      <FinalCta />
      <LandingFooter />
    </div>
  );
}
