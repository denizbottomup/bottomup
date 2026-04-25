# Lab → Prod promotion

Two Railway services in the `supportive-emotion` project deploy from
this repo:

| Service | Domain(s) | Branch | Auto-deploy on push |
| --- | --- | --- | --- |
| `bottomup-lab` | `bupcore.ai`, `www.bupcore.ai` | **`lab`** | ✅ |
| `bottomup` (prod) | `bottomup.app`, `www.bottomup.app`, `trade.bupcore.ai` | **`release`** | ✅ |

`main` is the working branch — nothing on Railway watches it. Use it
as you would normally.

## Daily flow

1. Work on `main` as usual: edit, commit, push.

2. To preview on **bupcore.ai** (lab), forward `lab` to your latest
   commit on `main`:

   ```sh
   git push origin main:lab
   ```

   Railway picks up the push within a few seconds and deploys to
   bupcore.ai automatically. Build + deploy takes ~2 minutes.

3. Once you're happy with what bupcore.ai is showing and want it on
   **bottomup.app** (prod), do the same with `release`:

   ```sh
   git push origin main:release
   ```

   Same ~2 minute build + deploy, but this one updates bottomup.app.

## What this gives us

- bupcore.ai = lab. Push to `lab` whenever, see it live, iterate.
- bottomup.app = production. Stays at whatever commit `release`
  points to until you explicitly promote.
- Both branches can be force-pushed safely (`-f`); they're auto-managed
  by us, not collaborated branches with their own history.

## Rollback prod

Either:

```sh
git push -f origin <known-good-sha>:release
```

Or in Railway UI: `bottomup` service → Deployments → previous green
deploy → "Redeploy".

## What lives where

- One Next.js codebase under `apps/web/`. Both services build the
  same Dockerfile (`apps/web/Dockerfile`) with identical env vars
  (Firebase, GTM, API base URL, etc.).
- Middleware (`apps/web/src/middleware.ts`) routes by Host header,
  so the same image serves bupcore.ai or bottomup.app correctly
  depending on which custom domain proxies into it on Railway.
- Canonical URLs always point to `bottomup.app` regardless of which
  host served the request — bupcore.ai is the lab alias, not a
  separate SEO entity.

## Service / project IDs

- Project (`supportive-emotion`): `f8767383-0318-4e1c-bbda-1a63e1a2f42e`
- Environment (`production`): `1ce534b8-e7e7-4d2a-9ce7-c285cd666406`
- Service `bottomup` (prod): `e6106fe9-e71e-4f8c-a7e4-ff6f5591b464`
- Service `bottomup-lab`: `fdf5fd45-3c13-442a-9e41-fe76f91745aa`
