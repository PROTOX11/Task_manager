/**
 * HTTP client for the Express API.
 *
 * Browser (default): uses relative `/api/...` → Next.js rewrites to Express
 * (see `next.config.mjs` BACKEND_URL, default http://localhost:5000).
 *
 * Direct to Express: set NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
 * (no proxy; CORS must allow your Next origin).
 */

const TOKEN_KEY = "token";

/** SSR / Node fallback when env is not set — same port as backend default */
const SERVER_FALLBACK_API = "http://localhost:5000/api";

function getApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined") {
    return "/api";
  }
  return SERVER_FALLBACK_API;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

export type ApiRequestOptions = Omit<RequestInit, "headers"> & {
  auth?: boolean;
  headers?: HeadersInit;
};

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { auth = true, headers: customHeaders, ...init } = options;
  const token = getToken();

  const base = getApiBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${base}${normalizedPath}`;

  const headers = new Headers(customHeaders);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (auth && token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  const data: unknown = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof (data as { message: unknown }).message === "string"
        ? (data as { message: string }).message
        : "Request failed";
    throw new Error(message);
  }

  return data as T;
}
