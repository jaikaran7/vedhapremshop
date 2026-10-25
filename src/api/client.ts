import { getApiBaseUrl } from '@/config/env';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Session cookies are httpOnly; X-Requested-With is the backend's CSRF check for cookie-authenticated writes. */
function send(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'X-Requested-With': 'fetch',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });
}

let refreshing: Promise<boolean> | null = null;

/** One refresh shared by every request that hit an expired access token at the same time. */
function refreshSession(): Promise<boolean> {
  refreshing ??= send('/auth/refresh', { method: 'POST' })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export async function apiClient<T>(path: string, init?: RequestInit): Promise<T> {
  let response = await send(path, init);
  if (response.status === 401 && path !== '/auth/login' && path !== '/auth/refresh' && (await refreshSession())) {
    response = await send(path, init);
  }

  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
    const body = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
    const message = Array.isArray(body?.message) ? body.message.join('. ') : body?.message;
    throw new ApiError(response.status, message || `Request failed (${response.status})`);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Same key for every attempt of one submission, so a retried bill or receipt is not posted twice. */
export function idempotencyHeaders(): Record<string, string> {
  return { 'Idempotency-Key': crypto.randomUUID() };
}

export function emulateApi<T>(value: T): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), 0);
  });
}
