import { z } from 'zod';

/**
 * Shared env fields that EVERY service needs. Each service extends this with
 * its own requirements in its own module.
 */
const sharedSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
});

export const apiSchema = sharedSchema.extend({
  API_PORT: z.coerce.number().int().positive().default(8000),
  API_CORS_ORIGINS: z.string().default('*'),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(3600),
  JWT_REFRESH_TTL: z.coerce.number().int().positive().default(86400),
  FIREBASE_PROJECT_ID: z.string(),
  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional(),
}).refine(
  (v) => v.FIREBASE_SERVICE_ACCOUNT_PATH || v.FIREBASE_SERVICE_ACCOUNT_JSON,
  { message: 'One of FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON must be set' },
);

export const wsSchema = sharedSchema.extend({
  WS_PORT: z.coerce.number().int().positive().default(8001),
  JWT_ACCESS_SECRET: z.string().min(32),
});

export const workersSchema = sharedSchema.extend({
  WORKERS_CONCURRENCY: z.coerce.number().int().positive().default(5),
});

export type ApiEnv = z.infer<typeof apiSchema>;
export type WsEnv = z.infer<typeof wsSchema>;
export type WorkersEnv = z.infer<typeof workersSchema>;

export function loadEnv<T extends z.ZodTypeAny>(schema: T, source: NodeJS.ProcessEnv = process.env): z.infer<T> {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return parsed.data;
}
