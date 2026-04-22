// Early diagnostic log — printed before any heavy import so we know the
// container got past Node startup.
// eslint-disable-next-line no-console
console.log(`[boot] pid=${process.pid} node=${process.version} PORT=${process.env['PORT'] ?? '(unset)'}`);

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import { apiSchema, loadEnv } from '@bottomup/config';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';

process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('[boot] uncaughtException', err);
  process.exit(1);
});
process.on('unhandledRejection', (err) => {
  // eslint-disable-next-line no-console
  console.error('[boot] unhandledRejection', err);
  process.exit(1);
});

async function bootstrap(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('[boot] entering bootstrap, loading env');
  const env = loadEnv(apiSchema);
  // eslint-disable-next-line no-console
  console.log(`[boot] env loaded, NODE_ENV=${env.NODE_ENV}, API_PORT=${env.API_PORT}`);

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: { level: env.LOG_LEVEL },
      trustProxy: true,
      genReqId: () => crypto.randomUUID(),
    }),
    { bufferLogs: true },
  );

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: env.API_CORS_ORIGINS === '*' ? true : env.API_CORS_ORIGINS.split(','),
    credentials: true,
    allowedHeaders:
      'Authorization, Content-Type, Accept-Language, token, x-custom-lang, device-id, timezoneid, os-name, os-version, app-version, registration-token',
  });

  app.useGlobalFilters(new HttpExceptionFilter());

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`[api] received ${signal}, shutting down`);
    await app.close();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  // Railway injects PORT at runtime and its proxy expects the service on that
  // port. Fall back to API_PORT for local dev.
  const port = process.env['PORT'] ? Number(process.env['PORT']) : env.API_PORT;
  await app.listen({ port, host: '0.0.0.0' });
  // eslint-disable-next-line no-console
  console.log(`[api] listening on :${port} (${env.NODE_ENV})`);
}

void bootstrap();
