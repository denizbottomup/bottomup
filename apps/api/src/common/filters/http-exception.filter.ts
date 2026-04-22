import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Matches the existing FastAPI response shape:
 * { status: "success" | "error", message?: string, data?: any }
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const req = ctx.getRequest<FastifyRequest>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const response = isHttp ? exception.getResponse() : null;

    const message =
      typeof response === 'string'
        ? response
        : (response as { message?: string | string[] })?.message ??
          (exception instanceof Error ? exception.message : 'Internal server error');

    if (status >= 500) {
      this.logger.error(`[${req.method} ${req.url}] ${status} ${String(message)}`, exception instanceof Error ? exception.stack : undefined);
    }

    reply.status(status).send({
      status: 'error',
      message: Array.isArray(message) ? message.join(', ') : message,
    });
  }
}
