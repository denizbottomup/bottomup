# api Dockerfile — Docker build context is shrunk by the repo-root .dockerignore
FROM node:22-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable && corepack prepare pnpm@10.33.1 --activate
WORKDIR /repo

# ─── Install deps ────────────────────────────────────────────────────
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY packages/db/package.json packages/db/
COPY packages/config/package.json packages/config/
COPY packages/events/package.json packages/events/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile

# ─── Build packages then app ─────────────────────────────────────────
FROM base AS build
COPY --from=deps /repo /repo
COPY . .
RUN pnpm --filter @bottomup/db db:generate \
  && pnpm --filter @bottomup/config --filter @bottomup/events --filter @bottomup/db build \
  && pnpm --filter @bottomup/api build

# ─── Runtime (workspace-preserving) ──────────────────────────────────
# Keep the full repo layout so pnpm's node_modules/.pnpm symlinks resolve
# correctly (@bottomup/* point at ../../packages/*/dist which only exist
# in the workspace tree).
FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=build /repo /repo
WORKDIR /repo/apps/api
EXPOSE 8000
CMD ["node", "dist/main.js"]
