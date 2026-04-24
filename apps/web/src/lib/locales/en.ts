import type { Dict } from './schema';

export const en: Dict = {
  nav: {
    foxy: 'Foxy AI',
    marketplace: 'Marketplace',
    mcp: 'MCP Suite',
    traders: 'Traders',
    pricing: 'Pricing',
    signin: 'Sign in',
    signup: 'Get started free',
  },
  hero: {
    headline_1: 'The App Store of',
    headline_2: 'Smart Money.',
    subtitle:
      'Automated portfolio management that lets anyone mirror elite traders and AI agents via a decentralized marketplace.',
    cta_primary: 'Start free →',
    cta_secondary: 'How Foxy protects you',
    kpi_volume: 'Trade volume',
    kpi_downloads: 'Downloads',
    kpi_mau: 'MAU',
    kpi_trustpilot: 'Trustpilot',
    kpi_volume_sub: 'Lifetime',
    kpi_downloads_sub: '$0 CAC',
    kpi_mau_sub: 'DAU/MAU 24%',
    kpi_trustpilot_sub: 'Excellent',
  },
  partners: {
    exchanges: 'Exchange & ecosystem partners',
    backed_by: 'Backed by',
  },
  intro: {
    label: 'Watch the intro',
    headline_1: '60 seconds on',
    headline_2: 'how BottomUP works.',
  },
  mobile: {
    label: 'In your pocket',
    headline_1: 'Signals, simulations, and',
    headline_2: 'live copy trading',
    headline_3: '— all in the app.',
    body: "Follow the traders you picked, see Foxy's verdict next to every setup, and get pushed the moment something new hits the marketplace. No juggling tabs, no missed alerts.",
    bullet_push: 'Real-time push on every new setup',
    bullet_score: 'Foxy AI risk score on every card',
    bullet_copy: 'One-tap copy trade on connected OKX',
    bullet_sim: 'Portfolio simulator with virtual $10,000',
  },
  ps: {
    label: 'The thesis',
    headline_1: 'Retail trading is broken.',
    headline_2: 'We rebuilt it.',
    subtitle:
      'Automated portfolio management that lets anyone mirror elite traders and AI agents via a decentralized marketplace — audited end-to-end by our proprietary risk firewall.',
    before: 'Before BottomUP',
    with: 'With BottomUP',
    rows: [
      {
        problem_title: 'You copy bad trades',
        problem_body:
          "Your trader revenge-trades with 50x leverage — and so do you. No filter, no second opinion, no stop.",
        solution_title: 'An AI chief of risk',
        solution_body:
          "Foxy AI audits every signal across 225 data sources and blocks trades that don't pass — even if your trader sent them.",
      },
      {
        problem_title: 'Your alpha is scattered',
        problem_body:
          'Top traders live on Telegram. Bot devs on Discord. Signals on three exchanges. You spend more time switching tabs than executing.',
        solution_title: 'One app, every strategy',
        solution_body:
          'Human traders, algo bots, and AI agents all sell in one marketplace. Subscribe with Credits, orders run 24/7 in your wallet.',
      },
      {
        problem_title: 'Siloed markets, siloed you',
        problem_body:
          "Crypto on one app, stocks on another, forex somewhere else. You can't run a cross-asset thesis without five logins.",
        solution_title: 'Multi-asset from one terminal',
        solution_body:
          'Crypto live today. Stocks, forex, and commodities arrive Q1 2027 on the same rails — one account, one portfolio view.',
      },
    ],
  },
  foxy: {
    label: 'Foxy AI · Risk Firewall',
    headline_1: 'Every trade',
    headline_2: 'audited',
    headline_3: 'before it reaches your wallet.',
    subtitle:
      "Foxy is a proprietary AI trained on 225 data sources. When a trader, bot, or agent publishes a signal, Foxy scores it 0–100 against technicals, fundamentals, news, order book depth, and the creator's own risk pattern. If the score is red, the trade is blocked — even if you're subscribed.",
    pillars: [
      { title: 'Audit', body: 'Every incoming signal is intercepted and scored across 225 sources before execution.' },
      { title: 'Block', body: "Trades that breach your risk envelope are stopped at the firewall — not after the loss." },
      { title: 'Optimize', body: 'Entry/exit orders are tuned to reduce slippage and increase net P&L inside your wallet.' },
      { title: 'Simulate', body: 'Build a portfolio, simulate team performance at live prices before committing real capital.' },
    ],
    signal_flow: 'Signal flow',
    trader_node: 'Trader / Bot / AI agent',
    trader_node_sub: 'publishes a signal',
    foxy_node: 'Foxy AI firewall',
    foxy_node_sub: 'scores risk 0–100 · 225 data sources',
    decision_bad: 'Risk > threshold',
    decision_bad_body: 'Blocked ✕',
    decision_ok: 'Risk OK',
    decision_ok_body: 'Optimized ✓',
    wallet_node: 'Your wallet',
    wallet_node_sub: 'execution, only if Foxy approves',
    stat: '✓ Foxy blocked 1,247 risky signals in the last 30 days across the marketplace.',
  },
  mkt: {
    label: 'The marketplace',
    headline_1: 'Three kinds of strategy.',
    headline_2: 'One marketplace.',
    subtitle:
      'Creators open shops. Users subscribe with BottomUP Credits. Strategies execute 24/7 directly in your connected wallet — every order first audited by Foxy.',
    golive: 'Marketplace go-live · May 2026',
    shops: [
      {
        kind: 'Human traders',
        tagline: 'Follow the analysts who put their names on every call.',
        bullets: [
          'Verified P&L curve, win rate, and risk profile',
          'Live published setups with entry / stop / TP',
          'Creator earns 25% of subscription + volume',
        ],
      },
      {
        kind: 'Algorithmic bots',
        tagline: 'Vetted, back-tested strategies running 24/7.',
        bullets: [
          'Strategy source transparent, not a black box',
          'Subscribe once, executes while you sleep',
          'Foxy kills misbehaving bots the moment they drift',
        ],
      },
      {
        kind: 'AI agents',
        tagline: 'Autonomous agents with specialized mandates.',
        bullets: [
          'Alpha scout, rebalancer, hedger, airdrop hunter',
          'New agent types every 2 months',
          'Backed by the MCP Suite for context',
        ],
      },
    ],
    credits_label: 'BottomUP Credits · how the micro-economy works',
    steps: [
      { title: 'Buy Credits', body: 'Credit card or crypto. Credits are the universal currency across every shop.' },
      { title: 'Subscribe to shops', body: 'Pick the traders, bots, or agents you trust. Cancel any time.' },
      { title: 'Foxy audits signals', body: 'Every order is scored 0–100 before it leaves the firewall.' },
      { title: 'Wallet executes', body: 'Approved orders route straight to your connected wallet, 24/7.' },
    ],
  },
  lb: {
    label: 'Live leaderboard',
    headline_1: '$10,000 on day one.',
    headline_2: 'Where are they now?',
    subtitle:
      'Every trader starts the month with a virtual $10,000. Tap a card for the full analytics dashboard — equity curve, R distribution, monthly P&L, coin breakdown.',
    disclaimer:
      'Simulated results. Hypothetical performance has inherent limitations. Past performance is not indicative of future results.',
    cta: 'Browse marketplace →',
    empty: "No closed trades yet this month — check back soon.",
    balance_label: 'Virtual balance',
    from_label: 'from $10,000 this month',
    trades: 'Trades',
    wins: 'Wins',
    win_rate: 'Win rate',
    live: 'Live',
    drawdown: 'Drawdown',
    view_full: 'View full analytics →',
    followers: 'followers',
  },
  mcp: {
    label: 'MCP Suite',
    headline_1: 'Nine',
    headline_2: 'Modular Crypto Processors, working together.',
    subtitle:
      'Each MCP is a specialized AI agent that turns information chaos into actionable insight. They run continuously alongside Foxy — so your trades arrive pre-audited, pre-timed, and pre-matched to your strategy.',
    cards: [
      { title: 'Risk mitigation', body: 'Flags revenge trading, excessive leverage, and unsafe allocation sizes on every trader you follow — in real time.' },
      { title: 'Trade timing', body: 'Watches order-book depth, macro events (FOMC, CPI, ETF news), and historical slippage to recommend the best entry and exit window.' },
      { title: 'Matchmaking', body: 'Profiles your risk appetite and pairs you with compatible trader styles — scalper, momentum, or long-term swing.' },
      { title: 'Token research', body: 'Examines contract health, developer activity, whale wallet behavior, and social surges. Generates investment hypotheses, not raw noise.' },
      { title: 'Launch & airdrop scout', body: 'Monitors new deployments, testnet activity, and Telegram buzz. Alerts you to alpha early and identifies wallets eligible for airdrops.' },
      { title: 'Portfolio rebalancing', body: 'Detects over-exposure and sector correlation risk as markets move. Suggests hedges or rotation before drawdown hits.' },
      { title: 'Regulatory scanning', body: 'Pulls news feeds, exchange policy updates, and regional legal signals. Warns you about compliance risk — delistings, sanctions — before it hurts.' },
      { title: 'Sentiment divergence', body: "Catches hidden alpha when on-chain is bullish but Twitter/Reddit is bearish. Perfect for early positioning before the crowd wakes up." },
      { title: 'Manipulation watchdog', body: 'Tracks influencer wallet activity, promotion timing, and amplification patterns. Flags coordinated pumps and paid viral hype.' },
    ],
  },
  pulse: {
    label: 'Live market context',
    headline_1: 'The same data',
    headline_2: 'Foxy',
    headline_3: 'uses.',
    subtitle:
      'CoinGlass, CoinGecko, and Binance futures feed the Foxy firewall in real time. You see the exact same surface: Fear & Greed, BTC dominance, cross-exchange funding, long/short bias, 24h liquidations, and open interest change.',
    auto: 'Auto-refreshed · 5 min cache',
    fg: 'Fear & Greed Index',
    dom: 'BTC Dominance',
    funding: 'Top funding (abs)',
    liq_24h: '24h liquidations',
    ls: 'Long / Short ratio',
    ls_sub: 'Binance · 1h',
    oi: 'Open interest (24h)',
    no_data: 'No data',
    liq_table: 'Liquidations by coin · last 24h',
    table_coin: 'Coin',
    table_long: 'Long',
    table_short: 'Short',
    table_total: 'Total',
    table_split: 'Long/Short',
  },
  news: {
    label: 'News feed',
    headline_1: 'Crypto news, tagged with',
    headline_2: 'sentiment.',
    subtitle:
      "Every story labelled positive / negative and linked to the coins it moves. Open any item right here — no new tab, no context-switch.",
    no_summary: 'No additional summary available for this article.',
  },
  pr: {
    label: 'Pricing',
    headline_1: 'One blocked bad trade',
    headline_2: 'covers the year.',
    subtitle:
      'Subscriptions unlock the marketplace, Foxy firewall, and the full MCP Suite. Individual shops subscribe via BottomUP Credits — creators earn 25% of revenue they generate.',
    most_popular: 'Most popular',
    billed_monthly: 'Billed monthly, renews',
    billed_upfront: '{total} billed upfront',
    save_17: 'Save 17%',
    save_25: 'Save 25%',
    plans: [
      {
        name: 'Monthly',
        cta: 'Start monthly',
        features: [
          'Full marketplace access — traders, bots, AI agents',
          'Foxy AI firewall on every signal',
          'Live market dashboard (CoinGlass + Binance)',
          'Portfolio simulation against live prices',
          'Community chat · 7 channels',
          'Web + push notifications',
        ],
      },
      {
        name: '3 Months',
        cta: 'Start quarterly',
        features: [
          'Everything in Monthly',
          'OKX copy trading — one-click execution',
          'MCP Suite — all 9 AI agents',
          'Quarterly performance report',
          'Priority support',
        ],
      },
      {
        name: '6 Months',
        cta: 'Start 6 months',
        features: [
          'Everything in Quarterly',
          '$BUP token rewards on trade volume',
          'Early access to TradFi markets (Q1 2027)',
          '1:1 strategy consult',
          'Founders community badge',
        ],
      },
    ],
    footer:
      'All plans billed in USD and auto-renew at the end of each period unless cancelled. Cancel anytime from your account or via your app store. Partial periods are not pro-rated. Not a substitute for investment advice — see the Risk Disclosure. Copy-trading is not offered to U.S. persons.',
  },
  faq: {
    label: 'Frequently asked',
    headline_1: 'Everything investors and',
    headline_2: 'traders',
    headline_3: 'ask us.',
    items: [
      {
        q: 'Is BottomUP financial advice?',
        a: 'No. BottomUP is not a registered investment adviser, broker-dealer, or money services business. Everything on the platform — signals, Foxy AI verdicts, MCP outputs, leaderboard balances — is informational and educational only. Past performance (real or simulated) is not indicative of future results. Every trading decision and every loss is yours alone. See our Risk Disclosure for the full picture.',
      },
      {
        q: 'Is copy trading available to U.S. persons?',
        a: "Not today. The OKX exchange does not serve retail accounts in the United States, so BottomUP can't route live copy-trade orders for U.S. persons. You're welcome to use the social, analytics, and simulation features. When we launch a U.S.-compliant broker integration we'll announce it.",
      },
      {
        q: 'What is BottomUP, in one sentence?',
        a: 'The App Store of smart money — a marketplace where you subscribe to human traders, algorithmic bots, and AI agents, with every signal audited by our proprietary AI firewall before it reaches your wallet.',
      },
      {
        q: 'How is Foxy AI different from regular copy trading?',
        a: "Traditional copy-trading just mirrors whatever the trader (or bot) sends. If they revenge-trade with 50x leverage, so do you. Foxy intercepts every signal, scores it 0–100 across 225 data sources, and blocks the trade at the firewall if risk is too high — even if you subscribed. It's audit, not mirror.",
      },
      {
        q: 'What are MCPs?',
        a: "Modular Crypto Processors — nine specialized AI agents running alongside Foxy: risk mitigation, trade timing, trader matchmaking, token research, airdrop scout, portfolio rebalancing, regulatory scan, sentiment divergence, and influencer manipulation watchdog. Each one turns a different stream of noise into actionable signal.",
      },
      {
        q: 'What can I subscribe to on the marketplace?',
        a: 'Three kinds of shops: human traders publishing live setups, vetted algorithmic bots running 24/7, and autonomous AI agents with specialized mandates (alpha scout, rebalancer, hedger). Credits subscribe you across all three.',
      },
      {
        q: 'How does copy trading on OKX work?',
        a: "Connect your OKX API (Read + Trade only — never Withdraw). When a creator you subscribe to publishes a signal, Foxy audits it, optimizes the entry/exit, and our worker places the same order on your account. You keep full control — revoke the API key at OKX or disconnect from BottomUP any time.",
      },
      {
        q: 'What are BottomUP Credits?',
        a: "The universal currency across the marketplace. Buy with credit card or crypto, use them to subscribe to any shop. Creators earn 25% of credit revenue they generate plus 10% on referrals. The platform takes 30%; the rest funds infrastructure and volume rebates.",
      },
      {
        q: 'Is the $BUP token live?',
        a: 'Not yet. $BUP launches alongside the marketplace in 2026 with trade-to-earn mechanics — utility spans marketplace purchases, back-testing access, full Foxy features, and volume rewards. More info in the pitch deck and whitepaper.',
      },
      {
        q: 'How do I get started today?',
        a: 'Sign up free at bupcore.ai — email, Google, Apple, or phone. Your account syncs with iOS and Android instantly. Browse shops, try Foxy simulation mode to test a strategy, then connect OKX when you want to go live.',
      },
    ],
  },
  final: {
    headline_1: 'Copy smart money.',
    headline_2: 'Let Foxy filter the rest.',
    sub: 'Traders, bots, and AI agents run live on the marketplace right now. Every signal audited. Every trade optimized. Sign up in 30 seconds and start browsing shops.',
    cta_primary: 'Get started free →',
    cta_secondary: 'Sign in',
    disclaimer:
      'Not investment advice. Crypto trading carries a high risk of loss. Copy-trading is not available to U.S. persons.',
  },
  ft: {
    tagline:
      'The App Store of smart money. Elite traders, AI agents, and algorithmic bots — one marketplace, protected by Foxy AI.',
    product: 'Product',
    account: 'Account',
    legal: 'Legal',
    nav_foxy: 'Foxy AI',
    nav_marketplace: 'Marketplace',
    nav_mcp: 'MCP Suite',
    nav_pricing: 'Pricing',
    signup: 'Get started free',
    signin: 'Sign in',
    faq: 'FAQ',
    terms: 'Terms of service',
    privacy: 'Privacy',
    risk: 'Risk disclosure',
    disclosure:
      'BottomUP, Inc. is a Delaware corporation. BottomUP is not a registered investment adviser, broker-dealer, commodity pool operator, commodity trading advisor, or money services business. All content on the Service — including signals, Foxy AI verdicts, and creator strategies — is provided for informational and educational purposes only and is not individualized investment, legal, or tax advice. Past performance, simulated performance, and hypothetical results (including any "$10,000 virtual portfolio" figures) are not indicative of future results. Trading crypto-assets, and in particular using leverage or derivatives, involves a high risk of total loss. Copy-trading functionality is not currently offered to U.S. persons. Residents of OFAC-sanctioned regions are ineligible.',
    copy: '© {year} BottomUP, Inc. · All rights reserved.',
    address: '1209 Orange St, Wilmington, DE 19801, USA',
  },
};
