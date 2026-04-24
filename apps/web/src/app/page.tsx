import { FaqSection } from '@/components/landing/faq-section';
import { FeaturesSection } from '@/components/landing/features-section';
import { FinalCta } from '@/components/landing/final-cta';
import { Hero } from '@/components/landing/hero';
import { LandingFooter } from '@/components/landing/landing-footer';
import { LandingNav } from '@/components/landing/nav';
import { LeaderboardSection } from '@/components/landing/leaderboard-section';
import { NewsSection } from '@/components/landing/news-section';
import { PricingSection } from '@/components/landing/pricing-section';
import { PulseSection } from '@/components/landing/pulse-section';
import { TickerStrip } from '@/components/landing/ticker-strip';
import { VirtualPortfolioSection } from '@/components/landing/virtual-portfolio-section';
import { fetchLanding } from '@/components/landing/landing-data';

export const revalidate = 60;

export default async function LandingPage() {
  const data = await fetchLanding();

  return (
    <div className="min-h-screen">
      <LandingNav />
      {data ? <TickerStrip pulse={data.pulse} /> : null}

      <Hero data={data} />

      {data ? <PulseSection pulse={data.pulse} /> : null}

      {data ? (
        <LeaderboardSection
          traders={data.top_traders}
          setups={data.latest_setups}
        />
      ) : null}

      <FeaturesSection />

      <VirtualPortfolioSection />

      {data && data.news.length > 0 ? <NewsSection news={data.news} /> : null}

      <PricingSection />

      <FaqSection />

      <FinalCta />

      <LandingFooter />
    </div>
  );
}
