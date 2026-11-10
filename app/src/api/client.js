import { Platform } from 'react-native';

// Base URL of the Tuyamika MVP backend (bin/server.mjs).
// Set via app/.env or shell: EXPO_PUBLIC_API_BASE_URL=https://api.tuyamika.co.zm
// Empty/absent keeps the app in its local-mock auth mode.
export const API_BASE_URL = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);

function normalizeBaseUrl(value) {
  const url = String(value || '').trim().replace(/\/+$/, '');
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) return null;
  if (Platform.OS === 'android' && /^http:\/\/(10\.0\.2\.2|localhost|127\.0\.0\.1)(:\d+)?$/i.test(url)) {
    return url.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
  }
  return url;
}

export function isApiConfigured() {
  return API_BASE_URL !== null;
}

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request(path, options = {}) {
  if (!API_BASE_URL) throw new ApiError(0, 'API base URL is not configured (EXPO_PUBLIC_API_BASE_URL).');

  const { token, body, ...rest } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      signal: controller.signal,
      ...rest,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...rest.headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new ApiError(response.status, json.error || `Request failed (${response.status}).`, undefined);
    }
    return json;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error?.name === 'AbortError') {
      throw new ApiError(0, 'The request timed out. Check your connection and try again.');
    }
    throw new ApiError(0, 'Could not reach Tuyamika. Check your connection and try again.');
  } finally {
    clearTimeout(timeout);
  }
}

export const api = {
  request,
  async get(path, token) {
    return request(path, { method: 'GET', token });
  },
  async post(path, body, token) {
    return request(path, { method: 'POST', body, token });
  },
  async patch(path, body, token) {
    return request(path, { method: 'PATCH', body, token });
  },
};
