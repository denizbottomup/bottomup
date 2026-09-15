import type { Pool } from 'pg';
import type { TableReplicationSpec } from './tables.js';

// Keep in sync with bottomup-backend apps/replication/api.py SENSITIVE_COLUMNS.
// Direct SQL SELECT * would otherwise copy hashed_password onto the Railway
// mirror — the HTTP export stripped these before we switched sources.
export const SENSITIVE_COLUMNS = new Set([
  'hashed_password',
  'password',
  'salt',
  'registration_token',
  'api_key',
  'secret_key',
  'pass_phrase',
  'passphrase',
  'access_token',
  'refresh_token',
  'custom_token',
  'otp',
  'otp_code',
  'verification_code',
]);

export function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

export function stripSensitive(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (!SENSITIVE_COLUMNS.has(k.toLowerCase())) out[k] = v;
  }
  return out;
}

export function buildSourceQuery(
  spec: Pick<TableReplicationSpec, 'name' | 'cursorCol'>,
  since: string | undefined,
  limit: number,
): { sql: string; params: unknown[] } {
  const table = quoteIdent(spec.name);
  if (!spec.cursorCol) {
    return { sql: `SELECT * FROM ${table} LIMIT $1`, params: [limit] };
  }
  const cursor = quoteIdent(spec.cursorCol);
  return {
    sql: `SELECT * FROM ${table} WHERE ${cursor} > $1 ORDER BY ${cursor} ASC LIMIT $2`,
    params: [since ?? '1970-01-01T00:00:00.000Z', limit],
  };
}

export async function fetchSourceRowsFromDatabase(
  pool: Pool,
  spec: Pick<TableReplicationSpec, 'name' | 'cursorCol'>,
  since: string | undefined,
  limit: number,
): Promise<Record<string, unknown>[]> {
  const { sql, params } = buildSourceQuery(spec, since, limit);
  const { rows } = await pool.query<Record<string, unknown>>(sql, params);
  return rows.map(stripSensitive);
}

// node-pg parses sslmode=require from the DSN into rejectUnauthorized:true
// and that wins over a sibling `ssl:` option. Strip it so the pool ssl
// config is the only TLS policy.
export function sourcePoolConnectionString(dsn: string): string {
  const u = new URL(dsn);
  u.searchParams.delete('sslmode');
  u.searchParams.delete('ssl');
  return u.toString();
}
