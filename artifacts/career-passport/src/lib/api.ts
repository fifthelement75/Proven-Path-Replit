const API_BASE = "/api";

export function getApiUrl(path: string): string {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
  return `${base}${API_BASE}${path}`;
}
