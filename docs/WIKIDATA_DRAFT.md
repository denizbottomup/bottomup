# Wikidata draft — BottomUP

> **Submission notes for Deniz**
>
> Wikidata is a structured knowledge graph (Q/P notation), not prose
> like Wikipedia. The bar for inclusion is **much lower**: an item
> just needs to "exist and be verifiable" with a primary or secondary
> source. Companies with an official website + App Store / Google
> Play listing comfortably clear that bar.
>
> Why this matters: Wikidata items feed Google's Knowledge Panel,
> Bing Knowledge, and many LLMs (Claude, GPT, Gemini, Perplexity)
> use it as a structured-data source for company facts. A Wikidata
> entry is the highest-leverage 30-minute SEO move available.
>
> ## Submit via this form
> https://www.wikidata.org/wiki/Special:NewItem
>
> 1. Sign in (create a Wikidata/Wikimedia account if you don't have
>    one — same as Wikipedia account).
> 2. On the **New item** page, fill the three top fields (Label,
>    Description, Aliases) using the values in section **A** below.
> 3. Click **Create**.
> 4. On the new item page, click **+ add statement** and add each
>    statement from section **B**, one by one.
> 5. For each statement, hit the **add reference** dropdown and add
>    the reference URL listed alongside.
> 6. **Don't worry about getting it perfect** — Wikidata is
>    crowdsourced, other editors will normalize and add fields.
>    Just get the core item created and the basics filled.

---

## A. Core fields

### Label (English)
```
BottomUP
```

### Description (English)
```
American AI-protected social copy-trading marketplace
```

### Description (Turkish)
```
Amerikan yapay zeka korumalı sosyal kopya-ticaret platformu
```

### Aliases (English) — comma-separated
```
BottomUP Inc., BottomUP, Inc., bottomup.app, BottomUP - Sofi Trade Finance
```

### Aliases (Turkish)
```
BottomUP, bottomup.app
```

---

## B. Statements (Property → Value, with reference URL)

| Property | Property name | Value | Reference URL |
|---|---|---|---|
| **P31** | instance of | `business (Q4830453)` | https://bottomup.app |
| **P31** | instance of | `online platform (Q935116)` | https://bottomup.app |
| **P17** | country | `United States of America (Q30)` | https://bottomup.app |
| **P571** | inception | `2024` (year only) | https://bottomup.app |
| **P159** | headquarters location | `Wilmington, Delaware (Q15197)` | https://bottomup.app |
| **P452** | industry | `financial technology (Q193076)` | https://bottomup.app |
| **P452** | industry | `cryptocurrency (Q13479982)` | https://bottomup.app |
| **P856** | official website | `https://bottomup.app` | (no reference needed for own URL) |
| **P1581** | official blog URL | `https://bottomup.app/blog` | https://bottomup.app/blog |
| **P2002** | Twitter username | `bottomupsocial` | https://x.com/bottomupsocial |
| **P4264** | LinkedIn company ID | `bottomupsocial` | https://www.linkedin.com/company/bottomupsocial/ |
| **P5687** | Apple App Store app ID | `1661474993` | https://apps.apple.com/tr/app/bottomup-sofi-trade-finance/id1661474993 |
| **P3418** | Google Play Store app ID | `com.bottomup.bottomupapp` | https://play.google.com/store/apps/details?id=com.bottomup.bottomupapp |
| **P1813** | short name | `BottomUP` | https://bottomup.app |
| **P1448** | official name | `BottomUP, Inc.` | https://bottomup.app |
| **P2397** | YouTube channel ID | (skip if no YT channel) | |
| **P5009** | Crunchbase organization ID | (add later if you create Crunchbase listing) | |

---

## C. After submission

Once the item exists (you'll get a `Q12345678` style ID):

1. **Note the Q-number** somewhere you can find again — Wikipedia
   editors will reference it later when notability builds and a
   Wikipedia article becomes possible.
2. **Add the Wikidata ID to your Schema.org markup** — engineering
   can update `apps/web/src/components/landing/structured-data.tsx`
   to include `"sameAs": ["https://www.wikidata.org/wiki/Q12345678"]`
   in the Organization graph. This closes the entity-resolution loop
   for Google.
3. **Wait 1-2 weeks** — Google's Knowledge Graph picks up new
   Wikidata items on a slow crawl. You'll know it worked when
   "BottomUP" search starts showing a Knowledge Panel.

---

## D. What this unlocks

- **Google Knowledge Panel** for branded search ("BottomUP" → side
  card with logo, description, social links)
- **LLM canonical answer** — when ChatGPT / Perplexity / Claude /
  Gemini are asked "what is BottomUP", they pull from Wikidata as
  one of the highest-trust structured sources.
- **Bing entity card** — Microsoft Knowledge Graph also reads
  Wikidata.
- **Cross-domain entity binding** — Twitter, LinkedIn, App Store,
  Google Play, GitHub all becoming "the same entity" in search
  engines' eyes, instead of separate disconnected pages.

This is the single highest-leverage 30-minute SEO action available
for a new domain. Worth doing today.
