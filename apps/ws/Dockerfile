FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.33.1 --activate
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY packages/config/package.json packages/config/
COPY packages/events/package.json packages/events/
COPY apps/ws/package.json apps/ws/
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /repo /repo
COPY . .
RUN pnpm --filter @bottomup/config --filter @bottomup/events build
RUN pnpm --filter @bottomup/ws build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/ws/dist ./dist
COPY --from=build /repo/apps/ws/package.json ./
COPY --from=build /repo/packages ./packages
EXPOSE 8001
CMD ["node", "dist/main.js"]
