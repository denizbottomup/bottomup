import { loadEnv, wsSchema } from '@bottomup/config';
import { createLogger } from './logger.js';
import { RedisBus } from './redis-bus.js';
import { startGateway } from './gateway.js';

async function main(): Promise<void> {
  const env = loadEnv(wsSchema);
  const log = createLogger(env.LOG_LEVEL);

  const bus = new RedisBus(env.REDIS_URL, log);
  await bus.start();

  // Always listen on WS_PORT (matches Railway's Generate Domain target).
  const gateway = startGateway({ log, port: env.WS_PORT, jwtSecret: env.JWT_ACCESS_SECRET, bus });

  const shutdown = async (signal: string): Promise<void> => {
    log.info({ signal }, 'shutting down');
    await gateway.close();
    await bus.stop();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

void main();
