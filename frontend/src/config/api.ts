const rawBase = (
  import.meta.env.VITE_API_BASE_URL as string | undefined
)?.trim();

// Empty base means use same-origin relative paths (works with Vite proxy in dev).
const normalizedBase = rawBase ? rawBase.replace(/\/+$/, "") : "";

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}
