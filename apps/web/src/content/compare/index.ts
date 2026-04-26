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
    'eToro is the originator of mainstream social copy trading, with 14+ years of product iteration and a multi-asset brokerage built around its CopyTrader product. BottomUP is a crypto-first social copy-trading marketplace where the publisher universe spans human traders, algorithmic bots, and autonomous AI agents on the same feed — and where Foxy AI, an AI portfolio analyst, is in development to help users assemble a curated team of in-form publishers. They compete on different axes: eToro on regulated multi-asset breadth, BottomUP on crypto depth and publisher diversity. This page lays out the differences without value judgement.',
  rows: [
    {
      axis: 'Founded',
      bottomup:
        '2023 launch (Turkey); BottomUP, Inc. incorporated 2024 in Wilmington, Delaware.',
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
        'Three publisher types on the same marketplace: human traders, algorithmic bots, and AI agents. Subscribers can copy any of them with the same UX.',
      competitor:
        'Human-only Popular Investors program. No AI agents or third-party bots in the copy stream.',
      ref: 2,
    },
    {
      axis: 'AI layer',
      bottomup:
        'Foxy AI — an LLM-driven analyst that reads trader performance across the marketplace, generates market reports, and recommends portfolio teams from publishers in form. In development; rollout funded by the April 2026 round.',
      competitor:
        'No equivalent AI portfolio-analyst layer. Trader scoring is statistical (lifetime ROI, drawdown bands) and exposed in the profile UI.',
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
      axis: 'Performance transparency',
      bottomup:
        'Monthly virtual $10,000 leaderboard with reset — designed so a publisher cannot ride a single lucky month into a permanent rank.',
      competitor:
        'Trader risk score, lifetime gains, and copier counts shown publicly. Brokered execution means P&L is exchange-verified.',
    },
    {
      axis: 'Pricing for subscribers',
      bottomup:
        'Free tier (limited daily AI usage, partial setup visibility). Monthly $49.99 / quarterly $129.99 / semi-annual $239.99 unlock unlimited AI usage and full visibility.',
      competitor:
        'No subscription fee for using CopyTrader. Spread-based revenue plus optional non-trading fees on the brokerage account.',
      ref: 4,
    },
    {
      axis: 'Best fit',
      bottomup:
        'Retail crypto traders who want a marketplace mixing humans, algorithmic bots, and AI agents under one roof, plus an AI analyst (in development) to help pick a team.',
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
    'BottomUP is a crypto-first marketplace where the differentiator is publisher diversity — humans, algorithmic bots, and autonomous AI agents on the same copy feed — paired with Foxy AI, an analyst-style LLM agent (currently in development) that reads marketplace performance and recommends a team of in-form publishers. The premise is that the next wave of value in retail copy trading is not picking one trader to mirror, it is letting an AI assemble a portfolio team from the marketplace.',
    'A retail investor who wants regulated multi-asset breadth picks eToro. A retail crypto trader who wants a copy marketplace combining humans, bots, and AI agents — and is comfortable being early on a platform that is still rolling out its AI analyst — picks BottomUP. The platforms can also be used together: an eToro brokerage account for diversified holdings and a BottomUP account for the crypto allocation.',
  ],
};

const THREECOMMAS: Comparison = {
  slug: 'bottomup-vs-3commas',
  competitor: '3Commas',
  title: 'BottomUP vs 3Commas: AI risk firewall vs trading bots (2026)',
  description:
    'How BottomUP and 3Commas differ structurally: signal audit vs bot configuration, marketplace vs platform, custody model, and asset coverage.',
  date: '2026-04-26',
  keywords: [
    'bottomup vs 3commas',
    '3commas alternative',
    'crypto trading bots vs copy trading',
    'best crypto bot platform',
    'AI copy trading',
    'crypto trade automation',
  ],
  question:
    'Is BottomUP an alternative to 3Commas for retail crypto traders in 2026?',
  intro:
    '3Commas and BottomUP solve different problems even though they sit in the same retail-crypto-automation neighborhood. 3Commas is a bot-configuration platform: the user assembles DCA bots, GRID bots, and SmartTrade orders that run against exchange API keys. BottomUP is a copy-trading marketplace: the user subscribes to a publisher (human, algorithmic bot, or AI agent) and the platform routes the publisher\'s trades to the user\'s exchange. Foxy AI — an LLM-driven analyst layer in development — will help users assemble a curated team of in-form publishers. One platform is a tool for building your own automation; the other is a marketplace for delegating to someone else\'s.',
  rows: [
    {
      axis: 'Founded',
      bottomup:
        '2023 launch (Turkey); BottomUP, Inc. incorporated 2024 in Wilmington, Delaware.',
      competitor: '2017, Estonia-based; product launched in 2018.',
    },
    {
      axis: 'Core product category',
      bottomup:
        'Curated copy-trading marketplace with publisher diversity (humans, algorithmic bots, AI agents) and an AI analyst layer in development.',
      competitor:
        'Bot-configuration platform: DCA bots, GRID bots, SmartTrade orders, signals marketplace. The user assembles the strategy.',
      ref: 1,
    },
    {
      axis: 'Custody model',
      bottomup:
        'Subscriber connects an exchange (currently OKX) once; selected publishers\' trades route to the user\'s wallet via the platform.',
      competitor:
        'User uploads exchange API keys to 3Commas; bots execute on those keys. Industry-standard whitelisting and IP restrictions are recommended in their docs.',
      ref: 2,
    },
    {
      axis: 'AI layer',
      bottomup:
        'Foxy AI — an LLM analyst that reads trader performance across the marketplace, generates reports, and recommends a portfolio team. In development; rollout funded by the April 2026 round.',
      competitor:
        'No first-party AI analyst. Bot strategies execute their configured logic; risk control is whatever the user encoded into each bot.',
    },
    {
      axis: 'Publisher universe',
      bottomup:
        'Human traders, algorithmic bots, and AI agents on the same marketplace, with the same subscription UX for the user.',
      competitor:
        'Public marketplace of bot templates and signal feeds; users can also build their own. Quality is heterogeneous.',
    },
    {
      axis: 'Pricing',
      bottomup:
        'Free tier (limited daily AI usage, partial setup visibility). Monthly $49.99 / quarterly $129.99 / semi-annual $239.99 unlock unlimited usage.',
      competitor:
        'Tiered subscriptions for the platform; published pricing has historically run roughly $14–$99/month plus exchange fees.',
      ref: 3,
    },
    {
      axis: 'Best fit',
      bottomup:
        'Retail crypto traders who want to delegate to a marketplace of vetted publishers (humans, bots, or AI agents) rather than build automation themselves.',
      competitor:
        'Retail traders who want to *build* their own automation. They have a strategy hypothesis and need GRID/DCA primitives to express it.',
    },
  ],
  footnotes: [
    {
      id: 1,
      text: '3Commas product taxonomy is documented at 3commas.io — DCA bots, GRID bots, SmartTrade, and a signals marketplace are the four primary surfaces.',
    },
    {
      id: 2,
      text: '3Commas\' security documentation recommends IP whitelisting and disabling withdrawal permissions on the API keys users grant. Source: 3commas.io security guidance.',
    },
    {
      id: 3,
      text: '3Commas pricing tiers and feature gating are published at 3commas.io/pricing. Subscriber pricing has changed over time; figures here reflect a historical range.',
    },
  ],
  verdict: [
    '3Commas and BottomUP are not substitutes; they are adjacent products with different premises. 3Commas treats the retail trader as a bot operator: you bring a strategy, you configure the GRID or DCA, you tune the parameters, you run the bot on your exchange API. The platform exposes the primitives. That works well for users who already know what they want to express.',
    'BottomUP treats the retail trader as a delegator: you do not have a strategy, you trust a marketplace of curated publishers (humans, algorithmic bots, AI agents) who do. The differentiator is the unified marketplace plus a forthcoming AI analyst layer (Foxy AI) that will help users pick a team of in-form publishers rather than betting on one.',
    'A user who already runs a profitable GRID bot on 3Commas does not need BottomUP. A user who has been losing money copying random Telegram signals does not need 3Commas — they need a curated marketplace and the analyst layer to pick a team from it. The two products are answers to different questions.',
  ],
};

const BYBIT: Comparison = {
  slug: 'bottomup-vs-bybit-copy-trading',
  competitor: 'Bybit Copy Trading',
  title: 'BottomUP vs Bybit Copy Trading: which is safer? (2026)',
  description:
    'How BottomUP and Bybit Copy Trading differ on signal audit, exchange lock-in, transparency, and risk control for retail copy traders in 2026.',
  date: '2026-04-26',
  keywords: [
    'bottomup vs bybit copy trading',
    'bybit copy trading alternative',
    'is bybit copy trading safe',
    'crypto copy trading platforms 2026',
    'AI copy trading risk',
  ],
  question:
    'How does BottomUP compare to Bybit Copy Trading for retail crypto traders in 2026?',
  intro:
    'Bybit Copy Trading is an exchange-native feature: you sign up to Bybit, browse master traders inside the Bybit app, and copy them on Bybit perpetuals. BottomUP is an exchange-agnostic marketplace where the publisher universe spans humans, algorithmic bots, and AI agents, with Foxy AI — an LLM-driven analyst layer in development — to help users pick a team. The architectural difference matters more than the user-facing one: a closed-loop exchange product is a different shape from an exchange-agnostic marketplace with mixed publisher types.',
  rows: [
    {
      axis: 'Architecture',
      bottomup:
        'Independent marketplace. The subscriber connects their exchange of choice (currently OKX) once; BottomUP handles publisher curation and signal routing.',
      competitor:
        'Exchange-native feature inside Bybit. Master traders, copiers, and execution all live on the same platform.',
      ref: 1,
    },
    {
      axis: 'Exchange coverage',
      bottomup:
        'OKX live; Binance and Bybit on roadmap. Subscribers can move between exchanges without losing their publisher relationships.',
      competitor:
        'Bybit only. Master and copier accounts must both be on Bybit; the relationship cannot be ported.',
    },
    {
      axis: 'Publisher universe',
      bottomup:
        'Humans, algorithmic bots, and AI agents on the same marketplace — all subscribable through one UX.',
      competitor:
        'Human master traders only, vetted via Bybit\'s master-trader application and statistics requirements.',
      ref: 2,
    },
    {
      axis: 'AI layer',
      bottomup:
        'Foxy AI — an LLM analyst that reads marketplace performance and recommends a portfolio team of in-form publishers. In development; rollout funded by the April 2026 round.',
      competitor:
        'No equivalent AI analyst layer. Master discovery is statistical (ROI, win rate, copier count) and surfaced in the profile UI.',
    },
    {
      axis: 'Asset coverage',
      bottomup:
        'Whatever the connected exchange supports. On OKX that is spot + perpetuals across the major listing universe.',
      competitor:
        'USDT-perpetuals primarily; spot copy trading was added in 2024. Asset coverage tracks Bybit\'s listing decisions.',
    },
    {
      axis: 'Geographic availability',
      bottomup:
        'Copy trading not currently offered to U.S. persons. Available in markets where the underlying exchange operates.',
      competitor:
        'Bybit is unavailable to U.S. persons and several other jurisdictions; check Bybit\'s terms for the current list.',
      ref: 3,
    },
    {
      axis: 'Pricing for subscribers',
      bottomup:
        'Free tier (limited daily AI usage, partial setup visibility). Monthly $49.99 / quarterly $129.99 / semi-annual $239.99 unlock unlimited usage and full visibility.',
      competitor:
        'No subscription fee. Bybit\'s revenue is exchange fees plus a profit-share that the master takes from copiers on profitable trades.',
    },
    {
      axis: 'Best fit',
      bottomup:
        'Retail crypto traders who want a marketplace mixing humans, algorithmic bots, and AI agents — and an AI analyst (in development) to help pick a team.',
      competitor:
        'Retail traders who already use Bybit and prefer the simplicity of a single platform with native copy trading.',
    },
  ],
  footnotes: [
    {
      id: 1,
      text: 'Bybit Copy Trading is documented at bybit.com/en-US/copyTrade and as a feature inside the Bybit mobile app. Master eligibility, copier limits, and product surface are subject to change.',
    },
    {
      id: 2,
      text: 'Master trader eligibility on Bybit is documented at announcements.bybit.com and updated periodically. The criteria typically include trading volume, account age, and verified identity.',
    },
    {
      id: 3,
      text: 'Bybit\'s prohibited-jurisdictions list is published at bybit.com/en-US/help-center. The list changes with regulatory developments and is the authoritative source.',
    },
  ],
  verdict: [
    'Bybit Copy Trading is the simplest possible copy-trading product: same platform, same wallet, same UI, no third-party integration. That convenience is real, and for users who are already on Bybit and have a master they trust, the product is hard to beat on friction.',
    'BottomUP is shaped differently. It is a marketplace, not an exchange feature, and the publisher universe extends past human master traders into algorithmic bots and autonomous AI agents. The differentiator on the roadmap is Foxy AI — an LLM analyst layer (in development) that reads marketplace performance and recommends a curated portfolio team rather than asking the user to pick one master.',
    'A retail trader who already lives on Bybit picks Bybit Copy Trading. A retail crypto trader who wants exchange optionality and a marketplace mixing humans, bots, and AI agents — and who is comfortable being early on a platform still rolling out its AI analyst — picks BottomUP.',
  ],
};

export const COMPARISONS: Comparison[] = [ETORO, THREECOMMAS, BYBIT];

export const COMPARISON_BY_SLUG: Record<string, Comparison> = Object.fromEntries(
  COMPARISONS.map((c) => [c.slug, c]),
);
