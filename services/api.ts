// services/api.ts
import axios from "axios";
import { useAuthStore } from "@/store/auth.store";
import { useWorkspaceStore } from "@/store/workspace.store";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "/api/backend";

const PUBLIC_AUTH_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/register-org",
  "/auth/refresh-token",
  "/auth/forgot-password",
  "/auth/reset-password",
];

const getRequestPath = (url?: string) => {
  if (!url) return "";
  return url.replace(API_BASE_URL, "").split("?")[0];
};

const isPublicAuthRequest = (url?: string) => {
  const path = getRequestPath(url);
  return PUBLIC_AUTH_PATHS.some(
    (authPath) => path === authPath || path.endsWith(authPath),
  );
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  // Auth uses Bearer tokens in Authorization — do not rely on large cookies.
  withCredentials: false,
});

// Request interceptor — only attach Authorization (+ optional workspace id).
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    const workspaceId = useWorkspaceStore.getState().selectedWorkspace?.id;

    // Start from a clean header set for auth-sensitive fields.
    if (config.headers) {
      delete config.headers.Cookie;
      delete config.headers.cookie;
      delete config.headers["X-User"];
      delete config.headers["X-User-Data"];
      delete config.headers["X-Organization"];
    }

    if (token && !isPublicAuthRequest(config.url)) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (config.headers) {
      delete config.headers.Authorization;
    }

    // "all" means platform-wide — do not send a workspace header.
    if (workspaceId && workspaceId !== "all") {
      config.headers["X-Workspace-Id"] = workspaceId;
    } else if (config.headers) {
      delete config.headers["X-Workspace-Id"];
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isPublicAuthRequest(originalRequest.url)) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;

        if (!refreshToken) {
          return Promise.reject(error);
        }

        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh-token`,
          { refreshToken },
          { withCredentials: false },
        );

        const { accessToken, refreshToken: newRefreshToken } =
          response.data.data;

        const { user } = useAuthStore.getState();
        useAuthStore.getState().setAuth(user, accessToken, newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().logout();

        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
