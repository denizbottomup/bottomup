import { PrismaClient } from '../generated/client/index.js';

export { PrismaClient, Prisma } from '../generated/client/index.js';
export type * from '../generated/client/index.js';

declare global {
  // eslint-disable-next-line no-var
  var __bottomup_prisma__: PrismaClient | undefined;
}

/**
 * Lazy Prisma client. Reuses a single instance across hot reloads in dev,
 * one connection pool per process in prod.
 */
export function createPrismaClient(opts?: { databaseUrl?: string; logQueries?: boolean }): PrismaClient {
  const logQueries = opts?.logQueries ?? process.env.NODE_ENV !== 'production';
  const log = logQueries ? (['warn', 'error'] as const) : (['error'] as const);
  if (opts?.databaseUrl) {
    return new PrismaClient({ log: [...log], datasources: { db: { url: opts.databaseUrl } } });
  }
  return new PrismaClient({ log: [...log] });
}

export function getPrismaClient(): PrismaClient {
  if (!globalThis.__bottomup_prisma__) {
    globalThis.__bottomup_prisma__ = createPrismaClient();
  }
  return globalThis.__bottomup_prisma__;
}
