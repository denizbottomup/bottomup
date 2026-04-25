# Bylined op-eds — submission-ready drafts

> **Owner:** Marketing (PR / Servet) submits, Founder (Deniz) is bylined
> **Targets:** Mid-tier crypto outlets that accept founder bylines
> **Submit-ready:** Each article below is final draft. Review tone with founder, then send.

## Where to submit (in pitching priority order)

| Outlet | Acceptance bar | Lead time | Notes |
|---|---|---|---|
| **Hackernoon** | Low (community contributor program) | 1-2 weeks | Largest founder-byline outlet, decent SEO juice. Fastest first publication. |
| **Cointelegraph — Opinion** | Medium (editor review) | 2-4 weeks | Higher-prestige crypto byline. Pitch via opinion@cointelegraph.com |
| **CryptoSlate Op-Ed** | Medium | 2-3 weeks | Loves data-driven pieces |
| **BeInCrypto Contributor Network** | Low-Medium | 1-3 weeks | Apply once, post repeatedly |
| **The Defiant — Guest Post** | Medium-High | 3-6 weeks | DeFi-leaning, high quality bar |
| **Decrypt — Pro Edition** | High (editor pick) | 4-8 weeks | Hard to land cold, worth trying for piece 2 or 3 |
| **DLNews / Blockworks** | High | 4-6 weeks | Try after first 1-2 published elsewhere (warmer reception) |

**Strategy:** Land piece 1 on Hackernoon or BeInCrypto (low bar, builds clip portfolio). Use that as proof when pitching Cointelegraph for piece 2. Use those two when pitching Decrypt or Blockworks for piece 3.

**Submission email format:**

```
Subject: Op-ed pitch: [Article title]

Hi [Editor],

I'm Deniz Saglam, founder of BottomUP — an AI-protected copy-
trading marketplace. I've drafted an opinion piece I think fits
your readership.

[1-sentence pitch — the core POV.]

Word count: [N]. Exclusive to your outlet for [14 days].
Ready to publish, no edits required (happy to take any).

Full draft below. Author bio at the bottom.

Thanks,
Deniz
```

---

# Article 1 — "The 50× Revenge Trade"

**Best-fit outlets:** Hackernoon, BeInCrypto, CryptoSlate
**Word count:** 1,650
**Tone:** Narrative-driven, accessible, ends with structural argument
**Hook:** Hidden failure pattern in copy trading

---

## The 50× revenge trade: what's actually killing retail copy traders

It's 03:00 GMT. A copy-trading publisher you've never met just took a 5×
long position on ETH that got stopped out. They're down for the
day. They're tired. They're angry.

Twelve minutes later, they open a new position: 25× long, four
times their normal size, into the thinnest liquidity hour of the
day.

If you've subscribed to copy them, your account just took the
same trade. And if it goes wrong, you've lost not what they
risked — you've lost what *their tilted reasoning* risked.

This is the structural problem in retail copy trading that
nobody talks about. It's also the most predictable failure mode
in the entire category.

### How copy trading actually fails

The retail copy-trading industry is built on a faithful-mirror
promise: when the trader you copy opens a position, your account
opens the same position. When they close, you close. The
mechanic is reliable, the platforms are battle-tested, and the
order routing works.

The problem is what the mirror is faithful *to*.

Three patterns show up over and over in post-mortems on
/r/CryptoCurrency, on Bybit's own forums, and in the support
inboxes of every major copy-trading platform:

**Revenge trading.** A trader takes a loss. Their next trade is
oversized — sometimes 3×, sometimes 5×. Every subscriber gets
this oversized loss copied 1:1. The reason this is hard to
detect: in the order book, an oversized entry from an angry
trader looks identical to a confident one.

**Leverage drift.** A trader who normally swings 3× starts
trading 20× because last week was a winning streak. Their
absolute returns scale with leverage, so for a while the stats
look impressive. When the inevitable reversion hits, the
drawdown is also leveraged.

**Strategy abandonment.** A momentum trader's edge stops working
because the market regime shifted. They quietly switch to mean-
reversion in the middle of the month without telling
subscribers. Their next 30 days look like randomness, because
they're trading a strategy they haven't validated, on a venue
that doesn't care.

The mirror copies all of it. Faithfully.

### The audit problem

For 14 years, copy-trading platforms have built progressively
better mirrors. eToro launched its core copy-trading product in
2010. ZuluTrade in 2007. Bybit Copy Trading in 2022. Each
generation got faster, more reliable, more global.

What hasn't changed: the layer between the source trader and the
subscriber's account is still empty. There's no audit. There's
no second opinion. The platform's job is order execution, not
risk evaluation.

This was a defensible architectural choice in 2010 when the
alternative — fast, contextual, multi-source signal evaluation —
required infrastructure that didn't exist. It's an indefensible
choice in 2026.

### What an audit layer actually is

An audit layer sits between the publisher's signal and the
subscriber's order. Every incoming trade gets evaluated against
inputs the publisher can't see and can't game:

- **Order-book depth on the venue at the time of entry.** Is the
  position size > 2% of immediate liquidity? That's a slippage
  flag.
- **Funding rates.** Is the publisher entering a long when
  funding is heavily negative? They're paying to be on the
  wrong side.
- **Publisher pattern.** Is this trade > 2σ deviation from the
  publisher's own historical position size, leverage, or hold
  time? That's the revenge-trade fingerprint.
- **News sentiment.** Did anything material happen in the last
  30 minutes that contradicts the position direction?
- **Time-of-day.** Is it a thin-liquidity hour where execution
  costs spike?

The output is a single number per signal — call it a risk score
— compared against the subscriber's risk tolerance. Above the
threshold, the trade routes. Below, it's blocked and logged.

The trader does whatever they were going to do. The subscriber
gets to skip the bad ones.

### Why this matters now

Copy trading was a small category in 2010. By 2026 it's the
fastest-growing segment in retail crypto, with multiple
exchanges turning it into a flagship feature and platforms
adding leaderboards that gamify follower acquisition.

The follower base has changed shape. In 2010, it was hobbyist
traders looking for additional ideas. In 2026, it's
$1,000-$50,000 retail accounts that don't have time to monitor
markets and are functionally relying on the publisher's
discretion as their fiduciary — without any of the legal
infrastructure of a real fiduciary relationship.

In that environment, the absence of an audit layer is a
structural product gap, not a feature trade-off. It's the
difference between a brokerage that does best-execution and a
brokerage that doesn't.

### The five-minute test

Before you subscribe to any copy trader on any platform, ask
the platform three questions:

1. **What's the publisher's max drawdown over the last 12
   months?** If they don't show it or it's > 40%, the publisher
   is either lucky or about to teach you what reversion to the
   mean feels like.
2. **How is the P&L verified?** A linked exchange API is the
   only acceptable answer. Screenshot-based "verified" P&L is
   not verified.
3. **What audit layer sits between their orders and your
   wallet?** "None" is a worse answer than people realize.

If the answers are honest, copy trading can be a meaningful
piece of a retail portfolio. If they're not, treat the
marketplace as entertainment, not allocation.

The 50× revenge trade is happening tonight on someone's
account, somewhere. The only question is whether the platform
catches it.

---

*Deniz Saglam is the founder of BottomUP, an AI-protected
social copy-trading marketplace based in Wilmington, Delaware.
The Foxy AI risk firewall described in this piece is BottomUP's
implementation of an audit layer for retail copy trading.*

---
---

# Article 2 — "What retail trading's AI era actually looks like"

**Best-fit outlets:** Cointelegraph, The Block, Decrypt
**Word count:** 1,750
**Tone:** Industry POV, confident, slightly contrarian
**Hook:** Distinguishing the AI hype from the AI substance in retail trading

---

## What retail trading's AI era actually looks like (and what it doesn't)

The phrase "AI trading" has expanded to cover roughly four
products that share almost nothing structurally:

1. A chatbot that explains a chart.
2. A pattern-matcher that highlights recent setups in a feed.
3. An automated executor that takes preconfigured rules and
   runs them 24/7.
4. An autonomous agent that decides what to trade, when, and
   how much.

The first one is search. The second is content recommendation.
The third is what a "trading bot" was in 2018. Only the fourth
is what most people mean when they say "AI trading agent" — and
it's the one that's hardest to deliver and easiest to overstate.

If you're a retail trader, builder, or investor trying to
understand what's actually shipping in 2026 versus what's
marketing copy, the distinction matters.

### What's working: assistive AI

The category that's quietly, durably succeeding is **AI as the
explanation layer**, not the decision layer.

Retail traders historically had two information sources: a
chart and someone telling them what to do with it. AI is now
becoming a third source — one that can read the chart, the
news, the order book, and the user's own portfolio
simultaneously, and produce a sentence.

Three concrete versions:

- **Portfolio explainer agents.** "Why did my SOL position get
  reduced last week?" Answer: a paragraph that references the
  funding rate spike and the user's declared max drawdown.
- **Risk scorers.** Every signal from a copy-trading source or
  a bot strategy gets evaluated and surfaced with a score and
  a reason. Trader sees the score before the trade fires.
- **Onboarding sherpas.** New users describe their goal in
  plain language ("I want exposure to ETH but capped downside
  at 15%"); the agent translates it into a portfolio
  configuration and risk envelope.

These are working. They retain users. They convert better than
chart-only experiences. They don't require predicting markets,
which is the place AI consistently fails.

### What's still hype: autonomous AI

The autonomous-agent category — software that decides what to
trade, when, how much, with no human approval — is in a
different state.

The honest summary: the products that exist either have a
human in the loop somewhere (which is fine, but the marketing
language usually obscures it), or they operate at hedge-fund
scale and aren't accessible to retail.

The retail-facing "autonomous AI agent" products in 2026 are,
in compliance filings if not in marketing copy, almost always
**assistive**. The user clicks a final approval. The agent
recommends; the human commits.

This isn't a criticism. It's the right design at this stage.
Three reasons:

1. **Regulatory.** The SEC's predictive-data-analytics
   discussion has been going on for three years. Whatever the
   final form, fully autonomous retail-facing trading agents
   are not the configuration regulators are signaling
   permission for.
2. **Trust.** Retail users will not give an AI unsupervised
   spending authority over their account, and they shouldn't.
3. **Engineering.** A useful autonomous agent has to handle
   exchange downtime, partial fills, regime shifts, and tail
   events without doing something stupid. That's a research
   problem, not a product feature.

The agents that work in retail trading are the ones that are
honest about which decisions they make and which they defer.
The agents that get into trouble are the ones whose marketing
implies more autonomy than the actual product delivers.

### What the next 18 months actually look like

Three predictions, with the usual caveat that two are probably
wrong:

**1. The "AI-assisted" / "AI-autonomous" line gets drawn more
clearly by regulators.** Marketing language will have to
specify which side a product is on. This will be uncomfortable
for products currently sitting in the rhetorical middle.

**2. The most successful AI products in retail trading will be
the ones that block trades, not the ones that find trades.**
Risk audit is a smaller market by total capital flow than
alpha-generation, but it's a much larger market by user count
and is structurally easier to build well. Look for "we audited
your signal" to displace "we found you a signal" as the
marketing primary.

**3. The agent-marketplace pattern will dominate over the
agent-as-product pattern.** Trying to be the best AI agent is
hard. Being the platform that hosts other people's AI agents,
audits them, and routes user capital to the audited ones is
easier and creates network effects.

If you squint, this is what App Stores did to mobile software,
ATMs did to banking, and Spotify did to music distribution. The
distribution layer eats the producers.

### What this means for retail traders

Three concrete moves if you're trying to use AI tools in
retail crypto without getting played:

1. **Treat "AI-powered" as a question, not an answer.** If a
   product says it uses AI, ask which decision the AI makes and
   which the human makes. The answer should be specific.
2. **Prefer products that block as much as they suggest.**
   Permission to act is easy to give. Permission to refuse is
   the harder, more valuable one.
3. **Read the disclosures, not the homepage.** The compliance
   language is what's actually true. The marketing is what
   sells.

The AI era of retail trading isn't going to look like
algorithms picking your winners. It's going to look like
software stopping you from losing the wrong way at the wrong
time. The companies that get this distinction right will
compound. The ones that conflate "AI" with "trading edge" will
churn.

---

*Deniz Saglam is the founder of BottomUP, an AI-protected
social copy-trading marketplace. Foxy AI is BottomUP's
risk-audit layer for incoming copy-trade signals.*

---
---

# Article 3 — "The disclosure copy-trading platforms don't put on their homepage"

**Best-fit outlets:** Cointelegraph (Opinion), The Defiant, DLNews
**Word count:** 1,500
**Tone:** Provocative, regulatory-aware, position the company as the credible player
**Hook:** Industry credibility deficit

---

## The disclosure copy-trading platforms don't put on their homepage

Pull up the homepage of any of the five largest crypto copy-
trading platforms. Notice what's missing.

There's a leaderboard. There's a list of "elite" traders with
24-month returns ranging from impressive to unbelievable.
There's a "verified" badge somewhere. There's a sign-up CTA.

What's not there: the disclosure that the platform is a
software-as-a-service routing orders through your connected
exchange API; that no one — not the platform, not the
publisher, not the regulator — is acting as your fiduciary;
that the verified badge means "the platform has visibility into
this trader's exchange account," not "the platform has audited
their risk practices"; and that historical performance shown,
even when accurately verified, is not predictive of future
performance and frequently isn't even achievable for a
follower because of position sizing and slippage differences.

That disclosure exists. It's in the Terms of Service. It's
required by basic securities-marketing common sense. It just
isn't on the homepage.

### Why this matters

The retail crypto copy-trading category in 2026 has a
credibility problem it created itself.

The product is genuinely useful. Software-mediated delegation
of trading decisions to disciplined sources is a coherent
financial primitive — and arguably a better one for most retail
accounts than discretionary trading. The category isn't fake.

But the marketing has, almost universally, pushed past what the
product can deliver. "Become a millionaire copying our top
traders." "Make passive income with proven strategies." "Beat
the market with AI-powered signals." Pick any platform, any
quarter, and you'll find some version of these in their ad
creative.

The result is a follower base that comes in with expectations
the product can't meet, hits the structural failure modes
(revenge trades, leverage drift, regime change) that the
platform doesn't insulate them from, and either loses money or
quits. Both are bad outcomes. Both are caused not by the
product itself but by the gap between what the product is and
what the marketing says it is.

### What the regulator's reading

I'd argue retail crypto copy-trading is on a clock with three
regulators simultaneously:

**The SEC**, which has been signaling for two years that
predictive-data-analytics products with conflicts of interest
will get scrutinized; copy-trading platforms collect take rates
on subscriber subscriptions and can be incentivized to surface
publishers who maximize subscription revenue rather than
follower outcomes.

**The CFTC**, which has been less vocal but watches autonomous-
trading products carefully and could classify some copy-trading
products as commodity pools or commodity trading advisors with
licensing obligations the platforms haven't taken on.

**The state attorneys general**, who don't need federal
guidance to bring consumer-protection actions against platforms
that materially mislead retail users with inflated marketing
claims. State AG actions are slower-moving but harder to
defend.

The platforms that survive the next regulatory cycle will
either preempt this — by tightening their marketing, adding
explicit risk disclosures, building audit infrastructure — or
they'll be tightened by enforcement. Preemption is cheaper.

### The structural fix

Three things would meaningfully change the trajectory of this
category:

**1. Homepage-level risk disclosures.** Not buried in TOS. On
the same page as the leaderboard. "Past performance shown is
verified live equity. Past performance is not indicative of
future results. Copy-trading carries risk of total loss."
First sentence under the leaderboard, not the eighth in the
footer.

**2. Audit infrastructure as table stakes.** A platform that
mirrors signals without scoring them against independent risk
inputs is selling an incomplete product. Foxy AI on the
platform I run is one implementation of this; other
implementations are possible. The category needs to converge
on "audited copy trading" being the default, not a feature.

**3. Verified P&L means verified, not screenshot.** Linked
exchange API is the bar. Anything else is marketing.

These aren't moonshot reforms. They're catch-up moves to where
adjacent regulated industries (broker-dealers, RIAs, robo-
advisors) already live. Crypto copy trading is currently
operating with the marketing latitude of unregulated industries
while the products themselves act increasingly like regulated
ones. That gap isn't sustainable.

### What I'd tell a retail user reading this

If you're going to use copy trading — and you should, if your
alternative is discretionary retail trading at $5K-$50K
account size — pick a platform that:

- Shows verified live equity, not screenshots
- Has a hard risk envelope you control, not a soft suggestion
- Audits incoming signals, not just executes them
- Discloses what it does and doesn't do on the homepage, not
  in legal copy

There are platforms that do all four. There are more that
don't. The credibility deficit in the category is a marketing
choice, not a technology constraint.

---

*Deniz Saglam is the founder of BottomUP, a social copy-
trading marketplace based in Wilmington, Delaware. He is not
an attorney; nothing in this article is legal advice. The
regulatory observations are framed from a product-builder's
perspective on industry trajectory.*

---
---

## Submission notes

**Per article:**
- Add 1-line author bio at top (after byline, before article body): "Deniz Saglam is the founder of BottomUP."
- Pull quote candidates marked in body for editor's use
- Have a square-crop headshot ready (1200×1200 minimum, transparent or neutral background)
- BottomUP logo (PNG, transparent) for any "company" mention boxes editors add

**Embargo strategy:**
Article 1 → Hackernoon (publish quickly, build clip portfolio)
Article 2 → Cointelegraph (after Article 1 lands, use as proof of credibility)
Article 3 → Decrypt or DLNews (highest aim, use Articles 1+2 as warm intro)

**Cross-promotion:**
Once published, Twitter thread excerpting key points + linking to outlet (drives outlet traffic, they appreciate it, helps with future pitches).

Add each published article to /press kit page under "Coverage" section as we collect them.

## When to write the next batch

After 60 days, review:
- Which article landed where
- Which angles resonated (engagement, traffic, inbound)
- What's the next logical extension

Plan: 3 new articles every 60-90 days. Topical, current, build on what landed.
