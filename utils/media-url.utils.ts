const getApiBaseUrl = () =>
  process.env.NEXT_PUBLIC_API_DIRECT_URL ||
  process.env.NEXT_PUBLIC_API_URL?.replace("/api/backend", "") ||
  "http://localhost:5000";

const getUploadsBaseUrl = () =>
  (
    process.env.NEXT_PUBLIC_UPLOADS_BASE_URL ||
    process.env.NEXT_PUBLIC_API_DIRECT_URL ||
    ""
  ).replace(/\/$/, "");

export const resolveUploadUrl = (path?: string | null) => {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
    return path;
  }

  if (path.startsWith("/uploads/")) {
    const uploadsBase = getUploadsBaseUrl();
    // Production: point leftover local /uploads paths at the API host.
    // Local: keep relative so Next.js /uploads/[...path] can proxy to the API.
    if (uploadsBase) {
      return `${uploadsBase}${path}`;
    }
    return path;
  }

  const base = getApiBaseUrl().replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
};
