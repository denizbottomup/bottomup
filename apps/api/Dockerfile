FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.33.1 --activate
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
# Generate Prisma client (emits packages/db/generated/client)
RUN pnpm --filter @bottomup/db db:generate
# Compile shared packages (emits dist/ — required by consuming apps)
RUN pnpm --filter @bottomup/config --filter @bottomup/events --filter @bottomup/db build
# Compile the api
RUN pnpm --filter @bottomup/api build

# ─── Slim runtime image ──────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/package.json ./
COPY --from=build /repo/packages ./packages
EXPOSE 8000
CMD ["node", "dist/main.js"]
