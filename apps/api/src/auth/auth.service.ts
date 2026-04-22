import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { apiSchema, loadEnv } from '@bottomup/config';

interface AccessTokenPayload {
  sub: string; // user id
  email?: string;
  role?: string;
  type: 'access';
}

interface RefreshTokenPayload {
  sub: string;
  type: 'refresh';
  jti: string; // session id — matches the existing FastAPI model
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly env = loadEnv(apiSchema);

  constructor(private readonly jwt: JwtService) {}

  signAccessToken(payload: Omit<AccessTokenPayload, 'type'>): string {
    return this.jwt.sign(
      { ...payload, type: 'access' },
      { secret: this.env.JWT_ACCESS_SECRET, expiresIn: this.env.JWT_ACCESS_TTL },
    );
  }

  signRefreshToken(payload: Omit<RefreshTokenPayload, 'type'>): string {
    return this.jwt.sign(
      { ...payload, type: 'refresh' },
      { secret: this.env.JWT_REFRESH_SECRET, expiresIn: this.env.JWT_REFRESH_TTL },
    );
  }

  tryVerifyAccessToken(token: string): AccessTokenPayload | null {
    try {
      const payload = this.jwt.verify<AccessTokenPayload>(token, { secret: this.env.JWT_ACCESS_SECRET });
      return payload.type === 'access' ? payload : null;
    } catch {
      return null;
    }
  }

  tryVerifyRefreshToken(token: string): RefreshTokenPayload | null {
    try {
      const payload = this.jwt.verify<RefreshTokenPayload>(token, { secret: this.env.JWT_REFRESH_SECRET });
      return payload.type === 'refresh' ? payload : null;
    } catch {
      return null;
    }
  }
}
