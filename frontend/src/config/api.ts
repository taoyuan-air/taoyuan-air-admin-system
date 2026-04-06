const rawBase = (
  import.meta.env.VITE_API_BASE_URL as string | undefined
)?.trim();
const rawDemoMode = (import.meta.env.VITE_DEMO_MODE as string | undefined)
  ?.trim()
  .toLowerCase();

// Empty base means use same-origin relative paths (works with Vite proxy in dev).
const normalizedBase = rawBase ? rawBase.replace(/\/+$/, "") : "";

export const isDemoMode =
  rawDemoMode === "true"
    ? true
    : rawDemoMode === "false"
      ? false
      : import.meta.env.PROD && !normalizedBase;

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}
