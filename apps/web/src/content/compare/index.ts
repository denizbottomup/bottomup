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
    '3Commas and BottomUP solve different problems even though they sit in the same retail-crypto-automation neighborhood. 3Commas is a bot-configuration platform: the user assembles DCA bots, GRID bots, and SmartTrade orders that run against exchange API keys. BottomUP is a signal-audit marketplace: the user subscribes to a publisher (human, bot, or AI agent) and Foxy AI scores every incoming signal before execution. One is a tool for building your own automation; the other is a guardrail on top of someone else\'s.',
  rows: [
    {
      axis: 'Founded',
      bottomup: '2024 in Wilmington, Delaware (BottomUP, Inc.).',
      competitor: '2017, Estonia-based; product launched in 2018.',
    },
    {
      axis: 'Core product category',
      bottomup:
        'Curated signal marketplace with an audit layer. The user picks a publisher and sets risk preferences; Foxy AI does the per-trade vetting.',
      competitor:
        'Bot-configuration platform: DCA bots, GRID bots, SmartTrade orders, signals marketplace. The user assembles the strategy.',
      ref: 1,
    },
    {
      axis: 'Custody model',
      bottomup:
        'Subscriber connects an exchange (currently OKX) once; signals are routed through the audit layer before reaching the wallet. No API key reuse across users.',
      competitor:
        'User uploads exchange API keys to 3Commas; bots execute on those keys. Industry-standard whitelisting and IP restrictions are recommended in their docs.',
      ref: 2,
    },
    {
      axis: 'Signal audit before execution',
      bottomup:
        'Every signal scored 0–100 across 225 inputs (publisher pattern, order-book depth, funding, news sentiment, time-of-day liquidity). Below threshold → blocked + logged.',
      competitor:
        'Bots execute their configured logic without a third-party audit step. Risk control is whatever the user encoded into the bot itself.',
    },
    {
      axis: 'Publisher universe',
      bottomup:
        'Human traders, algorithmic bots, and autonomous AI agents all on the same marketplace, all audited identically.',
      competitor:
        'Public marketplace of bot templates and signal feeds; users can also build their own. Quality is heterogeneous because there is no central audit.',
    },
    {
      axis: 'Pricing',
      bottomup:
        'Free tier (5 audits/day, 20% setup visibility). Monthly $49.99, quarterly $129.99, semi-annual $239.99 — all unlimited audits.',
      competitor:
        'Tiered subscriptions for the platform; published pricing has historically run roughly $14–$99/month plus exchange fees.',
      ref: 3,
    },
    {
      axis: 'Best fit',
      bottomup:
        'Retail traders who want delegation with safety rails. They subscribe to a publisher, set risk caps, and let Foxy AI veto the worst signals.',
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
    'BottomUP treats the retail trader as a delegator: you do not have a strategy, you trust someone (or something) that does, and you want a third-party audit between their decision and your account. The platform exposes the audit, not the primitives. That works well for users who do not have time to build a strategy and would rather pay for risk-controlled access to one.',
    'A user who already runs a profitable GRID bot on 3Commas does not need BottomUP. A user who has been losing money copying random Telegram signals does not need 3Commas — they need an audit layer over a curated source. The two products are answers to different questions.',
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
    'Bybit Copy Trading is an exchange-native feature: you sign up to Bybit, browse master traders inside the Bybit app, and copy them on Bybit perpetuals. BottomUP is an exchange-agnostic marketplace where every signal — whether from a human, a bot, or an AI agent — is audited by Foxy AI before it reaches the subscriber wallet. The architectural difference matters more than the user-facing one: a closed-loop exchange product is structurally different from an audit layer that sits between publisher and subscriber.',
  rows: [
    {
      axis: 'Architecture',
      bottomup:
        'Independent marketplace with an audit layer. The subscriber\'s exchange (currently OKX) handles execution; BottomUP handles publisher curation, risk scoring, and signal routing.',
      competitor:
        'Exchange-native feature inside Bybit. Master traders, copiers, and execution all live on the same platform with no third-party audit step.',
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
      axis: 'Signal audit before execution',
      bottomup:
        'Every signal scored 0–100 by Foxy AI across 225 inputs. Signals below threshold are blocked and logged with the contributing factors.',
      competitor:
        'Order routing only. Bybit publishes per-master ROI, win rate, and copier counts but does not interpose a per-signal audit between master and copier.',
    },
    {
      axis: 'Publisher universe',
      bottomup:
        'Humans, algorithmic bots, and autonomous AI agents on the same marketplace, all evaluated identically by the audit layer.',
      competitor:
        'Human master traders only, vetted via Bybit\'s master-trader application and statistics requirements.',
      ref: 2,
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
        'Free tier (5 audits/day, 20% setup visibility). Monthly $49.99 / quarterly $129.99 / semi-annual $239.99 — all unlimited audits.',
      competitor:
        'No subscription fee. Bybit\'s revenue is exchange fees plus a profit-share that the master takes from copiers on profitable trades.',
    },
    {
      axis: 'Transparency layer',
      bottomup:
        'Every blocked signal is shown to the user with the specific risk factors that triggered the block — publisher pattern, news sentiment, liquidity, etc.',
      competitor:
        'Master profile pages disclose ROI, drawdown, and copier counts. Per-trade rationale is the master\'s discretion to share.',
    },
    {
      axis: 'Best fit',
      bottomup:
        'Retail traders who want signal-level risk control and the option to copy AI agents and bots alongside humans.',
      competitor:
        'Retail traders who already use Bybit and prefer the simplicity of a single platform with no third-party audit overhead.',
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
    'Bybit Copy Trading is the simplest possible copy-trading product: same platform, same wallet, same UI, no third-party integration. The trade-off is structural — there is no audit between the master\'s click and the copier\'s execution. If the master revenge-trades at 03:00 GMT, every copier takes the same trade at the same leverage. The platform handles execution; risk control is the master\'s discipline.',
    'BottomUP exists because that trade-off is not free. Every retail copy-trading platform that has launched in the last 14 years has been a faithful mirror without an audit step. The most predictable failure mode in the data — revenge trades, leverage drift, mid-month strategy abandonment — is something a mirror cannot catch but an audit layer can.',
    'A retail trader who is already on Bybit, has a master they trust, and is comfortable with mirror-only execution gets a clean product from Bybit. A retail trader who wants the audit layer described above, exchange optionality, and the ability to copy AI agents alongside humans is making a different choice — and that is the architectural gap BottomUP is built around.',
  ],
};

export const COMPARISONS: Comparison[] = [ETORO, THREECOMMAS, BYBIT];

export const COMPARISON_BY_SLUG: Record<string, Comparison> = Object.fromEntries(
  COMPARISONS.map((c) => [c.slug, c]),
);
