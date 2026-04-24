import { createHmac } from 'node:crypto';

/**
 * Minimal OKX v5 REST client. We only use the endpoints copy-trade needs:
 * balance read, account info, instrument ticker. Orders are placed via a
 * worker, not this app directly.
 *
 * Auth follows the documented recipe:
 *   signature = base64(HMAC_SHA256(secret, ts + method + path + body))
 *   headers   = OK-ACCESS-KEY, OK-ACCESS-SIGN, OK-ACCESS-TIMESTAMP,
 *               OK-ACCESS-PASSPHRASE, (x-simulated-trading: 1 if demo)
 */

export interface OkxCredentials {
  apiKey: string;
  apiSecret: string;
  passphrase: string;
  isDemo?: boolean;
}

export interface OkxBalanceRow {
  ccy: string;
  eq: number;
  usdEq: number;
  availBal: number;
}

export interface OkxAccountSnapshot {
  total_equity_usd: number;
  balances: OkxBalanceRow[];
  updated_at: number;
}

export class OkxClient {
  private readonly base = 'https://www.okx.com';

  async publicGet<T>(path: string): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`okx ${res.status}`);
    const json = (await res.json()) as {
      code?: string;
      msg?: string;
      data?: T;
    };
    if (json.code !== '0')
      throw new Error(`okx ${json.code ?? '?'}: ${json.msg ?? ''}`);
    return (json.data ?? ([] as unknown)) as T;
  }

  async privateGet<T>(path: string, creds: OkxCredentials): Promise<T> {
    return this.privateRequest<T>('GET', path, creds, '');
  }

  private async privateRequest<T>(
    method: 'GET' | 'POST',
    path: string,
    creds: OkxCredentials,
    body: string,
  ): Promise<T> {
    if (!creds.apiKey || !creds.apiSecret || !creds.passphrase) {
      throw new Error('OKX credentials incomplete (missing passphrase?)');
    }
    const ts = new Date().toISOString();
    const prehash = `${ts}${method}${path}${body}`;
    const sign = createHmac('sha256', creds.apiSecret)
      .update(prehash)
      .digest('base64');

    const headers: Record<string, string> = {
      'OK-ACCESS-KEY': creds.apiKey,
      'OK-ACCESS-SIGN': sign,
      'OK-ACCESS-TIMESTAMP': ts,
      'OK-ACCESS-PASSPHRASE': creds.passphrase,
      accept: 'application/json',
      'content-type': 'application/json',
    };
    if (creds.isDemo) headers['x-simulated-trading'] = '1';

    const res = await fetch(`${this.base}${path}`, {
      method,
      headers,
      body: method === 'POST' ? body : undefined,
      signal: AbortSignal.timeout(10000),
    });
    const json = (await res.json().catch(() => ({}))) as {
      code?: string;
      msg?: string;
      data?: T;
    };
    if (!res.ok || json.code !== '0') {
      const detail = json.msg ?? `HTTP ${res.status}`;
      throw new Error(`OKX ${json.code ?? res.status}: ${detail}`);
    }
    return (json.data ?? ([] as unknown)) as T;
  }

  /**
   * Reads GET /api/v5/account/balance and flattens the single
   * account-snapshot response into something UI-friendly. Throws if
   * credentials are wrong (keeps the caller's try/catch simple).
   */
  async balance(creds: OkxCredentials): Promise<OkxAccountSnapshot> {
    const data = await this.privateGet<
      Array<{
        totalEq?: string;
        details?: Array<{
          ccy?: string;
          eq?: string;
          eqUsd?: string;
          availBal?: string;
        }>;
      }>
    >(`/api/v5/account/balance`, creds);
    const row = data[0];
    if (!row) {
      return { total_equity_usd: 0, balances: [], updated_at: Date.now() };
    }
    const details = row.details ?? [];
    const balances: OkxBalanceRow[] = details
      .map((d) => ({
        ccy: String(d.ccy ?? ''),
        eq: Number(d.eq ?? 0),
        usdEq: Number(d.eqUsd ?? 0),
        availBal: Number(d.availBal ?? 0),
      }))
      .filter((b) => b.ccy && (b.eq > 0 || b.availBal > 0));
    balances.sort((a, b) => b.usdEq - a.usdEq);
    return {
      total_equity_usd: Number(row.totalEq ?? 0),
      balances,
      updated_at: Date.now(),
    };
  }

  /**
   * GET /api/v5/account/config — used during pairing to pull the user's
   * OKX UID so we can store it alongside the credentials.
   */
  async accountConfig(creds: OkxCredentials): Promise<{
    uid: string | null;
    acct_lv: string | null;
  }> {
    const data = await this.privateGet<
      Array<{ uid?: string; acctLv?: string }>
    >(`/api/v5/account/config`, creds);
    const row = data[0];
    return {
      uid: row?.uid ? String(row.uid) : null,
      acct_lv: row?.acctLv ? String(row.acctLv) : null,
    };
  }
}

export const okxClient = new OkxClient();
