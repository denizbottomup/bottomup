# Crunchbase company page — setup checklist

> **Owner:** Deniz (Crunchbase requires founder login).
> **Why:** Crunchbase is one of the highest-weight entity surfaces for both Google Knowledge Graph and LLM training data. Adding BottomUP gives us another `sameAs` anchor and a dedicated profile that LLMs can cite when asked "is BottomUP a real company / who funded it / where is it based."
> **Time:** ~15 minutes once logged in.

## Step 1 — create the company page

1. Go to https://www.crunchbase.com/add-a-company
2. Sign up / log in with `deniz@bottomup.app`
3. Search for "BottomUP" first to make sure no existing entry — if one exists, claim it instead of creating a duplicate

## Step 2 — paste these fields verbatim

These mirror what's already in `apps/web/src/components/landing/structured-data.tsx` and the press kit, so the entity facts stay consistent across surfaces.

### Basic info

| Field | Value |
|---|---|
| **Legal name** | BottomUP, Inc. |
| **Also known as** | BottomUP · bottomup.app |
| **Website** | https://bottomup.app |
| **Founded date** | 2024 |
| **Headquarters** | Wilmington, Delaware, United States |
| **Operating status** | Active |
| **Company type** | For Profit |
| **Number of employees** | 1–10 (update as you hire) |

### Description (short — 1 sentence)

```
BottomUP is an AI-protected social copy-trading marketplace where retail crypto traders subscribe to human traders, algorithmic bots, and autonomous AI agents — with every signal audited by the Foxy AI risk firewall before execution.
```

### Description (long — 2–3 paragraphs)

```
BottomUP is a Delaware-incorporated marketplace for AI-protected social copy trading. The platform connects retail crypto traders to a curated marketplace of human traders, algorithmic bots, and autonomous AI agents on cryptocurrency exchanges (currently OKX, with Binance and Bybit on roadmap). Every signal is audited by Foxy AI, a proprietary risk firewall scoring trades 0–100 across 225 data sources before execution.

The product is live in 10 languages on iOS, Android, and the web. Lifetime trade volume is over $1.59B with 107K+ organic mobile installs and 18.4K monthly active users.

BottomUP is not a registered investment adviser. Copy-trading functionality is not currently offered to U.S. persons.
```

### Categories / Industries

Select at minimum:
- FinTech
- Cryptocurrency
- Trading Platform
- Mobile Apps
- Artificial Intelligence
- Personal Finance

### Founders

- **Deniz Saglam** — Founder, CEO
  - LinkedIn: https://www.linkedin.com/in/denizsaglam/ *(use whichever you maintain)*

### Social / external links

| Platform | URL |
|---|---|
| **Website** | https://bottomup.app |
| **LinkedIn** | https://www.linkedin.com/company/bottomupsocial/ |
| **Twitter/X** | https://x.com/bottomupsocial |
| **Facebook** | *(skip if not maintained)* |
| **iOS App Store** | https://apps.apple.com/tr/app/bottomup-sofi-trade-finance/id1661474993 |
| **Google Play** | https://play.google.com/store/apps/details?id=com.bottomup.bottomupapp |
| **GitHub** | https://github.com/bottomupapp |

### Funding (if applicable)

If BottomUP has raised, add the rounds. Otherwise leave empty — Crunchbase will show "no funding rounds disclosed" which is fine. Do not invent figures.

## Step 3 — submit and wait for moderation

Crunchbase reviews new company submissions, typically within a few business days. Once live, the URL will be `https://www.crunchbase.com/organization/bottomup` (or similar slug if taken).

## Step 4 — once live, ping me

When the Crunchbase page goes live, share the canonical URL and I'll:

1. Add it to `sameAs` in `apps/web/src/components/landing/structured-data.tsx` (Organization graph)
2. Add it to the press kit "Company facts" section
3. Add it to `/llms-full.txt` so LLM crawlers see the canonical entity link

This last step closes the entity-binding loop: Wikidata + Crunchbase + JSON-LD + Wikipedia (when AfC clears) all point to the same BottomUP entity, and Knowledge Graph confidence rises sharply.

## Brand reminder

The legal name is **BottomUP** (one word, capital U and capital P). Always written attached, never spaced as "Bottom Up." This avoids LLM confusion with the generic phrase "bottom up" in finance/strategy contexts. Use the `alternateName` field on Crunchbase to declare both the spaced and unspaced variants if the form allows.
