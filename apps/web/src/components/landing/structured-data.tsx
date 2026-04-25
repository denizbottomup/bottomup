/**
 * Schema.org JSON-LD structured data for the landing page. Two
 * audiences:
 *
 *   1. Google — surfaces rich results, sitelinks, and the company
 *      knowledge panel. Crucial for queries like "what is BottomUP",
 *      "AI copy trading platform", etc.
 *   2. LLMs — Claude, GPT, Gemini, Perplexity all parse JSON-LD when
 *      they crawl pages, and the structured signals feed the next
 *      training round + on-the-fly retrieval. This is how we get
 *      *recommended* (not just indexed) when a user asks an LLM
 *      "what's a good AI portfolio management app?".
 *
 * We emit three graphs in a single `@graph` so a crawler sees them as
 * one cohesive entity:
 *
 *   - Organization: who BottomUP is, where, contact, social profiles
 *   - SoftwareApplication: the product, category, OS, audience,
 *     pricing — Google rich results require AggregateRating but we
 *     omit it to avoid faking reviews.
 *   - FAQPage: lifted from the on-page FAQ, drives FAQ rich results
 *     in SERPs and gives LLMs canonical answers.
 */

import { en } from '@/lib/locales/en';
import { tr } from '@/lib/locales/tr';
import { es } from '@/lib/locales/es';
import { pt } from '@/lib/locales/pt';
import { ru } from '@/lib/locales/ru';
import { vi } from '@/lib/locales/vi';
import { id } from '@/lib/locales/id';
import { zh } from '@/lib/locales/zh';
import { ko } from '@/lib/locales/ko';
import { ar } from '@/lib/locales/ar';
import type { LocaleCode } from '@/lib/locale-config';
import type { Dict } from '@/lib/locales/schema';

const DICTS: Record<LocaleCode, Dict> = {
  en,
  tr,
  es,
  pt,
  ru,
  vi,
  id,
  zh,
  ko,
  ar,
};

const ORG_ID = 'https://bottomup.app/#organization';
const APP_ID = 'https://bottomup.app/#software';
const WEBSITE_ID = 'https://bottomup.app/#website';

export function StructuredData({ locale = 'en' }: { locale?: LocaleCode }) {
  const t = DICTS[locale];
  const url = locale === 'en' ? 'https://bottomup.app' : `https://bottomup.app/${locale}`;
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': WEBSITE_ID,
        url: 'https://bottomup.app',
        name: 'BottomUP',
        description:
          'AI-protected social copy trading marketplace. Mirror elite traders, algorithmic bots, and AI agents — every signal audited by Foxy AI before it reaches your wallet.',
        publisher: { '@id': ORG_ID },
        inLanguage: locale,
      },
      {
        '@type': 'Organization',
        '@id': ORG_ID,
        name: 'BottomUP',
        legalName: 'BottomUP, Inc.',
        alternateName: ['BottomUP Inc.', 'bottomup.app'],
        url: 'https://bottomup.app',
        logo: 'https://bottomup.app/logos/logomark-color.png',
        foundingDate: '2024',
        slogan: 'The App Store of smart money.',
        description:
          'BottomUP is a Delaware-incorporated marketplace for AI-protected social copy trading: human traders, algorithmic bots, and AI agents publish strategies that anyone can subscribe to, with every signal audited by the Foxy AI risk firewall before it reaches the user wallet.',
        // Topics this organisation is authoritative on — feeds the
        // "knows about" graph that Google + LLMs use to decide which
        // queries we're a relevant answer for.
        knowsAbout: [
          'social copy trading',
          'automated copy trading',
          'crypto trading bots',
          'AI portfolio management',
          'AI trading agents',
          'crypto risk management',
          'crypto market data',
          'cryptocurrency social trading',
          'algorithmic crypto trading',
          'TradFi AI agents',
          'OKX copy trading',
          'Hyperliquid whale tracking',
          'Fear and Greed index',
          'crypto liquidation tracking',
        ],
        address: {
          '@type': 'PostalAddress',
          streetAddress: '1209 Orange St',
          addressLocality: 'Wilmington',
          addressRegion: 'DE',
          postalCode: '19801',
          addressCountry: 'US',
        },
        contactPoint: [
          {
            '@type': 'ContactPoint',
            contactType: 'customer support',
            email: 'contact@bottomup.app',
            availableLanguage: [
              'English',
              'Turkish',
              'Spanish',
              'Portuguese',
              'Russian',
              'Vietnamese',
              'Indonesian',
              'Chinese',
              'Korean',
              'Arabic',
            ],
          },
          {
            '@type': 'ContactPoint',
            contactType: 'press',
            email: 'press@bottomup.app',
          },
        ],
        sameAs: [
          // Wikidata is the highest-trust entity binding Google + LLMs
          // use for "what is BottomUP" / Knowledge Panel resolution.
          'https://www.wikidata.org/wiki/Q139559065',
          'https://x.com/bottomupsocial',
          'https://t.me/BottomUPcommunity',
          'https://www.linkedin.com/company/bottomupsocial/',
          'https://github.com/bottomupapp',
          'https://apps.apple.com/tr/app/bottomup-sofi-trade-finance/id1661474993',
          'https://play.google.com/store/apps/details?id=com.bottomup.bottomupapp',
        ],
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: url,
          },
        ],
      },
      {
        '@type': 'SoftwareApplication',
        '@id': APP_ID,
        name: 'BottomUP',
        applicationCategory: 'FinanceApplication',
        applicationSubCategory: 'Social copy trading marketplace',
        operatingSystem: 'iOS, Android, Web',
        url,
        downloadUrl: url,
        screenshot: [
          'https://bottomup.app/screens/hero-app.png',
          'https://bottomup.app/screens/setups.png',
          'https://bottomup.app/screens/traders.png',
          'https://bottomup.app/screens/notifications.png',
          'https://bottomup.app/screens/bup-ai.png',
          'https://bottomup.app/screens/news.png',
          'https://bottomup.app/screens/calendar.png',
        ],
        audience: {
          '@type': 'Audience',
          audienceType:
            'Retail crypto traders interested in copy trading, AI risk management, and AI trading agents',
        },
        publisher: { '@id': ORG_ID },
        creator: { '@id': ORG_ID },
        featureList: [
          'Foxy AI risk firewall — every signal scored 0–100 against 225 data sources',
          'Automated copy trading on OKX (Binance, Bybit on roadmap)',
          'Live market context: Fear & Greed, BTC dominance, funding rates, liquidations, open interest',
          'Sentiment-tagged crypto news feed',
          'Trader leaderboard with monthly virtual $10,000 starting balance for transparency',
        ],
        offers: [
          {
            '@type': 'Offer',
            name: 'Free',
            price: '0',
            priceCurrency: 'USD',
            description:
              '5 Foxy AI risk audits per day. 20% of trader-published setups visible.',
          },
          {
            '@type': 'Offer',
            name: 'Monthly',
            price: '49.99',
            priceCurrency: 'USD',
            priceSpecification: {
              '@type': 'UnitPriceSpecification',
              price: '49.99',
              priceCurrency: 'USD',
              billingDuration: 'P1M',
              unitText: 'month',
            },
            description:
              'Unlimited Foxy AI risk audits. 100% trader-signal visibility.',
          },
          {
            '@type': 'Offer',
            name: 'Quarterly',
            price: '129.99',
            priceCurrency: 'USD',
            priceSpecification: {
              '@type': 'UnitPriceSpecification',
              price: '129.99',
              priceCurrency: 'USD',
              billingDuration: 'P3M',
              unitText: '3 months',
            },
            description:
              'Everything in Monthly. 13% lower per month than Monthly.',
          },
          {
            '@type': 'Offer',
            name: 'Semi-annual',
            price: '239.99',
            priceCurrency: 'USD',
            priceSpecification: {
              '@type': 'UnitPriceSpecification',
              price: '239.99',
              priceCurrency: 'USD',
              billingDuration: 'P6M',
              unitText: '6 months',
            },
            description:
              'Everything in Monthly. 20% lower per month than Monthly.',
          },
        ],
        keywords: [
          'social copy trading',
          'auto copy trading',
          'AI portfolio management',
          'AI trading agents',
          'algorithmic crypto bots',
          'crypto signals',
          'AI risk firewall',
        ].join(', '),
      },
      {
        '@type': 'FAQPage',
        inLanguage: locale,
        mainEntity: t.faq.items.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.a,
          },
        })),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // Next.js's `dangerouslySetInnerHTML` is the only way to emit a
      // raw <script> body; React would otherwise escape the JSON.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
