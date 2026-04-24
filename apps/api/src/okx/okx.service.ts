import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PrismaClient } from '@bottomup/db';
import { PRISMA } from '../common/prisma.module.js';
import type { AuthedUser } from '../common/decorators/current-user.decorator.js';
import { okxClient, type OkxAccountSnapshot } from './okx.client.js';

export interface OkxStatus {
  connected: boolean;
  uid: string | null;
  masked_key: string | null;
  market: 'okx';
  is_demo: boolean;
  last_checked_at: Date | null;
}

@Injectable()
export class OkxService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async status(viewer: AuthedUser): Promise<OkxStatus> {
    const viewerId = await this.resolveViewerId(viewer);
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT c.api_key, c.is_demo, c.is_active, c.updated_at,
              u.copy_trade_market_uid AS uid
         FROM "user" u
         LEFT JOIN affiliate_trader_credentials c
           ON c.trader_id = u.id
          AND c.copy_trade_market = 'okx'
          AND c.is_deleted = FALSE
        WHERE u.id = $1::uuid
        LIMIT 1`,
      viewerId,
    );
    const r = rows[0];
    if (!r || !r.api_key) {
      return {
        connected: false,
        uid: null,
        masked_key: null,
        market: 'okx',
        is_demo: false,
        last_checked_at: null,
      };
    }
    const apiKey = String(r.api_key);
    return {
      connected: Boolean(r.is_active ?? true),
      uid: (r.uid as string | null) ?? null,
      masked_key: maskKey(apiKey),
      market: 'okx',
      is_demo: Boolean(r.is_demo),
      last_checked_at: (r.updated_at as Date | null) ?? null,
    };
  }

  /**
   * POST /user/me/okx/pair — validates the credentials against OKX live
   * before writing them. We refuse to store a broken key so the user
   * never ends up with a phantom "connected" state.
   */
  async pair(
    viewer: AuthedUser,
    body: {
      api_key?: string;
      api_secret?: string;
      passphrase?: string;
      is_demo?: boolean;
    },
  ): Promise<OkxStatus> {
    const apiKey = String(body?.api_key ?? '').trim();
    const apiSecret = String(body?.api_secret ?? '').trim();
    const passphrase = String(body?.passphrase ?? '').trim();
    if (!apiKey || !apiSecret || !passphrase) {
      throw new BadRequestException(
        'api_key, api_secret ve passphrase alanları zorunludur',
      );
    }
    const isDemo = Boolean(body?.is_demo);

    const creds = { apiKey, apiSecret, passphrase, isDemo };
    let uid: string | null = null;
    try {
      const cfg = await okxClient.accountConfig(creds);
      uid = cfg.uid;
      await okxClient.balance(creds);
    } catch (err) {
      throw new BadRequestException(
        `OKX anahtarı doğrulanamadı: ${(err as Error).message}`,
      );
    }

    const viewerId = await this.resolveViewerId(viewer);
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO affiliate_trader_credentials
         (id, created_at, updated_at, is_deleted, trader_id,
          copy_trade_market, is_active, is_demo, api_key, api_secret, passphrase)
       VALUES (gen_random_uuid(), NOW(), NOW(), FALSE, $1::uuid,
               'okx', TRUE, $5, $2, $3, $4)
       ON CONFLICT (trader_id, copy_trade_market) DO UPDATE
         SET api_key = EXCLUDED.api_key,
             api_secret = EXCLUDED.api_secret,
             passphrase = EXCLUDED.passphrase,
             is_demo = EXCLUDED.is_demo,
             is_active = TRUE,
             is_deleted = FALSE,
             updated_at = NOW()`,
      viewerId,
      apiKey,
      apiSecret,
      passphrase,
      isDemo,
    );
    await this.prisma.$executeRawUnsafe(
      `UPDATE "user"
          SET copy_trade_market = 'okx',
              copy_trade_market_uid = $2,
              copy_trade_connected = TRUE,
              can_copy_trade = TRUE,
              updated_at = NOW()
        WHERE id = $1::uuid`,
      viewerId,
      uid,
    );

    return this.status(viewer);
  }

  async unpair(viewer: AuthedUser): Promise<{ ok: true }> {
    const viewerId = await this.resolveViewerId(viewer);
    await this.prisma.$executeRawUnsafe(
      `UPDATE affiliate_trader_credentials
          SET is_deleted = TRUE, is_active = FALSE, updated_at = NOW()
        WHERE trader_id = $1::uuid AND copy_trade_market = 'okx'`,
      viewerId,
    );
    await this.prisma.$executeRawUnsafe(
      `UPDATE "user"
          SET copy_trade_connected = FALSE,
              can_copy_trade = FALSE,
              updated_at = NOW()
        WHERE id = $1::uuid`,
      viewerId,
    );
    return { ok: true };
  }

  async balance(viewer: AuthedUser): Promise<OkxAccountSnapshot> {
    const viewerId = await this.resolveViewerId(viewer);
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT api_key, api_secret, passphrase, is_demo
         FROM affiliate_trader_credentials
        WHERE trader_id = $1::uuid
          AND copy_trade_market = 'okx'
          AND is_deleted = FALSE
        LIMIT 1`,
      viewerId,
    );
    const r = rows[0];
    if (!r?.api_key) throw new NotFoundException('OKX hesabı bağlı değil');
    return okxClient.balance({
      apiKey: String(r.api_key),
      apiSecret: String(r.api_secret ?? ''),
      passphrase: String(r.passphrase ?? ''),
      isDemo: Boolean(r.is_demo),
    });
  }

  private async resolveViewerId(viewer: AuthedUser): Promise<string> {
    if (viewer.kind === 'jwt') return viewer.sub;
    const rows = await this.prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id::text AS id FROM "user" WHERE uid = $1 LIMIT 1`,
      viewer.uid,
    );
    const row = rows[0];
    if (!row) throw new NotFoundException(`Viewer not found for uid ${viewer.uid}`);
    return row.id;
  }
}

function maskKey(k: string): string {
  if (k.length <= 8) return '••••';
  return `${k.slice(0, 4)}…${k.slice(-4)}`;
}
