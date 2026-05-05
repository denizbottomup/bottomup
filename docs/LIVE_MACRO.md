# Live Macro — server-side capture + simultaneous translation

Live YouTube finans yayınlarını arar, sunucuda yakalar, **kullanıcının dilinde simültane çeviriyi** sayfa içinde panele akıtır. Hiçbir tarayıcı izin penceresi açılmaz.

> **Hot path:** UI [`apps/web/src/app/home/live-macro/page.tsx`](../apps/web/src/app/home/live-macro/page.tsx) · Backend [`apps/api/src/livecast/`](../apps/api/src/livecast/) · Çıktı `bupcore.ai/home/live-macro` (login: Firebase, deniz@bottomup.app gibi).

## Pipeline

```
                                                 ┌─────────────┐
                                                 │ EventSource │  (frontend)
                                                 │   /me/      │
                                                 │  livecast/  │
                                                 │  stream/    │
                                                 │  :videoId   │
                                                 │  ?lang=tr   │
                                                 │  &token=…   │
                                                 └──────┬──────┘
                                                        │ SSE
                                                        ▼
┌─────────────┐    8s wav    ┌─────────────┐    chunk    ┌──────────────────┐
│   yt-dlp    │ ── pipe ──▶ │   ffmpeg    │ ── files ─▶ │ LivestreamCapture │
│  (live mp4  │              │ -ac 1 -ar   │             │     Service       │
│   m3u8)     │              │ 16k -f      │             │ • Whisper transc. │
└─────────────┘              │ segment     │             │ • Claude per-lang │
                             │ -segment_   │             │ • fan-out to all  │
                             │ time 8      │             │   subscribers     │
                             └─────────────┘             └──────────────────┘
```

**Per-`videoId` tek yt-dlp/ffmpeg pair.** N kullanıcı aynı yayını izlerse Whisper maliyeti **kullanıcı sayısından bağımsız** — sadece distinct dil sayısı ek Claude çağrısı yaratır. 30s subscriber yokken yt-dlp/ffmpeg `SIGTERM` + workdir temizlenir. `MAX_STREAMS=6` paralel cap (memory abuse kalkanı).

## Backend endpoint'leri

| Yöntem | Path | Auth | Açıklama |
|---|---|---|---|
| `GET` | `/me/livecast/config` | Bearer (FirebaseAuthGuard) | `{transcribe_enabled, search_enabled, stream_enabled}` flag'leri. UI bootstrap. |
| `GET` | `/me/livecast/search?q=` | Bearer | YT Data API v3 `eventType=live` (key varsa) ya da curated 6 finans kanalı (Fed/ECB/Bloomberg/CNBC/Yahoo/Reuters) fuzzy match. |
| `POST` | `/me/livecast/audio` | Bearer | **Legacy V1.5** browser tab-capture chunk endpoint. V2 frontend artık çağırmıyor; back-compat için duruyor, isteyen başka client'lar yoksa silinebilir. |
| `GET` | **`/me/livecast/stream/:videoId`** | `?token=` query | **V2 SSE.** Server-side capture başlatır (idempotent — aynı videoId varsa join eder), `event: ready` ile bağlantı doğrulanır, sonra her chunk `event: chunk` `data: {ts, original, translated, lang}`. 15 sn'de bir `: ping` heartbeat. Token query param'da çünkü `EventSource` API custom header set edemiyor. |

## Required env (Railway @bottomup/api)

| Key | Nereden | Live Macro için rolü |
|---|---|---|
| `OPENAI_API_KEY` | platform.openai.com | Whisper transcription. Eksikse `/me/livecast/config.transcribe_enabled=false`, UI sarı banner gösterir. |
| `ANTHROPIC_API_KEY` | console.anthropic.com | Claude Haiku 4.5 finance-aware translation. Eksikse `original` döner, `translated` boş kalır. |
| `YOUTUBE_API_KEY` | console.cloud.google.com → YouTube Data API v3 | Real-time live search. Eksikse 6-kanal curated fallback (Bloomberg/CNBC/Fed/ECB/Yahoo/Reuters) çalışır ama `lagarde` gibi sorgular boş döner. |

Set etmek için: Railway → `@bottomup/api` (service ID `52029ddd-f14c-4c58-8c67-953e8c097c39`) → Variables → `+ New Variable` → Save → Deploy butonu çıkar → tıkla. ~2 dk redeploy.

## yt-dlp invariants — değiştirme sebebini bilmeden dokunma

Backend [`livestream-capture.service.ts`](../apps/api/src/livecast/livestream-capture.service.ts) içinde yt-dlp şu argümanlarla çağrılır. Üçü de **production-only sorunlar** çözüyor; lokal Mac'te gerekmiyorlardı, Railway egress'te gerekiyorlar:

```
yt-dlp
  -f bestaudio/best
  --no-warnings --quiet --no-part
  --js-runtimes node:/usr/local/bin/node
  --extractor-args 'youtube:player_client=android,ios,web_safari,mweb'
  -o -
  https://www.youtube.com/watch?v=<id>
```

| Flag | Neden |
|---|---|
| `-f bestaudio/best` | YouTube **live** stream'leri audio-only track göstermiyor; sadece muxed mp4 m3u8 (formatlar 91-96, hep video+audio). `bestaudio` tek başına `Requested format is not available` ile yt-dlp'yi düşürür. `bestaudio/best` fallback ile muxed alır, ffmpeg `-vn` ile video drop eder. |
| `--js-runtimes node:/usr/local/bin/node` | yt-dlp YouTube cipher decode + bot-bypass için JS engine ister. Default `deno`'yu arar; Docker image'da yok. Image'da Node 22 var (corepack stage), oraya yönlendir. Atlama → "No supported JavaScript runtime" warning + bazı formatlar silently miss. |
| `--extractor-args 'youtube:player_client=android,ios,web_safari,mweb'` | Datacenter IP'lerinde (Railway, AWS, GCP) default `web` player_client `Sign in to confirm you're not a bot` döner. Mobile/iOS/Safari client'ları gevşek streaming surface'i veriyor; bot check'i geçer. **Bu flag olmadan prod'da yt-dlp 100% düşer**, lokalde sorun olmaz. |

Eğer ileride bu üçü de yetmiyorsa son çare: `cookies.txt` mount et. Detay alttaki "When this stops working" bölümünde.

## Dockerfile — yt-dlp + ffmpeg kurulumu

[`apps/api/Dockerfile`](../apps/api/Dockerfile) base layer:

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates ffmpeg python3 python3-pip \
  && pip3 install --break-system-packages --no-cache-dir 'yt-dlp>=2025.10.0' \
  && rm -rf /var/lib/apt/lists/* /root/.cache
```

`yt-dlp` apt'tan **çekilmez** çünkü Debian apt yt-dlp'si YouTube extractor break'lerini aylarca beklediği için her ikinci sürümde bozulur. PyPI doğrudan upstream — major upstream fix'ler 24h içinde gelir. `>=2025.10.0` pin'i çok eski sürümleri engeller; üst sınır vermek gerekmez.

## Frontend — kanal seç → SSE → akış

`apps/web/src/app/home/live-macro/page.tsx`:

1. Mount → `GET /me/livecast/config` → `streamReady` state.
2. Kullanıcı kanalı tıklar (`onSelect`) → `selected.video_id` set olur.
3. `useEffect`: `selected.video_id` veya `targetLang` değişince → eski `EventSource` kapatılır, yeni `EventSource(${API}/me/livecast/stream/${id}?lang=${lang}&token=${idToken})` açılır.
4. `event: ready` → `streamState='streaming'`, badge "canlı çeviri" yeşil.
5. `event: chunk` → `setLines(prev => [...prev, parsed])`, panel auto-scroll.
6. `event: error` (yalnızca `readyState === CLOSED` ise) → "Yayın akışı kapandı" mesajı.
7. Unmount / kanal değişimi → `es.close()` → backend `unsubscribe` → 30s sonra yt-dlp kapanır.

Dil değişince re-subscribe: backend translation cache (per-stream `original → {lang → translated}` map) sayesinde yeni dile sub olan kullanıcı recent chunks için ek Whisper çağrısı tetiklemez, sadece Claude per-lang.

## Test (end-to-end)

```bash
# 1. UI test
open https://bupcore.ai/home/live-macro
# → "bloomberg" ara → "Bloomberg Television" seç
# → 8-15 sn sonra Türkçe çeviri panele akar

# 2. Backend SSE direct probe (browser console içinde)
const tok = (await firebase.auth().currentUser.getIdToken());
const es = new EventSource(`https://bottomupapi-production.up.railway.app/me/livecast/stream/iEpJwprxDdk?lang=tr&token=${tok}`);
es.addEventListener('chunk', e => console.log(JSON.parse(e.data)));
```

## When this stops working

YouTube extractor breaks her ay olur. Sıralı troubleshoot:

1. **Symptom: `/me/livecast/stream` SSE açılır ama `event: chunk` hiç gelmez.**
   Sebep en az %95 yt-dlp. Railway @bottomup/api → View logs → filter "yt-dlp". Hata mesajına göre:
   - `Sign in to confirm you're not a bot` → player_client args eksik veya yetmiyor. Daha geniş set: `youtube:player_client=android_creator,android_music,ios_music,web_creator`.
   - `Requested format is not available` → live stream format değişti. `--list-formats` ile manuel inspect, `-f` adapt et.
   - `No supported JavaScript runtime` → Dockerfile yt-dlp upgrade'i Node path'i değiştirmiş olabilir. `which node` kontrol, `--js-runtimes` path'i düzelt.

2. **Symptom: yt-dlp temiz başlar ama ffmpeg `Invalid data found when processing input`.**
   yt-dlp başarısız bir stream döndürüyor (boş stdout) ama yine de exit 0. Genelde upstream live yayını sona ermiştir. UI tarafında subscribe'ı yeniden başlatmak çözer.

3. **Symptom: yt-dlp/ffmpeg çalışıyor ama Whisper 401/429.**
   `OPENAI_API_KEY` rotated/expired veya quota dolmuş. Railway @bottomup/api → Variables → eye icon → değer doğru mu kontrol; gerekirse yeni key.

4. **Son çare — cookies.txt:**
   YouTube Railway IP'sini blokladıysa player_client + js-runtime hâlâ yetmiyor. Cookies çıkarımı:
   ```bash
   # Browser'dan logged-in YouTube cookies'i export et (Chrome eklentisi ile cookies.txt)
   # Railway @bottomup/api → Variables → YOUTUBE_COOKIES_B64 = base64(cookies.txt)
   ```
   Sonra `livestream-capture.service.ts`'de yt-dlp args'a:
   ```
   --cookies /tmp/yt-cookies.txt
   ```
   eklenir; servisin başında env'den `YOUTUBE_COOKIES_B64`'i decode edip `/tmp/yt-cookies.txt`'e yaz. Cookies ~30 gün yaşar, periyodik refresh.

## Cost model

- Whisper: $0.006/dakika. 1 saat aktif yayın → $0.36 / **stream** (kullanıcı sayısından bağımsız).
- Claude Haiku 4.5: $1/MTok input + $5/MTok output. 8s chunk ~50 in/50 out token → ~$0.0003/chunk → ~$0.13/saat / **(stream × dil)**.
- Bloomberg gibi 24/7 kanalı sürekli açık tutarsanız 24h × $0.36 + 24h × $0.13 = ~$12/gün/kanal. `MAX_STREAMS=6` sayesinde worst-case ~$70/gün backend cost.
- Idle 30s timeout sayesinde gerçek maliyet kullanıcı izleme süresine bağlı, `(stream count) × (active minutes)` ile lineer.

## Anti-pattern listesi

- ❌ Whisper'a 1KB altı buffer gönderme (silence/glitch); service `< 2KB` chunk'ları zaten skip ediyor.
- ❌ `--live-from-start` flag'ini geri ekleme — replaying from broadcast start ekstra auth gate açıyor, gerek yok, live edge'i çekiyoruz.
- ❌ Bestaudio'yu kestirme yapıp `-f bestaudio` koyma — live için `bestaudio/best` fallback şart.
- ❌ Translation cache'i agresif boyutlandırma — şu an 200 entry cap, makul. Çok büyütmek RAM şişirir.
- ❌ Subscriber listesini Redis'e taşımak — single-instance fan-out yeterli, multi-instance scale isterseniz tek videoId'yi multiple worker'a yöneltmek zaten worker başına yt-dlp = duplicate Whisper çağrısı = isteğin amacının tam tersi.
