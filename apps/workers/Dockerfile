FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.33.1 --activate
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/db/package.json packages/db/
COPY packages/config/package.json packages/config/
COPY packages/events/package.json packages/events/
COPY apps/workers/package.json apps/workers/
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /repo /repo
COPY . .
RUN pnpm --filter @bottomup/db db:generate
RUN pnpm --filter @bottomup/workers build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/workers/dist ./dist
COPY --from=build /repo/apps/workers/package.json ./
COPY --from=build /repo/packages ./packages
CMD ["node", "dist/main.js"]
