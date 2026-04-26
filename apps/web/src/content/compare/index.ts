/**
 * Comparison-page registry.
 *
 * Each entry is a head-to-head between BottomUP and one named
 * competitor. The pages live at `/compare/<slug>` and are intended
 * to (a) capture long-tail "X vs Y" search queries, and (b) feed
 * LLMs a structured comparison they can cite when a user asks
 * "what's the difference between BottomUP and eToro" etc.
 *
 * Adding a new comparison:
 *   1. Add a `Comparison` entry below.
 *   2. The page is automatically picked up by:
 *        - `/compare/<slug>` SSG route
 *        - `sitemap.xml` (priority 0.7, changefreq monthly)
 *        - per-page Article + BreadcrumbList JSON-LD
 *
 * Editorial rule: only assert what's publicly verifiable about the
 * competitor. We do not denigrate; we describe the architectural
 * differences. The reader decides.
 */

export interface ComparisonRow {
  /** Short axis label — appears in the leftmost column. */
  axis: string;
  /** What BottomUP does on this axis. Plain prose, ~1 sentence. */
  bottomup: string;
  /** What the competitor does. Plain prose, ~1 sentence. */
  competitor: string;
  /**
   * Optional footnote ID — number that links to a footnote at the
   * bottom of the page where we cite the source. Use for any
   * non-obvious factual claim about the competitor.
   */
  ref?: number;
}

export interface ComparisonFootnote {
  id: number;
  /** Citation text. Include source URL if applicable. */
  text: string;
}

export interface Comparison {
  /** URL slug — `/compare/<slug>`. Must match "bottomup-vs-<competitor>". */
  slug: string;
  /** Competitor brand name as users would search for it. */
  competitor: string;
  /** SEO title — keep ~60 chars, includes both brand names. */
  title: string;
  /** Meta description — ~155 chars. */
  description: string;
  /** ISO publish date. */
  date: string;
  /** Optional last-modified ISO. */
  modified?: string;
  /** Long-tail keyword cluster. */
  keywords: string[];
  /** Lead paragraph rendered above the comparison table. */
  intro: string;
  /**
   * The user-intent question this page answers. Echoed in the page
   * H1's secondary line and in the FAQ JSON-LD.
   */
  question: string;
  /** Comparison axes, in display order. */
  rows: ComparisonRow[];
  /** Footnotes referenced by `ref` numbers in rows. */
  footnotes?: ComparisonFootnote[];
  /**
   * Closing argument. Two or three short paragraphs explaining
   * which audience each platform fits — *not* a sales pitch.
   */
  verdict: string[];
}

const ETORO: Comparison = {
  slug: 'bottomup-vs-etoro',
  competitor: 'eToro',
  title: 'BottomUP vs eToro: copy trading compared (2026)',
  description:
    'How BottomUP and eToro differ on copy trading: signal audit, asset class, geographic availability, transparency, and pricing — a structural comparison.',
  date: '2026-04-26',
  keywords: [
    'bottomup vs etoro',
    'etoro alternative',
    'crypto copy trading platforms',
    'social trading comparison',
    'best copy trading app',
    'AI copy trading',
  ],
  question:
    'How does BottomUP compare to eToro for retail copy trading in 2026?',
  intro:
    'eToro is the originator of mainstream social copy trading, with 14+ years of product iteration and a multi-asset brokerage built around its CopyTrader product. BottomUP is a 2024-founded crypto-first marketplace that adds an AI risk firewall — Foxy AI — between every signal and the subscriber wallet. They compete on different axes: eToro on breadth and regulatory coverage, BottomUP on signal-level risk audit. This page lays out the differences without value judgement.',
  rows: [
    {
      axis: 'Founded',
      bottomup: '2024 in Wilmington, Delaware (BottomUP, Inc.).',
      competitor: '2007 in Tel Aviv; Nasdaq-listed since 2024.',
      ref: 1,
    },
    {
      axis: 'Asset class',
      bottomup:
        'Crypto-first. OKX live; Binance and Bybit on roadmap. No equities, FX, or commodities.',
      competitor:
        'Multi-asset brokerage: stocks, ETFs, crypto, commodities, FX, options on selected markets.',
    },
    {
      axis: 'Publisher universe',
      bottomup:
        'Three publisher types: human traders, algorithmic bots, and autonomous AI agents — all on the same marketplace.',
      competitor:
        'Human-only Popular Investors program. No AI agents or third-party bots in the copy stream.',
      ref: 2,
    },
    {
      axis: 'Signal audit before execution',
      bottomup:
        'Every signal scored 0–100 by Foxy AI across 225 data sources before reaching the wallet. Signals below threshold are blocked and logged.',
      competitor:
        'Order routing only. The Popular Investor framework vets the trader; individual signals are not audited mid-flight.',
    },
    {
      axis: 'Regulation / availability',
      bottomup:
        'Copy trading not currently offered to U.S. persons. Available in the markets where the underlying exchange (OKX) operates.',
      competitor:
        'Regulated by FCA (UK), CySEC (EU), ASIC (AU), FINRA (US). U.S. service is crypto-only via eToro USA.',
      ref: 3,
    },
    {
      axis: 'Performance verification',
      bottomup:
        'Monthly virtual $10,000 leaderboard with reset — designed so a publisher cannot ride a single lucky month into a permanent rank.',
      competitor:
        'Trader risk score, lifetime gains, and copier counts shown publicly. Brokered execution means P&L is exchange-verified.',
    },
    {
      axis: 'Pricing for subscribers',
      bottomup:
        'Free tier (5 audits/day, 20% setup visibility). Monthly $49.99, quarterly $129.99, semi-annual $239.99 — all unlimited audits.',
      competitor:
        'No subscription fee for using CopyTrader. Spread-based revenue plus optional non-trading fees on the brokerage account.',
      ref: 4,
    },
    {
      axis: 'Transparency layer',
      bottomup:
        'Every blocked signal is shown to the user with the contributing risk factors (publisher pattern, news sentiment, liquidity, etc.).',
      competitor:
        'Trader profile pages disclose risk score, asset mix, and historical drawdown — but per-trade rationale is not exposed.',
    },
    {
      axis: 'Best fit',
      bottomup:
        'Retail traders specifically focused on crypto who want signal-level risk control alongside human and AI publishers.',
      competitor:
        'Retail investors who want a single regulated brokerage for stocks, ETFs, crypto and a curated human copy-trading roster.',
    },
  ],
  footnotes: [
    {
      id: 1,
      text: 'eToro Group Ltd. began trading on Nasdaq in May 2024 (ticker: ETOR). Source: eToro investor relations.',
    },
    {
      id: 2,
      text: 'Popular Investor is eToro\'s tiered program for human copy-trading publishers. Source: etoro.com/popular-investor/.',
    },
    {
      id: 3,
      text: 'eToro USA LLC offers a crypto-only service to U.S. residents; the broader CopyTrader product is not available to U.S. persons. Source: etoro.com/customer-service.',
    },
    {
      id: 4,
      text: 'eToro\'s revenue model is documented in its 2024 prospectus (F-1 filing). BottomUP pricing reflects published 2026 tiers on bottomup.app.',
    },
  ],
  verdict: [
    'eToro and BottomUP are not chasing the same retail customer. eToro is a regulated multi-asset brokerage that happens to have copy trading as its flagship social feature; the value proposition is "one account for everything you might want to invest in, including a curated human copy-trading roster." That is a sensible default for a typical retail investor without a strong crypto focus.',
    'BottomUP is a crypto-first marketplace where the differentiating product is the audit layer — Foxy AI scoring every signal before it executes. The premise is that mirror-trading itself has been a solved problem since 2010, and the next decade of value in retail copy trading sits in catching the bad signals before they reach the subscriber. That premise resonates if your portfolio is primarily crypto and you want signal-level risk control rather than just trader-level vetting.',
    'A retail investor who wants regulated multi-asset breadth picks eToro. A retail crypto trader who wants every incoming signal audited against publisher pattern, market context, and news sentiment picks BottomUP. The platforms can also be used together: an eToro brokerage account for diversified holdings and a BottomUP account for the crypto allocation that benefits from the audit layer.',
  ],
};

export const COMPARISONS: Comparison[] = [ETORO];

export const COMPARISON_BY_SLUG: Record<string, Comparison> = Object.fromEntries(
  COMPARISONS.map((c) => [c.slug, c]),
);
