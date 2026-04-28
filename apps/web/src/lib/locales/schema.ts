export interface Dict {
  meta: {
    /** <title> tag content for the landing page in this locale. */
    title: string;
    /** <meta name="description"> for the landing page. ~155 char cap. */
    description: string;
    /** Comma-separated keyword surface for legacy SEO + LLM context. */
    keywords: string;
    /** OG image alt text. */
    og_image_alt: string;
  };
  nav: {
    foxy: string;
    marketplace: string;
    mcp: string;
    traders: string;
    pricing: string;
    signin: string;
    signup: string;
    /**
     * Label of the header CTA shown to authenticated viewers (links
     * to /account). Optional so existing locale files don't break;
     * the nav falls back to "Account" when missing.
     */
    account?: string;
  };
  hero: {
    headline_1: string;
    headline_2: string;
    subtitle: string;
    cta_primary: string;
    cta_secondary: string;
    kpi_volume: string;
    kpi_downloads: string;
    kpi_mau: string;
    kpi_trustpilot: string;
    kpi_volume_sub: string;
    kpi_downloads_sub: string;
    kpi_mau_sub: string;
    kpi_trustpilot_sub: string;
  };
  partners: {
    exchanges: string;
    backed_by: string;
  };
  intro: {
    label: string;
    headline_1: string;
    headline_2: string;
  };
  mobile: {
    label: string;
    headline_1: string;
    headline_2: string;
    headline_3: string;
    body: string;
    bullet_push: string;
    bullet_score: string;
    bullet_copy: string;
  };
  ps: {
    label: string;
    headline_1: string;
    headline_2: string;
    subtitle: string;
    before: string;
    with: string;
    rows: Array<{
      problem_title: string;
      problem_body: string;
      solution_title: string;
      solution_body: string;
    }>;
  };
  foxy: {
    label: string;
    headline_1: string;
    headline_2: string;
    headline_3: string;
    subtitle: string;
    pillars: Array<{ title: string; body: string }>;
    signal_flow: string;
    trader_node: string;
    trader_node_sub: string;
    foxy_node: string;
    foxy_node_sub: string;
    decision_bad: string;
    decision_bad_body: string;
    decision_ok: string;
    decision_ok_body: string;
    wallet_node: string;
    wallet_node_sub: string;
    stat: string;
  };
  mkt: {
    label: string;
    headline_1: string;
    headline_2: string;
    subtitle: string;
    golive: string;
    shops: Array<{ kind: string; tagline: string; bullets: string[] }>;
    credits_label: string;
    steps: Array<{ title: string; body: string }>;
  };
  lb: {
    label: string;
    headline_1: string;
    headline_2: string;
    subtitle: string;
    disclaimer: string;
    cta: string;
    empty: string;
    balance_label: string;
    from_label: string;
    trades: string;
    wins: string;
    win_rate: string;
    live: string;
    drawdown: string;
    view_full: string;
    followers: string;
  };
  mcp: {
    label: string;
    headline_1: string;
    headline_2: string;
    subtitle: string;
    /** "Coming soon" badge text shown next to the section header. */
    coming_soon: string;
    cards: Array<{ title: string; body: string }>;
  };
  pulse: {
    label: string;
    headline_1: string;
    headline_2: string;
    headline_3: string;
    subtitle: string;
    auto: string;
    fg: string;
    dom: string;
    funding: string;
    liq_24h: string;
    ls: string;
    ls_sub: string;
    oi: string;
    no_data: string;
    liq_table: string;
    table_coin: string;
    table_long: string;
    table_short: string;
    table_total: string;
    table_split: string;
  };
  whales: {
    label: string;
    headline_1: string;
    headline_2: string;
    subtitle: string;
    /** Pill shown on the section header noting the $1M+ filter. */
    threshold: string;
    /** Tab label for the live "alerts" feed. */
    tab_alerts: string;
    /** Tab label for the snapshot of open positions. */
    tab_positions: string;
    /** Column / card label: side ("Long" / "Short"). */
    side_long: string;
    side_short: string;
    /** Card / table label: position size in USD. */
    notional: string;
    /** Card / table label: entry price. */
    entry: string;
    /** Card / table label: liquidation price. */
    liquidation: string;
    /** Card / table label: leverage multiplier. */
    leverage: string;
    /** Card / table label: unrealized PnL. */
    unrealized: string;
    /** Empty-state message when CG doesn't return data right now. */
    empty: string;
    /** Footer credit / source line. */
    source: string;
    /** Just-now relative time. */
    just_now: string;
  };
  news: {
    label: string;
    headline_1: string;
    headline_2: string;
    subtitle: string;
    no_summary: string;
  };
  pr: {
    label: string;
    headline_1: string;
    headline_2: string;
    subtitle: string;
    most_popular: string;
    billed_monthly: string;
    billed_upfront: string;
    save_13: string;
    save_20: string;
    /** Subtext shown under the price for the free tier (e.g. "Forever free"). */
    free_label: string;
    plans: Array<{ name: string; features: string[] }>;
    footer: string;
  };
  faq: {
    label: string;
    headline_1: string;
    headline_2: string;
    headline_3: string;
    items: Array<{ q: string; a: string }>;
  };
  final: {
    headline_1: string;
    headline_2: string;
    sub: string;
    cta_primary: string;
    cta_secondary: string;
    disclaimer: string;
  };
  ft: {
    tagline: string;
    product: string;
    account: string;
    legal: string;
    nav_foxy: string;
    nav_marketplace: string;
    nav_mcp: string;
    nav_pricing: string;
    signup: string;
    signin: string;
    faq: string;
    terms: string;
    privacy: string;
    risk: string;
    disclosure: string;
    copy: string;
    address: string;
  };
}
