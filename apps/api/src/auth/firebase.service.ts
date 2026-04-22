import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import admin from 'firebase-admin';
import { apiSchema, loadEnv } from '@bottomup/config';

/**
 * Thin wrapper around firebase-admin. Single app instance per process.
 * Credentials resolution:
 *   1. FIREBASE_SERVICE_ACCOUNT_JSON (inline, preferred on Railway)
 *   2. FIREBASE_SERVICE_ACCOUNT_PATH (filesystem, preferred in local dev)
 */
@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private app: admin.app.App | null = null;

  onModuleInit(): void {
    const env = loadEnv(apiSchema);
    try {
      const credential = this.resolveCredential(env);
      this.app = admin.initializeApp(
        { credential, projectId: env.FIREBASE_PROJECT_ID },
        'bottomup-api',
      );
      this.logger.log(`Firebase Admin initialized (project: ${env.FIREBASE_PROJECT_ID})`);
    } catch (err) {
      // Don't fail boot if credentials are stub/missing — let the app come up
      // and fail only if a Firebase-dependent endpoint is hit. Useful in dev.
      this.logger.warn(`Firebase Admin NOT initialized: ${(err as Error).message}. Firebase verify paths will return 503.`);
    }
  }

  private resolveCredential(env: ReturnType<typeof loadEnv<typeof apiSchema>>): admin.credential.Credential {
    if (env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const parsed: admin.ServiceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
      return admin.credential.cert(parsed);
    }
    if (env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const raw = readFileSync(env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8');
      const parsed: admin.ServiceAccount = JSON.parse(raw);
      return admin.credential.cert(parsed);
    }
    throw new Error('No Firebase credential configured');
  }

  async verifyIdToken(token: string): Promise<admin.auth.DecodedIdToken> {
    if (!this.app) throw new Error('Firebase Admin is not initialized on this instance');
    return this.app.auth().verifyIdToken(token, true);
  }
}
