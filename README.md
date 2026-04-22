# Bottomup 3.0

Mobile backend (v2.2.1 kontrat uyumlu) — TypeScript monorepo.

## Yapı

```
bottomup/
├── apps/
│   ├── api/        NestJS + Fastify + Prisma — REST (api.bottomup.app kontrat uyumlu)
│   ├── ws/         Node + uWebSockets.js — wss://websocket.bottomup.app fan-out
│   └── workers/    BullMQ — feed fetcher, notification sender, setup checker
└── packages/
    ├── db/         Prisma client (live DB introspection)
    ├── events/     Redis pub/sub payload şemaları
    └── config/     Zod ile env doğrulaması
```

## Kurulum

```bash
cd bottomup
pnpm install
cp .env.example .env
# .env'i doldur (DATABASE_URL, REDIS_URL, FIREBASE_*, JWT_*)

# Prisma schema'yı canlı DB'den çek
pnpm db:pull
pnpm db:generate

# Tüm servisleri başlat
pnpm dev
```

## Servis portları

| Servis | Port | Rol |
|---|---|---|
| api | 8000 | REST gateway |
| ws | 8001 | WebSocket fan-out |
| workers | - | Background jobs (no HTTP) |

## Railway deploy

Her servis ayrı Railway service olarak deploy edilir. Monorepo Root Directory:
- `bottomup/apps/api`
- `bottomup/apps/ws`
- `bottomup/apps/workers`

Shared Redis + Postgres (DATABASE_URL, REDIS_URL environment variable olarak).

## İlkeler

- **REST contract** mevcut `api.bottomup.app` ile birebir aynı. Mobile 2.2.1 (build 166) prod'da.
- **Clean boundaries**: api ↔ workers ↔ ws arası sadece Redis pub/sub + Postgres.
- **Strict TS**: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` açık.
