'use client';

import { getFirebaseAuth } from './firebase';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://bottomupapi-production.up.railway.app';

interface ApiOpts extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
  /** Skip attaching auth header even if user is signed in. */
  anonymous?: boolean;
}

/**
 * Thin fetch wrapper that attaches Firebase ID token and parses the
 * FastAPI-style `{status, data, message}` envelope used by the backend.
 */
export async function api<T = unknown>(path: string, opts: ApiOpts = {}): Promise<T> {
  const { anonymous = false, headers = {}, ...init } = opts;

  const mergedHeaders: Record<string, string> = {
    accept: 'application/json',
    ...headers,
  };

  if (!anonymous) {
    const user = getFirebaseAuth().currentUser;
    if (user) {
      const token = await user.getIdToken();
      mergedHeaders.authorization = `Bearer ${token}`;
    }
  }

  if (init.body && !mergedHeaders['content-type']) {
    mergedHeaders['content-type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers: mergedHeaders });
  const text = await res.text();
  const json: unknown = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const msg =
      (json as { message?: string } | null)?.message ?? `HTTP ${res.status}`;
    throw new ApiError(res.status, msg);
  }

  return json as T;
}

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}
