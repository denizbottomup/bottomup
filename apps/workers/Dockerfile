FROM node:22-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable && corepack prepare pnpm@10.33.1 --activate
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY packages/db/package.json packages/db/
COPY packages/config/package.json packages/config/
COPY packages/events/package.json packages/events/
COPY apps/workers/package.json apps/workers/
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /repo /repo
COPY . .
RUN pnpm --filter @bottomup/db db:generate \
  && pnpm --filter @bottomup/config --filter @bottomup/events --filter @bottomup/db build \
  && pnpm --filter @bottomup/workers build

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=build /repo /repo
WORKDIR /repo/apps/workers
CMD ["node", "dist/main.js"]
