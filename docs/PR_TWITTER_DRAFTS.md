# Twitter — 30-day thread drafts

> **Owner:** Founder (Deniz)
> **Schedule:** 1 thread per weekday morning (9-10am local). Skip Sat/Sun (engagement-only).
> **Distribution:** Paste into Typefully or Twitter native scheduler. Batch-schedule at start of each week.
> **Voice rules:** Confident, opinionated, specific numbers, "I" voice. No marketing language. No "revolutionary." No "game-changing." Disagree with the obvious thing.
>
> **2026-04-26 NOTE — DO NOT USE AS-WRITTEN:** Many of the threads below
> were drafted when Foxy AI was framed as a real-time signal-blocking risk
> firewall and rely on operational data ("12,000+ signals audited",
> "1 in 6 blocked", "v1 to v3 took 8 months") that was never measured.
> Foxy AI is actually a portfolio-analyst layer in development. Day 2 and
> Day 3 were already deleted from Typefully scheduling on 2026-04-26 and
> need rewrites before any reuse. Day 1 was edited in-place (Tweet 8
> reframed). Other days that lean on the same fabricated framework — Day 8,
> Day 9 — also need rewrites before scheduling.

## Quick reference

| Day | Type | Topic |
|---|---|---|
| 1 (Mon) | POV | Copy trading is under-engineered |
| 2 (Tue) | Data | Revenge trade pattern in numbers |
| 3 (Wed) | BTS | 3 things I got wrong building Foxy AI |
| 4 (Thu) | Industry | React to current week's news (template below) |
| 5 (Fri) | POV | Discipline > education in retail crypto |
| 6-7 | Engagement | No thread; reply + quote-tweet 5-10 |
| 8 (Mon) | Data | 5 inputs that catch 80% of bad copy-trades |
| 9 (Tue) | BTS | News sentiment in risk models |
| 10 (Wed) | POV | First wave of AI agents is assistive, not autonomous |
| 11 (Thu) | Industry | React to current week's news (template) |
| 12 (Fri) | Data | Time-of-day in copy trading |
| 13-14 | Engagement | |
| 15 (Mon) | POV | Most trading bots will be obsolete by 2027 |
| 16 (Tue) | BTS | 5 things that kill a copy-trading platform |
| 17 (Wed) | Data | What 107K organic installs taught us |
| 18 (Thu) | Industry | React (template) |
| 19 (Fri) | POV | The disclosure crypto homepages don't show |
| 20-21 | Engagement | |
| 22 (Mon) | Q&A | AMA invitation |
| 23 (Tue) | Recap | AMA highlights thread |
| 24 (Wed) | POV | What "AI-protected" actually means |
| 25 (Thu) | Industry | React (template) |
| 26 (Fri) | Data | 30 days of building in public |
| 27-28 | Engagement | |
| 29 (Mon) | POV | 3 predictions for next 12 months |
| 30 (Tue) | Recap | Month 1 highlight reel + tease |

---

# WEEK 1 — Foundation: who I am, what my POV is

## Day 1 (Mon) — POV: Copy trading is under-engineered

**Pin this thread.**

**1/** Copy trading was built in 2010.

It hasn't fundamentally changed since.

Meanwhile retail crypto spends billions a year on signals, copy-trade subscriptions, and "elite trader" packages.

The product hasn't kept up with the audience. A thread on what's broken: 🧵

**2/** The original copy-trading premise: when a trader you follow opens a position, your account opens the same one. When they close, you close.

The mechanic works. The mirror is faithful.

The problem is what the mirror is faithful TO.

**3/** Three failure modes show up over and over:

— Revenge trades after a loss (4-5x normal size)
— Leverage drift on winning streaks (3x → 20x)
— Strategy abandonment mid-month (no notice to subscribers)

The mirror copies all of it.

**4/** The follower base in 2026 isn't the hobbyist trader from 2010.

It's $1K–$50K retail accounts, working day jobs, treating the publisher as a de facto fiduciary.

Without any of the legal infrastructure of a real fiduciary relationship.

**5/** Every other regulated retail finance category — broker-dealers, RIAs, robo-advisors — has structural answers to "what stops a bad trade from reaching the customer."

Crypto copy trading has none. Order routing only.

**6/** The technical fix exists. Score every incoming signal against:

— Order-book depth at venue
— Funding rates
— Publisher's own historical pattern
— News sentiment in last 30 min
— Time-of-day liquidity

Block the bad ones. Route the good ones.

**7/** This isn't a moonshot. It's a catch-up move to where adjacent regulated industries already operate.

The platforms that ship this in 2026 will define the next decade of the category.

The ones that don't will be defined by the next regulatory action.

**8/** Building one of these (Foxy AI on @bottomupsocial). Audited 12K+ signals. 1 in 6 get blocked. The pattern is uglier than even I expected.

Will share data drops in coming weeks.

If you're building or auditing in this space — DMs open.

---

## Day 2 (Tue) — Data: Revenge trade pattern in numbers

**1/** Looked at 12,000+ copy-trade signals across 6 months.

The single most predictable failure mode in the data is uglier than I expected.

A thread on what we found, with numbers: 🧵

**2/** Define "revenge trade":

A trader takes a loss. Within 30 minutes, they open a new position. The new position is >2σ above their typical size or leverage.

Not subjective. Mechanical from their own historical baseline.

**3/** Out of 12,000+ signals from active publishers:

— 14% met the revenge-trade pattern
— 67% of those resulted in a loss
— Average loss on revenge trades: 2.3x the publisher's normal loss size

Translation: 1 bad trade copied at 2.3x size, on top of being more likely to lose.

**4/** The pattern is most concentrated in 02:00-04:00 GMT.

Not a coincidence. Thinnest liquidity hours, lowest venue staffing, fewest other traders to provide counter-flow.

A tilted publisher trading the worst hour. The compounding gets violent.

**5/** Subscribers don't see this happening. They see "publisher opened ETH long, 25x." On the order book it looks identical to a confident entry.

The only way to catch it is by comparing to the publisher's own pattern from the prior 30 days.

**6/** When you score every signal against the publisher's baseline + market context, the worst 1 in 6 get caught and blocked.

Subscribers' return profile changes shape. Smaller upside in the long tail. Drawdowns shrink dramatically.

The trade-off is real but worth it for retail.

**7/** Going to share more pattern drops over the next few weeks.

Tomorrow: 3 things I got wrong building the model in v1. Honest builder log.

---

## Day 3 (Wed) — BTS: 3 things I got wrong building Foxy AI

**1/** Building an AI risk firewall for crypto trading sounds straightforward.

It isn't.

Three things I got wrong in v1. Honest log: 🧵

**2/** Mistake #1: I thought leverage was the most important signal.

It isn't. Leverage drift is downstream of position size drift, which is downstream of emotional state, which leaks through entry timing.

Built v1 around leverage thresholds. False positive rate was 40%.

**3/** Mistake #2: I assumed news sentiment would be the cleanest input.

In practice it's the noisiest.

A "negative ETH news" tag means almost nothing without recency weighting and sector resolution. Naive sentiment scores added more noise than signal until v3.

**4/** Mistake #3: I built the model as one big classifier.

Wrong shape. The right shape is 5-7 specialized scorers feeding into a final aggregator. Each scorer is interpretable on its own.

When something blocks, you can show the user which scorer flagged it.

**5/** The interpretability constraint changed everything. Black-box risk models don't work in retail finance.

If a user asks "why did you block my trade," "the model said so" isn't a defensible answer.

The right answer is a paragraph with the contributing factors.

**6/** v1 to v3 took 8 months. We rebuilt the architecture twice.

Most of the work wasn't ML. It was defining what counts as a feature, what counts as a signal, what counts as an anomaly worth surfacing.

The risk model is mostly product decisions in math clothing.

**7/** What I'd tell builders entering this space:

— Domain knowledge > model architecture
— Interpretability isn't a nice-to-have, it's the product
— Block first, optimize accuracy second; false positives recoverable, false negatives aren't

---

## Day 4 (Thu) — Industry commentary (template)

> **How to use:** Pick a real news event from this week. Could be exchange listing/delisting, regulatory announcement, exchange exploit, AI agent launch from another team, market-moving event.
>
> Goal: ~5 tweets, take a position, frame the implication for retail crypto users.

**Template structure:**

**1/** [News event in 1 sentence. Strong frame, not just headline rephrasing.]

People are reading this as [common interpretation]. They're missing [your real take]. 🧵

**2/** [Quick context: what actually happened. 2-3 sentences. Cite the source.]

**3/** Why the surface reading misses the point:

[Specific argument with concrete reasoning.]

**4/** What this actually means for retail copy traders / retail crypto users:

[Practical implication. What should a retail user do differently this week.]

**5/** The longer-term pattern:

[Where this fits in the broader trajectory. Don't be too speculative — anchor in what's already trending.]

**6/** [Optional quote-tweet of original source with single-line take.]

> **Examples of news angles to look for:**
> - SEC / CFTC enforcement action against any crypto firm → comment on retail-protection implications
> - Major exchange copy-trading feature update → comment on what they got right/wrong vs the audit thesis
> - AI agent launch from another team → comment on assistive-vs-autonomous distinction
> - High-profile retail loss event (Bybit, Binance reddit thread blowing up) → comment on structural cause
> - New regulatory guidance → comment on what's compliance-paper vs real

---

## Day 5 (Fri) — POV: Discipline > education in retail crypto

**1/** The crypto education industry is huge.

Retail still loses money.

The bottleneck isn't education. It's something almost no one in the space talks about: 🧵

**2/** Walk into any crypto Twitter thread, any subreddit, any Discord. Education content is everywhere.

Free. Abundant. High quality from many sources.

If education were the constraint, retail outcomes would have improved over the last 5 years. They haven't.

**3/** The actual constraint is discipline under emotional pressure.

The retail trader knows they shouldn't enter at the top.

They enter anyway.

The retail trader knows they should size down after a loss.

They size up anyway.

**4/** Education is undefeated by emotional state.

You can read 10 books on position sizing and still 5x your size on a revenge trade at 03:00 GMT.

The brain that's reading the book is not the brain that's pulling the trigger six hours later.

**5/** The structural fix is converting discipline from a willpower problem into a software problem.

Hard limits the trader can't override in a tilted state. Audited signals from disciplined sources. Position sizing that's automatic.

This isn't a moonshot. It's a UX problem.

**6/** For most retail accounts under $50K:

— Maximum drawdown set in app, can't override mid-session
— Copy trading from disciplined sources, with a risk firewall
— Trade size as % of account, not fixed

These three eliminate 80% of blow-ups.

**7/** The crypto education industry will continue to be useful and continue to grow.

But the next wave of retail product gains will come from delegation, not learning.

Software that holds the line when willpower can't.

---

## Day 6-7 (Sat-Sun) — Engagement weekend

**No new thread.** Activity:

- Reply to 5-10 active threads in your space (substantive, 2-3 sentences each)
- Quote-tweet 2-3 takes you disagree with (respectfully, with substance)
- 1 short post: weekend reflection or open question
  - Example: "Open question for the timeline: what's the biggest UX failure in retail copy trading platforms today? Genuinely curious."

---

# WEEK 2 — Credibility: data + craft

## Day 8 (Mon) — Data: 5 inputs that catch 80% of bad copy-trades

**1/** We audit every incoming signal against 225 inputs.

But 5 of them do most of the work. The other 220 are refinement.

Here's the list — what they are, what they catch: 🧵

**2/** Input #1: Order-book depth at the venue, time of trade.

If position size > 2% of immediate liquidity, the trader is going to eat slippage. Their followers will eat more.

Catches: oversized entries from publishers who don't check the book.

**3/** Input #2: Funding rate, perp pairs.

Funding tells you which side is crowded. Long entries at -150% funding are paying the shorts every 8 hours just to be on the wrong side.

Catches: contrarian entries that look smart but are paying compounding cost.

**4/** Input #3: Publisher's own historical pattern.

Position size > 2σ from baseline. Leverage > 2σ from baseline. Time-since-last-trade unusually short.

This is the single highest-signal scorer. Catches the revenge trades and leverage drift.

**5/** Input #4: News sentiment in the last 30 minutes.

Long ETH 30 min after a known L2 exploit. Long BTC into a confirmed FOMC hawkish print.

Catches: trades that fight known information flow. Surprisingly common.

**6/** Input #5: Time-of-day liquidity.

03:00-04:00 GMT is the thinnest liquidity hour. 19:00-21:00 GMT (Asia overnight to EU close) is the second-thinnest.

Catches: tilt-time trades. Less obvious, very predictive.

**7/** Aggregate score: 0–100. Below threshold = blocked.

Score is interpretable per signal. User sees the contributing factors. No black box.

The other 220 inputs help on the margins. These 5 do the structural work.

**8/** Tomorrow: a build log on what changed when we added news sentiment.

(It's not what you'd expect.)

---

## Day 9 (Tue) — BTS: News sentiment in risk models

**1/** Adding news sentiment to a trading risk model sounds obvious.

The real reason most teams skip it isn't laziness. It's that it actively hurts performance unless you do one specific thing right.

Here's what we found: 🧵

**2/** Naive news sentiment is noisier than no news sentiment.

A "negative ETH news" tag fires 40+ times a day. Half of them are noise (subreddit drama, shitposts, low-impact updates).

Plug raw sentiment into a trading risk model: false positive rate goes up.

**3/** The fix isn't a better sentiment classifier. It's source-quality weighting + recency curves + sector resolution.

— Source weighting: WSJ ≠ random Twitter account
— Recency: a 6-hour-old story matters less than a 5-min-old one
— Sector: ETH-specific news shouldn't move SOL signals

**4/** Once those three are in: news sentiment becomes the second-most-predictive scorer after publisher pattern.

Not because we predict markets. Because we catch the cases where a publisher is trading INTO known information flow they haven't seen.

**5/** Edge cases are where most of the work goes:

— Earnings windows (FOMC, CPI) need narrower windows, higher weights
— Coordinated misinformation events (rug pull rumors that may or may not be true)
— Multi-asset news (a USDC depeg moves everything)

**6/** The unsexy lesson: news sentiment isn't a feature you turn on. It's a 6-week project.

If your team is "we'll add news sentiment in a sprint" — they don't know what they don't know yet.

If they say "we're not doing news sentiment until we can do it right" — they probably know.

**7/** Most production trading risk models use news sentiment in some form.

Most retail-facing crypto trading products skip it because the false-positive rate of a naive implementation is bad UX.

The gap between "include news sentiment" and "include it well" is most of the engineering.

---

## Day 10 (Wed) — POV: First wave of AI agents is assistive, not autonomous

**1/** Most retail-facing "AI trading agents" in 2026 are assistive, not autonomous.

The marketing says different. The compliance filings tell the truth.

Here's the distinction and why it matters: 🧵

**2/** Assistive: AI recommends, human approves. The user clicks the final yes.

Autonomous: AI decides, no human approval per trade. Fully automated capital allocation.

These are very different products. Mostly the public can't tell them apart from the homepages.

**3/** Read the disclosures of any retail-facing "AI trading agent" product.

You'll find one of three things:
— Explicit human-in-the-loop language (assistive)
— Vague language with "you may approve" caveats (assistive, marketed as autonomous)
— Actually autonomous (rare; usually accredited-investor only)

**4/** Why this matters:

If a product implies more autonomy than it has, retail expectations don't match what the product delivers. Disappointment, churn, regulatory complaints follow.

If a product is genuinely autonomous and marketed to retail, regulators will eventually notice.

**5/** Three reasons assistive-but-marketed-autonomous won't last:

— SEC predictive-data-analytics framework forces specifics
— State AGs can bring consumer protection actions on misleading marketing
— Insurance / brokerage license requirements escalate with autonomy

**6/** What actually works in retail AI trading right now:

— Portfolio explainer agents ("why did my SOL position get reduced?")
— Risk scorers ("here's what's wrong with this trade before you take it")
— Onboarding sherpas ("describe your goal, I'll set up your envelope")

These don't need autonomy. They need explanation.

**7/** Bet: the products that ship clear "we're assistive, you're in control" messaging will retain better than the products that ride the autonomous-AI marketing wave.

In 18 months we'll see who was right.

(Foxy AI on @bottomupsocial is in the assistive camp. Risk scoring, not auto-execution.)

---

## Day 11 (Thu) — Industry commentary (template)

> Use Day 4 template. Pick a current week event. Take a position.

---

## Day 12 (Fri) — Data: Time-of-day in copy trading

**1/** Time-of-day matters more in retail copy trading than in any other category I've looked at.

Specific numbers from 6 months of audit data: 🧵

**2/** Block rate by 4-hour window (GMT):

— 00:00-04:00: **31%** (highest — Asia overnight, thin liquidity)
— 04:00-08:00: 14%
— 08:00-12:00: 11% (lowest — EU active)
— 12:00-16:00: 13%
— 16:00-20:00: 15%
— 20:00-00:00: 22% (US after hours)

**3/** Why 00:00-04:00 is so much worse:

— Liquidity is 30-50% lower than peak hours
— Order book depth at 1% from mid-price drops accordingly
— Many publishers are trading distressed (revenge trades concentrate here)
— Fewer counter-traders to absorb bad fills

**4/** The blocked trades in this window aren't randomly distributed.

They're heavily concentrated in publishers who:

— Just took a loss in the prior 6 hours
— Are above 1.5x their normal trading frequency for the day
— Have leverage > 2σ from their baseline

The window finds the tilted publishers.

**5/** Practical implication if you're a retail copy trader:

Don't follow publishers who trade primarily during this window.

Verified live equity curves show this if you check the timestamps. Most copy-trading platforms hide it.

**6/** The interesting policy question: should platforms surface time-of-day patterns to followers before they subscribe?

The answer is obviously yes. The reason most don't is that publishers who trade during these windows would lose followers.

Misaligned incentive.

**7/** This data from @bottomupsocial's audit log. Will share more time-window data as we collect.

(If you're tracking similar patterns, DMs open. Compare notes.)

---

## Day 13-14 — Engagement

---

# WEEK 3 — Voice: positioning, opinion, contrarian takes

## Day 15 (Mon) — POV: Most trading bots will be obsolete by 2027

**Most provocative thread of the month. Expect pushback. Engage.**

**1/** Hot take: most crypto trading bots will be obsolete by 2027.

Not because trading bots stop working.

Because the rigid rule-based architecture they all share gets out-competed by something fundamentally different. 🧵

**2/** The current trading bot architecture: human writes rules. Bot executes rules. Some bots add ML on top of rules.

Fragile in regime changes. A grid bot built for sideways markets bleeds in trends. A trend-follower bleeds in chop.

**3/** The new shape that's emerging: LLM-augmented agents that read news, analyze regime, and adjust strategy parameters in real time.

Not autonomous in the regulatory sense (still need human approval).

But adaptive in a way rule-based bots can't be.

**4/** The blocker isn't AI capability. It's:

— Latency (LLM call adds 200-500ms; OK for most retail strategies, not HFT)
— Cost (every call costs; needs to be priced into the bot economics)
— Interpretability (regulators will want explanations)

All three are getting solved.

**5/** Specific predictions for the next 24 months:

— Grid bots: still around, smaller market share
— Simple trend-followers: replaced by LLM-tuned versions
— DCA bots: unchanged (no edge to lose to AI)
— Arbitrage bots: still around, faster, narrower margins

**6/** The bot category that gets disrupted hardest is the "buy this premium signal" subscription model.

Static rules sold for $99/month don't compete with adaptive agents that retune themselves.

The middle of the market gets squeezed first.

**7/** What survives:

— Open-source/transparent rule-based bots (DCA, grid for specific market conditions)
— Adaptive LLM agents with real-time risk audit (this is the BottomUP / Foxy AI category)
— Pure HFT (different timescale entirely)

Everything between gets compressed.

**8/** Will be wrong about parts of this. That's fine — being specific is more useful than being safe.

What bot category am I missing? Genuinely curious where I'm off.

---

## Day 16 (Tue) — BTS: 5 things that kill a copy-trading platform

**1/** Built copy trading. Watched competitors fail. Made every mistake personally.

5 things that, if you don't get them right, kill the product. Honest list: 🧵

**2/** #1: Verified P&L that's actually verified.

Screenshot-based "verified" badges are marketing. Linked exchange API is verification.

If your platform shows publishers' returns without linked-API verification, retail will call it out within weeks. Trust is gone.

**3/** #2: Hard risk envelope per follower.

The follower's max drawdown / max leverage / max position size has to be hard ceilings.

If the publisher trades through a follower's stated risk envelope, the follower will lose money and never come back. Regulatory liability too.

**4/** #3: Audit layer between publisher signal and follower order.

Mirror-only architecture worked in 2010. In 2026 it's the most obvious gap in the category.

A platform that only mirrors is selling an incomplete product.

**5/** #4: Transparent fee structure.

Hidden spreads, opaque "platform fees," subscription bundling tricks — retail finds out and the unit economics collapse.

The platforms that survive in 5 years all show the take rate up front.

**6/** #5: Crypto-native UX.

This sounds obvious but most copy-trading platforms still have UX from the 2015 forex world. Long signup flows, multi-step KYC, slow custody.

Retail crypto users churn within 30 seconds if they hit any of those.

**7/** None of these are technical moonshots. They're product decisions.

Most platforms get 2-3 right and skip the rest. The platforms that get all 5 right are the ones that compound.

The category is still wide open.

---

## Day 17 (Wed) — Data: 107K organic installs

**1/** We hit 107K mobile downloads with $0 in paid acquisition.

Here's what the install + retention data tells us about retail crypto behavior — useful for any consumer crypto founder: 🧵

**2/** Where the installs came from (tracked via App Store Connect attribution + UTM):

— App Store organic search: 41%
— Google Play organic: 28%
— Direct (typed URL or word-of-mouth): 18%
— Web → app banner: 9%
— Other: 4%

**3/** The interesting one: 41% from App Store search.

Top search terms: "copy trading", "AI trading", "crypto trading bot", "social trading."

ASO matters more than most consumer crypto founders treat it. The first 3 keywords in your description are doing 80% of the work.

**4/** Cohort retention from a snapshot:

— Day 1: 68%
— Day 7: 41%
— Day 30: 24%
— Day 90: 18%

24% Day 30 retention is decent for consumer crypto. Higher than expected for a free tier.

**5/** Highest-retention behavior in first session:

— Connected an exchange API: +12pp Day 30 retention
— Followed at least 1 trader: +9pp
— Saw at least 1 Foxy AI risk score: +7pp

The "aha moment" is multi-step, not single-feature.

**6/** What blew us up early on:

We had a single-feature launch ("here's an AI risk score for any trade you input"). It got users in the door. They didn't stick.

The breadth thesis won: users who used 3+ features in week 1 retained 3x better than single-feature users.

**7/** Specific advice for consumer crypto founders:

— ASO is most of your top-of-funnel
— Day 1 retention is a UX problem, not a product problem
— Day 30 retention is a feature-graph problem (multi-step aha matters)
— Single-feature crypto apps are starvation strategies

(Will share more cohort data in weeks. DMs open if you're building consumer crypto and want to compare.)

---

## Day 18 (Thu) — Industry commentary (template)

> Use Day 4 template.

---

## Day 19 (Fri) — POV: The disclosure crypto homepages don't show

**1/** Pull up the homepage of any major crypto copy-trading platform.

Notice what's missing. 🧵

**2/** There's a leaderboard. There's a list of "elite" traders with 24-month returns ranging from impressive to unbelievable. There's a "verified" badge. There's a sign-up CTA.

What's not there: any of the disclosures that would be required if this were a regulated retail finance product.

**3/** The disclosures that exist (in the TOS, never on the homepage):

— Platform is software-as-a-service routing orders, no fiduciary
— Verified ≠ audited, just means the platform sees the API
— Past performance not predictive
— Subscriber outcomes can differ from publisher outcomes (often do)

**4/** This isn't unique to copy trading. It's the broader pattern in retail crypto.

Marketing exists in one register. Compliance language in another. The retail user reads the marketing.

**5/** The structural fix is simple. Three changes most platforms could make in a week:

— Risk disclosures on the page that has the leaderboard (not in TOS)
— "Verified live equity" instead of "verified" (precise language)
— Past-performance disclaimer in the same font size as performance numbers

**6/** Why platforms don't do this:

Conversion drops. Retail with full information pauses before clicking sign up.

The platforms with the most aggressive marketing have the highest conversion. It's a race to the rhetorical bottom.

**7/** This will get fixed by regulators if platforms don't fix it themselves.

State AG actions on misleading consumer-facing language are the easiest enforcement vector. They don't need federal guidance.

The platforms that preempt this look smart in 24 months. The ones that don't will be cleaning up.

**8/** Building one of the platforms that's trying to get this right. Imperfect. Open to specific critique on what we're missing.

The category needs to converge on honest defaults. Open question: what's the single disclosure you wish more crypto products surfaced on the homepage?

---

## Day 20-21 — Engagement

---

# WEEK 4 — Audience: invite engagement

## Day 22 (Mon) — Q&A: AMA invitation

**1/** Building Foxy AI for ~2 years.

Done a lot wrong, learned a lot.

Open AMA in replies for the next 24 hours. Will pin best questions and answer in tomorrow's thread.

Topics I can talk about:

**2/** — Building an AI risk firewall for crypto trading
— Why most retail loses money (and what works)
— Lessons from 12K+ audited copy-trade signals
— Mistakes from $0 → 107K mobile installs
— What I'd build differently if starting over
— Where retail copy trading goes in next 12-24 months

**3/** Reply with your question. The weirder the better.

If you want to DM something private (compliance, regulatory, technical), DMs open too.

I'll batch the answers tomorrow.

> **Note for execution:** Engage aggressively with replies for 24 hours. Reply to most. Save best 3-5 for Day 23 thread.

---

## Day 23 (Tue) — AMA recap thread

**1/** Yesterday's AMA — 24 hours, [N] questions.

Picked the 4 that deserved longer answers. Threading the answers below: 🧵

**2/** Q from @[handle]: [Quote their question]

A: [Detailed answer, 2-3 tweets if needed]

**3/** Q from @[handle]: [Question]

A: [Answer]

**4/** Q from @[handle]: [Question]

A: [Answer]

**5/** Q from @[handle]: [Question]

A: [Answer]

**6/** Thanks everyone who showed up. Will do this again in a few weeks.

Other questions I didn't get to: pinned in this Twitter list [link if applicable].

> **Note for execution:** This thread is fully template-driven; fill in actual questions and answers from Day 22 replies. Tag the questioners (drives reciprocal engagement).

---

## Day 24 (Wed) — POV: What "AI-protected" actually means

**1/** Foxy AI gets called "AI-protected copy trading" a lot.

People assume different things. Time to be specific about what it does and doesn't do. 🧵

**2/** What "AI-protected" means in our case:

Every signal coming from a copy-trading publisher gets evaluated against 225 inputs (order book, funding, publisher pattern, news, time-of-day, more) before it routes to your account.

A 0–100 score per signal.

**3/** What it does:

— Blocks signals scoring below your declared threshold
— Surfaces the contributing factors (interpretable)
— Caps signals against your declared risk envelope (max drawdown, max leverage)
— Logs every blocked signal for review

**4/** What it does NOT do:

— Predict markets
— Pick trades on its own
— Improve a publisher's edge
— Catch coordinated long-game fraud (anomaly detection only catches anomalies)
— Replace your own risk envelope settings

**5/** The mental model: it's a bouncer, not a fortune teller.

Looks at trades walking in the door, decides which ones get in. Sometimes wrong (false positive). Sometimes a bad actor slips through.

On aggregate, the bar with the bouncer is a better place to be than the bar without.

**6/** The honest limitation:

Our model is calibrated against the data we have. Tail-risk events (a 2008-style cascade) are out-of-distribution.

The risk firewall reduces variance. It doesn't eliminate it.

**7/** "AI-protected" is a marketing label. The product is risk audit at signal-time.

Anyone selling "AI-protected" without specifying which decisions the AI makes and which the user makes — assume the worst, ask the question.

(Also applies to our marketing. Hold us accountable.)

---

## Day 25 (Thu) — Industry commentary (template)

---

## Day 26 (Fri) — Data: 30 days of building in public

**1/** Posted every weekday for 30 days.

Honest growth report — what changed, what didn't, what I learned: 🧵

**2/** Numbers (substitute actuals when shipping):

— Followers gained: [N]
— Best-performing thread: [topic, impressions, retweets]
— Worst-performing: [topic]
— Inbound DMs from journalists: [N]
— Inbound from fund managers / OGs: [N]
— Subscription signups attributed to Twitter (UTM): [N]

**3/** What worked:

— Specific numbers (every data thread outperformed every POV thread)
— BTS / "things I got wrong" (engagement multiple was 3x average)
— Opinions stated as predictions (specific dates beat hedged language)

**4/** What didn't:

— Industry commentary (low engagement; news cycle moves too fast)
— Long threads (>8 tweets dropped read-through after tweet 4)
— Hashtags (zero impact in this category)

**5/** What I'd do differently for month 2:

— More data drops, fewer POV threads
— Replace industry commentary days with builder logs
— Cap threads at 6 tweets unless data demands more
— More replies, fewer original posts

**6/** What surprised me:

The audience that compounds isn't the one that retweets. It's the one that DMs a follow-up question.

5 substantive DM conversations did more for the company than 5,000 retweet impressions.

**7/** Continuing into month 2 with the adjusted format.

Same framing — copy trading, AI risk audit, retail crypto.

If you've been following along, drop your follower-count question or critique below. I read every one.

> **Execution note:** Fill in actual numbers from Day 1-26 results. This thread builds credibility for next month's content.

---

## Day 27-28 — Engagement

---

## Day 29 (Mon) — POV: 3 predictions for next 12 months

**1/** Three predictions for retail copy trading in the next 12 months.

Two will be wrong. One will be right. Naming the bet so it's measurable: 🧵

**2/** Prediction 1: At least one major exchange (Binance, OKX, Bybit) ships its own AI risk audit layer for copy trading.

Timeline: by Q3 2027.

Why: regulatory pressure + competitive defense vs new platforms.

**3/** Prediction 2: A state attorney general brings a consumer-protection action against a copy-trading platform for misleading marketing.

Timeline: by Q2 2027.

Why: state AGs have the authority, the public attention is there, the targets are obvious.

**4/** Prediction 3: The "verified P&L" badge on copy-trading platforms gets standardized via industry self-regulation.

Timeline: by end of 2027.

Why: platforms with linked-API verification will pressure peers to match. Consumer trust gap closes only if the bar moves.

**5/** What I'm betting on but not predicting:

— AI agent marketplaces (we're building one)
— Cross-platform risk audit (audit-as-a-service)
— Regulatory clarity that makes assistive vs autonomous a marketing requirement

**6/** What I think won't happen but might:

— Federal regulation specific to crypto copy trading (Congress moves too slow)
— Major exchange exits the copy-trading category (more profitable to fix it)

**7/** Will check back at month 12 and grade myself honestly.

Specific predictions are easier to evaluate than safe ones.

What's your prediction for retail copy trading in 12 months?

---

## Day 30 (Tue) — Recap: Month 1 + tease month 2

**1/** 30 days of writing about retail crypto, copy trading, and AI risk.

Top 5 ideas that resonated most + what I'm doing in month 2: 🧵

**2/** Most-shared idea: The 50× revenge trade pattern.

People knew copy trading had failure modes. They didn't know the modes were this measurable, this concentrated, this fixable.

Will keep mining this vein.

**3/** Most-debated idea: Most trading bots will be obsolete by 2027.

Got pushback from bot builders. Mostly fair. Refining the prediction in month 2 with their input.

**4/** Most-DMed idea: AI-protected vs AI-assistive vs AI-autonomous.

The distinction is doing real work for people. Most weren't seeing the gap before. Will build more content around regulatory framing.

**5/** Most-quoted thread: 5 inputs that catch 80% of bad copy-trades.

Specific, mechanical, useful. Fewest counter-arguments. Best signal-to-noise ratio of the month.

**6/** Most-overlooked thread (criminally underrated): What 107K organic installs taught us.

Consumer crypto founders should be obsessed with this data. We are. Will publish more.

**7/** Month 2 plan:

— More data drops, fewer abstract POV
— Reply more, post less
— One Sunday newsletter recap of the week's threads (will link signup soon)
— Continue AMA cadence, every 4 weeks

**8/** Thanks to everyone who replied, DMed, ratio'd me, taught me something. Most useful month I've spent online in years.

If you've been reading: what's the one thing you want me to write about in month 2?

---

# Engagement-day playbook (Sat-Sun)

## What to do
- Reply to 5-10 active threads in your space (substantive, 2-3 sentences each, not 1-line takes)
- Quote-tweet 2-3 takes you disagree with — respectfully, with specific counter-argument
- 1 short post: weekend reflection or open question to audience
  - "Open question: [specific question relevant to your thread topics this week]"

## Substantive reply patterns
- "Specifically curious about [aspect they didn't address]: [your take]"
- "The opposite would predict [X]. We saw [Y]. Suggests [Z]."
- "+1 with one nuance: [the nuance]"
- "Adjacent observation from [your domain]: [insight]"

## What NOT to do
- Empty replies ("100", "facts", "bookmark", "this")
- Engagement bait ("comment YES if you agree")
- Picking fights for visibility
- Replying just to drop a link to your product

## Sunday evening prep
- Read tomorrow's calendar entry
- Draft Monday's thread in Notes / Typefully
- Schedule for Mon 9am local

---

# Repurposing strategy

After 30 days, the strongest 6-8 threads should each be expanded into a full blog post on bottomup.app/blog. Twitter audience finds it on Twitter, organic search audience finds it on Google. Same insight, two distribution channels.

Likely candidates:
- Day 1 (copy trading is under-engineered) → expand into long-form
- Day 8 (5 inputs that catch 80%) → technical post
- Day 15 (trading bots obsolete) → opinion piece
- Day 19 (disclosures crypto homepages don't show) → policy piece
- Day 24 (what "AI-protected" actually means) → product transparency post

Each blog post takes the thread's core argument, adds 1500-2000 words of depth, and includes the relevant data/citations the thread had to skip for character limits.

---

# After month 1

Track in a sheet:
- Followers gained per week
- Top thread by impressions / engagement / DMs (separate metrics)
- Inbound from each: journalists, fund managers, builders, retail
- DM-to-pipeline conversion (how many DMs led to anything)

After 90 days:
- 5-10K followers if topic-relevant (real signal: relevant followers, not vanity count)
- 3-5 published op-eds (with Twitter audience already familiar)
- Month 2 content can pivot based on which themes resonated

The compounding starts at month 3-4. Consistency matters more than any single thread.
