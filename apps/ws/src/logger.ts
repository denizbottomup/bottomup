import pino, { type Logger, type LoggerOptions } from 'pino';

export const createLogger = (level: string): Logger => {
  const opts: LoggerOptions = { level };
  if (process.env['NODE_ENV'] !== 'production') {
    opts.transport = { target: 'pino-pretty', options: { colorize: true } };
  }
  return pino(opts);
};
