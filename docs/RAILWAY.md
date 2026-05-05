# Railway deploy — supportive-emotion projesi

> **Project ID:** `f8767383-0318-4e1c-bbda-1a63e1a2f42e`
> **Dashboard:** [railway.com/project/f8767383-…](https://railway.com/project/f8767383-0318-4e1c-bbda-1a63e1a2f42e)
> **Account:** Bottomup (`05a4e7cb58c1e647a72317377489cfdd`)

## Servis haritası

| Servis | Service ID | Public domain | Branch | Root | Açıklama |
|---|---|---|---|---|---|
| **`@bottomup/api`** | `52029ddd-f14c-4c58-8c67-953e8c097c39` | `bottomupapi-production.up.railway.app` (port 8000) | `main` | `/` | NestJS + Fastify + Prisma. Tek backend — hem mobile (`api.bottomup.app` üzerinden) hem `bottomup-lab`/`bottomup` web servisleri buraya bağlanır. Live Macro endpoint'leri burada. |
| **`@bottomup/ws`** | — | `bottomupws-production.up.railway.app` (port 8001) | `main` | `/` | uWebSockets.js fan-out gateway. `wss://websocket.bottomup.app` mobile contract. |
| **`@bottomup/workers`** | — | unexposed | `main` | `/` | BullMQ — feed cron, replicator, news translator, notification sender. |
| **`bottomup`** | — | `trade.bupcore.ai` (CNAME → `tjuo31jj.up.railway.app`) | `main` | `apps/web` | Logged-in product surface. `/signin` çalışır, `/dashboard` vb. henüz boş. |
| **`bottomup-lab`** | `fdf5fd45-3c13-442a-9e41-fe76f91745aa` | `bupcore.ai` (apex), `www.bupcore.ai` (DNS waiting) | **`lab`** | `/` | apps/web build'i. Live Macro UI'sini servis eden domain. PORT=3000. |
| **Postgres** | — | private | n/a | n/a | Replicated copy of legacy `85.105.161.240:5432/app` (formerly `umay.bottomup.app`, DNS retired). Workers replicator ile sync. |
| **Redis** | — | `${{Redis.REDIS_URL}}` private | n/a | n/a | BullMQ + WS pub/sub. |

## Branch mapping — kritik dikkat noktası

İki **farklı branch deploy ediyor**:
- `main` branch → `bottomup` (trade) + `@bottomup/api` + `@bottomup/ws` + `@bottomup/workers`
- `lab` branch → `bottomup-lab` (bupcore.ai)

Yani:
- `git push origin lab:main` → Production REST + WS + workers + trade.bupcore.ai güncellenir, **bupcore.ai güncellenmez**.
- `git push origin lab` → Sadece `bottomup-lab` (bupcore.ai) güncellenir.
- Her iki tarafı güncellemek için **iki push lazım**:
  ```bash
  git push origin lab           # bottomup-lab → bupcore.ai
  git push origin lab:main      # api + ws + workers + trade
  ```

Bu yapı nedeniyle "production gibi davranmasın, yenilikler önce orada bişey kıracaksa lab'da kıralım" diye lab/main ayrımı tutuyor; `bupcore.ai` lab kalıyor, `trade.bupcore.ai` (bottomup) main'den deploy oluyor. Bir feature lab → bottomup.app/trade'e taşınırken sadece `lab:main` push ile cross-branch sync olur.

## Deploy sonrası beklemeden test

| Servis | Marker (HTML/HTTP) | Süre |
|---|---|---|
| `@bottomup/api` | `/health` 200 + `uptime` küçük (yeniden başladı) | ~2 dk (cache hit), Dockerfile değişikliği varsa ~5-7 dk (yt-dlp+ffmpeg apt install) |
| `bottomup-lab` (web) | `bupcore.ai/home/live-macro` HTML'inde new-marker grep | ~2-3 dk |
| `bottomup` (web) | `trade.bupcore.ai/signin` HTML değişimi | ~2-3 dk |

Polling örneği (api):
```bash
until [ "$(curl -sS https://bottomupapi-production.up.railway.app/health | jq -r .uptime)" -lt 60000 ]; do sleep 25; done
echo "api restarted"
```

## Servis-spesifik quirks

### `@bottomup/api`

- **PORT:** Variables'da explicit `PORT=8000`. Railway oto-injekte ederse Generate Domain target'ı (8000) ile mismatch olur → 502 + `x-railway-fallback: true`.
- **Dockerfile:** monorepo'nun tamamı runtime stage'e kopyalanır (`COPY --from=build /repo /repo`) çünkü pnpm workspace symlinks (`@bottomup/db` → `packages/db/dist`) sadece full tree ile resolve oluyor. Image ~250MB + ffmpeg/yt-dlp ile ~330MB.
- **Live Macro ek bağımlılıklar:** `ffmpeg` + `python3` + `yt-dlp>=2025.10.0` (PyPI'den, apt'taki sürekli bozuluyor). Detay [LIVE_MACRO.md](LIVE_MACRO.md).
- **Env:** `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `YOUTUBE_API_KEY` Live Macro için kritik. Eksikse UI'da feature flag'le gizlenir (config endpoint döner).

### `bottomup-lab` (Next.js apps/web)

- **PORT:** `3000` (Next.js default). Generate Domain target'ı 3000 olmalı.
- **Domain:** Iki alan — `bupcore.ai` (apex, bağlı) + `www.bupcore.ai` (DNS waiting state, kullanılmıyor; istersen Cloudflare DNS güncelle).
- **Auto deploy:** "Watch paths" kullanılmıyor — repo'da herhangi bir değişiklik tetikler. Sadece `apps/api/*` değişikliği bile lab'i rebuild eder (gereksiz ama zararsız).
- **Build:** Standart Next.js, no special config. `next build` ile prerender + dynamic routes.

### `bottomup` (apps/web, trade.bupcore.ai)

- Aynı `apps/web` kodunu serve ediyor ama **main branch'inden**, custom domain `trade.bupcore.ai`. Apex bupcore.ai'den oraya CF redirect rule var (`bupcore.ai/{login,dashboard,chat,studio,app,admin}` → trade.bupcore.ai).
- Login flow için ayrılmış; `/signin` çalışır, geri kalan route'lar henüz wire'lanmamış (404).

### Postgres

- Replicated copy. Kaynak: legacy `85.105.161.240:5432/app` (eskiden `umay.bottomup.app`, DNS bırakıldı 2026-05-05). TLS self-signed; lokal'den bağlanırken `?sslmode=require` zorunlu. Read-only `report_user` parolası `.env.example`'da pattern olarak duruyor; gerçek değer `.env` (gitignored) ya da Railway env içinde.
- Replicator workers servisinde, `LEGACY_DATABASE_URL` env'i set olunca aktif. Detay [`apps/workers/src/main.ts`](../apps/workers/src/main.ts).

### Redis

- BullMQ workers + WS gateway. Internal-only (`${{Redis.REDIS_URL}}` reference). Public expose etme — replicator job durumu, FCM push queue, vs. iç data.

## Cloudflare zone'lara not

İki ayrı Cloudflare zone:
- **`bottomup.app`** — apex'te apps/web değil; `analyst/*` + `_next/*` Worker proxy ile bottomup-lab'e gider, geri kalan her şey `www.bottomup.app` marketing site'ına 301. Detay `bottomupapp/bupcore` repo'sunda [`cloudflare/`](https://github.com/bottomupapp/bupcore/tree/main/cloudflare).
- **`bupcore.ai`** — apex direkt `bottomup-lab`'e bağlı. `bupcore.ai/{login,dashboard,…}` → `trade.bupcore.ai` redirect'ler bu zone'da; Page Rules veya Bulk Redirect olarak.

## Sıkça yaşanan sorunlar

| Symptom | Sebep | Çözüm |
|---|---|---|
| Push edildi ama deploy görünmüyor | Yanlış branch'e push (lab vs main) | Yukarıdaki branch mapping tablosuna göre `git push origin lab` veya `git push origin lab:main` |
| `x-railway-fallback: true` 404 | PORT mismatch (Generate Domain target ≠ container listen port) | Variables → user-defined `PORT=<doğru-port>` ekle |
| `/health` 200 ama yeni endpoint 404 | Active deploy eski commit | Deployments tab'ında HISTORY üst en yeniyle Active aynı SHA mı kontrol; değilse Redeploy |
| API `503 Livecast transcription is not configured` | `OPENAI_API_KEY` eksik | Variables → ekle → Deploy |
| Yt-dlp `Sign in to confirm you're not a bot` | Datacenter IP bot check | [LIVE_MACRO.md](LIVE_MACRO.md) "When this stops working" bölümü |
