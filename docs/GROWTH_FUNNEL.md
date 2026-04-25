# Growth — Pirate Funnel (AAARRR)

> **Owner:** Growth + Marketing
> **Last updated:** 2026-04-26
> **Status:** Awareness aktif çalışılıyor; Acquisition + sonrası planlama aşamasında

## Pirate Funnel nedir?

Dave McClure'ün AAARRR modeli — startup growth'unu 6 ardışık aşamaya böler. Her aşamanın kendi metrikleri ve kendi taktikleri var. Bir aşama olgunlaşmadan bir sonrakine yatırım yapmak para yakar.

| Aşama | Tanım | BottomUP için soru | Ana metrik |
|---|---|---|---|
| **A**wareness | Hedef kitle var olduğumuzu öğrenir | Kripto trader "auto copy trading" arayınca bizi bulur mu? | Impressions, branded search hacmi |
| **A**cquisition | Ziyaretçi kaydolur veya app indirir | bottomup.app trafiğinin yüzde kaçı sign-up'a dönüyor? | CAC, signup conversion rate |
| **A**ctivation | İlk "aha moment" — değer deneyimi | Yeni user ilk Foxy AI audit'ini deneyimleyebiliyor mu? | Time-to-first-value, activation rate |
| **R**etention | Kullanıcı geri gelir | DAU/MAU oranı, 30-gün cohort retention | DAU/MAU, churn |
| **R**evenue | Para öder | Free → Monthly/Quarterly/Semi-annual conversion | LTV, ARPU |
| **R**eferral | Başkalarını getirir | Mevcut user organic olarak tavsiye ediyor mu? | K-factor, viral coefficient |

**Şu an nerede olduğumuzu netleştirelim:** Awareness foundation'ı yeni kuruldu (Nisan 2026). Acquisition'a geçmek için 1-2 ay erken — önce awareness'in "discoverable olduk" → "biliniyoruz" dönüşümü olmalı.

---

# 1. Awareness

## Tanım

Hedef kitle (retail kripto trader, AI agent meraklısı, kopya-ticaret arayan) bir problemle karşılaştığında BottomUP'un var olduğunu öğreniyor. **"Discoverable" değil, "known".** Bu fark kritik — site search engine'lerce indekslenmiş olabilir ama kimse bilmiyorsa awareness yok.

## Kanal stratejisi

Awareness 4 kanaldan akar:

1. **Organic search** — Google + Bing
2. **LLM önerisi** — ChatGPT, Claude, Perplexity, Gemini, Copilot
3. **Social previews** — Twitter, LinkedIn, Slack, iMessage paylaşımları
4. **3rd-party citations** — basın, podcast, GitHub, directory listings

## Yapılanlar (2026-04-25 → 2026-04-26)

### 1.1 Search engine altyapısı

| Asset | URL | Durum |
|---|---|---|
| Sitemap (16 URL) | bottomup.app/sitemap.xml | Live |
| Robots.txt | bottomup.app/robots.txt | Live, /account ve /api disallow |
| 10 dilde hreflang alternates | en/tr/es/pt/ru/vi/id/zh/ko/ar | Sitemap'te |
| Google Search Console | property: bottomup.app | Verified, sitemap submitted (2026-04-25) |
| Bing Webmaster Tools | bottomup.app | Verified, sitemap Processing |
| GSC URL Inspection — manuel indexing requests | 2/6 done | 4 kalan: ai-portfolio-management-crypto, crypto-trading-bots-vs-copy-trading, tradfi-ai-agents-explained, foxy-ai-risk-firewall-how-it-works |

### 1.2 Content

| Tip | URL | Hedef keyword cluster | Kelime |
|---|---|---|---|
| Long-form article | /blog/what-is-auto-copy-trading | auto copy trading, copy trading risks | ~1500 |
| Long-form article | /blog/ai-portfolio-management-crypto | AI portfolio management, AI trading agents | ~1900 |
| Long-form article | /blog/crypto-trading-bots-vs-copy-trading | trading bot vs copy trading | ~1700 |
| Long-form article | /blog/tradfi-ai-agents-explained | TradFi AI agents, AI broker | ~1800 |
| Long-form article | /blog/foxy-ai-risk-firewall-how-it-works | AI risk firewall, copy trading safety | ~1800 |
| Blog index | /blog | — | — |
| Press kit | /press | — | — |

Tüm article'lar internal cross-linked, NPOV-toned, dipnot disclaimer'lı. Article + BreadcrumbList JSON-LD per post.

### 1.3 Structured data (entity binding)

| Schema | Implementation | Hedef |
|---|---|---|
| Organization | site-wide JSON-LD, `bottomup.app/#organization` | Knowledge Panel anchor |
| SoftwareApplication | site-wide, with `offers`, `featureList`, `audience` | App rich result |
| WebSite | site-wide, with `publisher` linked to Organization | Search box rich result |
| FAQPage | localized per language, drives FAQ rich results | SERP FAQ snippets |
| BreadcrumbList | per blog post + landing | Breadcrumb rich result |
| Article | per blog post, linked to Organization @id | Article rich result, "first-party content" signal |
| Wikidata sameAs | `wikidata.org/wiki/Q139559065` JSON-LD'de | Cross-source entity binding |

### 1.4 LLM discoverability

| Asset | URL | Hedef LLM kanalı |
|---|---|---|
| `/llms-full.txt` | bottomup.app/llms-full.txt | ChatGPT search, Perplexity, Claude (browse), Gemini |
| `/llms.txt` | bottomup.app/llms.txt | Aynı, kısa overview |
| `knowsAbout` array (14 topic) | JSON-LD Organization | LLM topical authority binding |

### 1.5 Wikidata entity

| Field | Value |
|---|---|
| Q-ID | Q139559065 |
| URL | https://www.wikidata.org/wiki/Q139559065 |
| Statements | P31 (instance of) → business; P856 (official website) → bottomup.app; P17 (country) → United States; P571 (inception) → 2024; P3861 (App Store ID) → 1661474993; P2002 (X username) → bottomupsocial |
| Aliases | BottomUP Inc., BottomUP, Inc., bottomup.app, BottomUP - Sofi Trade Finance |
| Cross-link | Site JSON-LD → Q139559065 (loop closed) |

**Etki:** Wikidata Knowledge Graph + Bing Entity Card + LLM canonical-answer kaynağı için temel anchor.

### 1.6 Social preview

| Asset | Status |
|---|---|
| `/opengraph-image` (1200×630) | Auto-generated, Node runtime, Satori-compatible |
| Per blog post `og:image` + `twitter:image` | Inheriting from `/opengraph-image` |
| OG meta on landing | type=website, locale=en_US, siteName=BottomUP |
| Twitter Card | summary_large_image, @bottomupsocial |

### 1.7 External entity surfaces

| Platform | URL | Durum |
|---|---|---|
| GitHub org page | github.com/bottomupapp | Public README live |
| iOS App Store | id1661474993 | Live, "BottomUP — Sofi Trade Finance" |
| Google Play | com.bottomup.bottomupapp | Live |
| X (Twitter) | @bottomupsocial | Active |
| LinkedIn company | bottomupsocial | Active |
| Telegram | t.me/BottomUPcommunity | Active |
| Wikidata | Q139559065 | Live, 6 statements |

### 1.8 Analytics ölçüm altyapısı

| Tool | Durum | Notlar |
|---|---|---|
| GA4 web stream | G-6FDLVF680B | Enhanced Measurement ON (page views, scrolls, outbound clicks, file downloads, video, form interactions) |
| GTM container | GTM-NDFHZ6V4 (workspace "bupcore.ai/", Version 2 published) | GA4 base tag firing on Initialization - All Pages |
| Search Console | bottomup.app | Sitemap resubmitted 2026-04-25 |
| Bing Webmaster | bottomup.app | Verified |

### 1.9 Press / PR altyapısı

| Asset | URL | Hedef kullanım |
|---|---|---|
| Press kit page | bottomup.app/press | Tier-1 PR pitching pre-req |
| Boilerplate (NPOV) | /press → "Official boilerplate" | Press release / pitch email'de paste |
| 7 logo varyantı | /press → "Logos" | Journalist self-serve |
| 8 key stat | /press → "Key facts" | Quote'larda kullanım |
| `press@bottomup.app` mailbox | — | Coverage requests |
| Wikipedia draft | docs/WIKIPEDIA_DRAFT.md (repo) | Sonraki notability adımı için hazır |

## Yapılacaklar (Awareness — pending)

### Marketing/PR

| Task | Owner | Süre | Leverage |
|---|---|---|---|
| Tier-1 press pitching (TechCrunch, CoinDesk, The Block, Decrypt, BeInCrypto) | Marketing/PR | 2-4 hafta | YÜKSEK — DA80+ link |
| HARO / Qwoted abonelik + günlük response | Servet | Günlük 30 dk | ORTA |
| Podcast tour (Bankless, Unchained, smaller crypto pods) | Marketing | 2-3 ay | ORTA |
| Crypto Twitter influencer outreach | Marketing/BD | Sürekli | YÜKSEK (organic + signal) |

### Engineering / Content

| Task | Owner | Süre | Leverage |
|---|---|---|---|
| GSC kalan 4 indexing requests | Deniz | 2-3 dk manuel | DÜŞÜK (one-time) |
| Aylık 2-4 yeni article — content velocity | Engineering + content | Sürekli | YÜKSEK (Google "actively maintained" sinyali) |
| Long-tail keyword research (ahrefs/semrush) | Growth | 1 hafta | YÜKSEK (sonraki article briefing'i besler) |
| Free directory listings (Crunchbase, Product Hunt, BetaList, IndieHackers, AlternativeTo, SaaSHub) | Servet | 2-3 saat | ORTA — 15-20 backlink |
| Custom OG image (designer) | Design | Yarım gün | ORTA — social CTR 2-3x |
| Wikipedia AfC submission (notability bekledikten sonra) | Marketing/PR | 1 hafta | YÜKSEK (DA90+) |
| Trustpilot listing açma + review collection | Customer + Marketing | Sürekli | YÜKSEK (3rd-party trust signal) |

### Marketing tooling

| Task | Owner | Süre | Leverage |
|---|---|---|---|
| GA4 conversion event'leri (Sign up clicked, App Store clicked, Newsletter subscribed) | Eng + Growth | 1-2 saat | YÜKSEK (Acquisition'a hazırlık) |
| Microsoft Clarity heatmap + session recording | Servet | 30 dk | ORTA |

## KPI'lar (Awareness)

3-6 ay'da takip etmemiz gerekenler:

| Metric | Tool | Hedef (3 ay) | Hedef (6 ay) |
|---|---|---|---|
| Branded search hacmi ("BottomUP", "bottomup.app") | GSC Performance | +50% MoM | Tutarlı yukarı |
| /blog impressions | GSC Performance > Pages | İlk impressions 2 hafta içinde | 10K+/ay |
| Indexed pages (Google) | GSC Pages | 20+ | 30+ |
| Indexed pages (Bing) | Bing Webmaster | 20+ | 30+ |
| Knowledge Panel görünümü ("BottomUP" Google search) | Manuel test | Tetiklenmeli | Stabilize |
| Wikidata Q139559065 statement count | wikidata.org | 6+ | 12+ (other editors) |
| OG share CTR | UTM-tagged shares | Baseline ölç | +50% |
| Domain Rating (Ahrefs) | Ahrefs | 5-10 | 15-25 |
| Referring domains | Ahrefs | 10-20 | 50+ |
| LLM canonical answer trigger ("what is BottomUP") | Manuel ChatGPT/Claude/Perplexity test | %50 mention | %90+ mention |

---

# 2. Acquisition (henüz aktif değil — planlama)

## Tanım

Awareness'tan trafik geliyor → ziyaretçi sign-up'a dönüyor / app indiriyor.

## Şu an mevcut kanallar

- **Organic web** → bottomup.app sign-up flow
- **App Store search** → iOS app
- **Google Play search** → Android app
- **Mobile (107K+ organic)** — paid CAC $0 (mevcut başarı)

## Acquisition planı (gelecek)

| Lever | Durum | Beklenen ROI |
|---|---|---|
| Paid Twitter Ads (CT focused) | Henüz başlamadı | TBD — test bütçesi gerekli |
| Google Ads (kopya-ticaret keyword'leri) | Henüz başlamadı | Düşük (CPC yüksek olur, AdWords copy trading restriction var — kontrol gerek) |
| Reddit Ads (/r/CryptoCurrency, /r/Bitcoin) | Henüz başlamadı | Orta |
| Crypto Twitter KOL deal'leri | Henüz başlamadı | Yüksek (organic-feel) |
| Referral program (existing user → new user) | Henüz yok | Yüksek (K-factor multiplier) |
| App Store Optimization (ASO) | Devam ediyor | Orta (zaten 107K organic) |

## KPI hazırlığı

GA4'te şu conversion event'leri tanımlanmalı (Acquisition'a geçmeden önce):
- `sign_up_started`
- `sign_up_completed`
- `app_store_link_clicked`
- `play_store_link_clicked`
- `cta_clicked` (with cta_id parameter)
- `pricing_viewed`

---

# 3. Activation (henüz tasarlanmadı)

## Tanım

Yeni user "aha moment"e ulaşıyor — Foxy AI'nin gerçekten neyi blokladığını ya da bir trader'ı kopyaladığında değer deneyimini ilk kez yaşıyor.

## Sorular (cevaplanması gereken)

- **First-value-time:** Yeni user app'i açtıktan kaç dakika sonra ilk değer deneyimini yaşıyor?
- **Activation event tanımı:** "Activated user" tanımı nedir? (İlk Foxy AI score görmek? İlk trader'ı follow etmek? İlk subscription? İlk gerçek trade?)
- **Drop-off noktaları:** Sign up → app open arası kaç % düşüyor? App open → ilk Foxy AI query arası kaç %?

## Activation iyileştirme tactics (gelecek)

- Onboarding flow audit
- "Aha moment"'i 60 saniyede teslim eden interactive demo
- Sample portfolio göster (sign up'sız)
- Free Foxy AI query allowance tutorial

---

# 4. Retention (mevcut state OK, optimize edilebilir)

## Tanım

User geri geliyor, app'i açmaya devam ediyor.

## Mevcut

- **DAU/MAU 24%** — "decent" eşik (ortalama %15-25 SaaS), hyper-product değil ama solid
- **MAU 18.4K** — büyüyen taban
- **107K+ organic install** — geri gelmeyen tail var

## Sorular

- 30-gün retention ne kadar?
- Hangi feature kullanan user en yüksek retain?
- Push notification opt-in oranı? Open rate?

## Tactics (gelecek)

- Cohort analizi (retention kurtarma için en kritik feature'lar)
- Push notification segmentation (sadece relevant Foxy AI alerts)
- Email drip campaigns (haftalık market context summary, top setups)

---

# 5. Revenue

## Tanım

User para ödüyor — Monthly $49.99, Quarterly $129.99, Semi-annual $239.99.

## Sorular

- Free → Paid conversion rate?
- En çok hangi tier alınıyor?
- Churn rate (subscriber bazında)?
- LTV / CAC ratio?

## Tactics (gelecek)

- Pricing page A/B test
- Annual tier ekleme (locked-in revenue)
- Promo / win-back campaigns
- Usage-based upsell (Foxy AI query limit yaklaşıldığında upgrade prompt)

---

# 6. Referral (henüz yok)

## Tanım

Var olan user yeni user getiriyor.

## Sorular

- Mevcut referral mekanizması var mı? (App'te referral kodu / link?)
- Mevcut user-base'de "advocate" segment kim?

## Tactics (gelecek)

- Referral program: invite link → her iki taraf $10 credit
- "Share your portfolio" social-share flow
- Affiliate program (crypto influencer'lar için commission)
- "Copy trader of the month" leaderboard — virality için

---

## Toplam priority (önümüzdeki 90 gün)

1. **Awareness'i olgunlaştır** — content velocity (aylık 2-4 article), Tier-1 PR pitching, directory listings, KOL outreach
2. **GA4 conversion events ekle** — Acquisition'a geçişin ön-koşulu
3. **Activation funnel mapping** — sign up → first-value flow'unu ölç
4. **İlk paid kampanya pilot** — Twitter Ads $1K test bütçesi, sonuç → scale veya kill

---

## Living document notu

Bu sayfa AAARRR planının tek source-of-truth'u. Her büyük değişiklik (yeni article shipped, paid kampanya başladı, KPI hedef tutturuldu) burada güncellenmeli. Confluence sub-page'ler her aşama için ayrı detay barındırabilir; bu sayfa overview kalır.
