import { getToken, removeToken } from "@/lib/auth";

const API_BASE = "/api";

export function getApiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Session expired");
    this.name = "UnauthorizedError";
  }
}

function redirectToLogin(): void {
  removeToken();
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  const loginPath = `${base}/login`;
  if (!window.location.pathname.endsWith("/login")) {
    window.location.href = loginPath;
  }
}

/**
 * Fetch wrapper that attaches the auth token and centrally handles expired or
 * invalid sessions. On a 401 it clears the stored token, redirects to login,
 * and throws an UnauthorizedError so callers can stop further processing.
 */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(options.headers ?? {});
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(getApiUrl(path), { ...options, headers });

  if (res.status === 401) {
    redirectToLogin();
    throw new UnauthorizedError();
  }

  return res;
}
