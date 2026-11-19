/** Allow internal app paths only (prevents open redirects). */
export function sanitizeReturnTo(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  const path = raw.trim();
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  if (path.includes("..") || path.includes("://")) return null;
  const [pathname] = path.split("?");
  if (!pathname || pathname.length > 256) return null;
  return pathname;
}

export function buildReturnUrl(path: string, params: Record<string, string>) {
  const search = new URLSearchParams(params);
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}