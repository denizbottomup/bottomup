import { createSecretKey } from 'node:crypto';
import { jwtVerify } from 'jose';

export interface WsAuthedUser {
  sub: string;
  email?: string;
  role?: string;
}

/**
 * Verify our JWT using the same secret the API uses. We deliberately do NOT
 * call Firebase here — WS connections are expected to present a JWT issued
 * by /auth/login or /auth/token/refresh.
 *
 * Unauthenticated connections are allowed for public channels (e.g. `spot`,
 * `futures`, `crypto-analytics`). Per-channel auth is enforced at subscribe
 * time in the gateway.
 */
export async function tryVerifyJwt(token: string | null, secret: string): Promise<WsAuthedUser | null> {
  if (!token) return null;
  try {
    const key = createSecretKey(secret, 'utf-8');
    const { payload } = await jwtVerify(token, key);
    if (payload['type'] !== 'access' || typeof payload.sub !== 'string') return null;
    return {
      sub: payload.sub,
      email: typeof payload['email'] === 'string' ? payload['email'] : undefined,
      role: typeof payload['role'] === 'string' ? payload['role'] : undefined,
    };
  } catch {
    return null;
  }
}
