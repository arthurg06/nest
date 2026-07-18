// Central API URL builder. In the browser build the base is empty (same
// origin). Packaged builds — a Capacitor iOS shell, or any client not served
// by the API host — set VITE_API_BASE_URL at build time so the app never
// depends on a relative localhost origin.

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") || "";

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}
