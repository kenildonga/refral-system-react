import i18n from '../i18n';
import type { ApiError } from '../types/api';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

const TOKEN_KEY = 'accessToken';

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function formatApiError(error: ApiError): string {
  if (Array.isArray(error.message)) {
    return error.message.join(', ');
  }
  return error.message;
}

export async function api<T>(
  path: string,
  options: RequestInit & { token?: string | null; skipAuthHandler?: boolean } = {},
): Promise<T> {
  const { token, skipAuthHandler, headers, ...rest } = options;
  const accessToken = token !== undefined ? token : getAccessToken();

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': i18n.language || 'en',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = data as ApiError;
    if (res.status === 401 && !skipAuthHandler) {
      onUnauthorized?.();
    }
    throw error;
  }

  return data as T;
}
