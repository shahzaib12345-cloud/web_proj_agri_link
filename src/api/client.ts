import { API_BASE_URL, REQUEST_TIMEOUT_MS } from './config';
import { ApiError } from './errors';
import { tokenStore } from './tokenStore';
import type { Session } from '@/types';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  body?: unknown;
  query?: Record<string, string | undefined>;
  /** Attach the Authorization header (default true). */
  auth?: boolean;
  /** Internal: prevents infinite refresh loops. */
  retried?: boolean;
}

let onUnauthorized: (() => void) | null = null;
/** AuthContext registers a callback so a failed refresh logs the user out everywhere. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

function buildQuery(query?: Record<string, string | undefined>): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== '') params.set(k, v);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

async function rawRequest<T>(method: Method, path: string, opts: RequestOptions): Promise<T> {
  const token = opts.auth === false ? null : tokenStore.get();

  // Inline env check so Vite removes the whole mock branch (and the seed data with demo passwords) from production builds.
  if (import.meta.env.VITE_USE_MOCKS === 'true') {
    // Loaded lazily so the mock server is not part of the main bundle path.
    const { mockRequest } = await import('@/mocks/server');
    return (await mockRequest(method, path, { body: opts.body, query: opts.query, token })) as T;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE_URL}${path}${buildQuery(opts.query)}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      credentials: 'include', // sends the httpOnly refresh cookie to the API
      signal: controller.signal,
    });
    if (res.status === 204) return undefined as T;
    const data: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const code =
        data && typeof data === 'object' && 'code' in data && typeof data.code === 'string'
          ? data.code
          : `http_${res.status}`;
      throw new ApiError(res.status, code);
    }
    return data as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, 'network_error'); // never leak raw fetch/internal messages
  } finally {
    clearTimeout(timer);
  }
}

let refreshing: Promise<Session | null> | null = null;

/** Single-flight refresh: many parallel 401s trigger only one /auth/refresh call. */
export function refreshSession(): Promise<Session | null> {
  if (!refreshing) {
    refreshing = rawRequest<Session>('POST', '/auth/refresh', { auth: false })
      .then((session) => {
        tokenStore.set(session.accessToken);
        return session;
      })
      .catch(() => {
        tokenStore.clear();
        return null;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

export async function request<T>(
  method: Method,
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  try {
    return await rawRequest<T>(method, path, opts);
  } catch (err) {
    const isAuthEndpoint = path.startsWith('/auth/');
    if (err instanceof ApiError && err.status === 401 && !opts.retried && !isAuthEndpoint) {
      const session = await refreshSession();
      if (session) return request<T>(method, path, { ...opts, retried: true });
      onUnauthorized?.();
    }
    throw err;
  }
}

export const http = {
  get: <T>(path: string, query?: Record<string, string | undefined>) =>
    request<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown, auth = true) => request<T>('POST', path, { body, auth }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
