import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

export type AuthedUser =
  | { kind: 'jwt'; sub: string; email?: string; role?: string }
  | { kind: 'firebase'; uid: string; email: string | null };

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthedUser => {
  const req = ctx.switchToHttp().getRequest<FastifyRequest & { user?: AuthedUser }>();
  if (!req.user) {
    throw new Error('CurrentUser used without FirebaseAuthGuard');
  }
  return req.user;
});
