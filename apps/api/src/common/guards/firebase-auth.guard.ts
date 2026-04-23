import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { FirebaseService } from '../../auth/firebase.service.js';
import { AuthService } from '../../auth/auth.service.js';

/**
 * Accepts either:
 *   - Authorization: Bearer <firebase_id_token>  (mobile during initial auth)
 *   - Authorization: Bearer <our_jwt>            (after /auth/login exchange)
 *
 * Matches the hybrid model used by the existing FastAPI backend.
 */
@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private readonly firebase: FirebaseService,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<FastifyRequest & { user?: unknown }>();
    const header = req.headers['authorization'];
    if (!header || typeof header !== 'string') {
      throw new UnauthorizedException('Missing authorization header');
    }
    // Mobile 2.2.1 sends the bare token (`Authorization: <token>`); web
    // sends `Authorization: Bearer <token>`. Accept both — strip the
    // Bearer prefix only when it's present.
    const token = header.startsWith('Bearer ')
      ? header.slice('Bearer '.length).trim()
      : header.trim();
    if (!token) {
      throw new UnauthorizedException('Empty token');
    }

    // Try our JWT first (fast path, no network call)
    const jwtPayload = this.auth.tryVerifyAccessToken(token);
    if (jwtPayload) {
      req.user = { kind: 'jwt', ...jwtPayload };
      return true;
    }

    // Fallback: verify as Firebase ID token
    try {
      const decoded = await this.firebase.verifyIdToken(token);
      req.user = { kind: 'firebase', uid: decoded.uid, email: decoded.email ?? null };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
