const API_BASE = "/api";

export function getApiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
