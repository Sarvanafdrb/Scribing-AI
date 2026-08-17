// services/api.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/auth.store";
import { useWorkspaceStore } from "@/store/workspace.store";
import { tokenService } from "@/services/token.service";

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

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

const getRequestPath = (url?: string) => {
  if (!url) return "";
  return url.replace(API_BASE_URL, "").split("?")[0];
};

const isPublicInvitationAcceptRequest = (path: string) =>
  path === "/invitations/accept" || path.startsWith("/invitations/accept/");

const isPublicAuthRequest = (url?: string) => {
  const path = getRequestPath(url);
  if (isPublicInvitationAcceptRequest(path)) {
    return true;
  }
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

    // Let the browser set multipart boundary — a bare Content-Type breaks multer.
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      delete config.headers["Content-Type"];
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

const forceLogoutToLogin = () => {
  useAuthStore.getState().logout();

  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
};

// Response interceptor — single-flight refresh via tokenService, then retry.
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      if (isPublicAuthRequest(originalRequest.url)) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        const accessToken = await tokenService.refreshAccessToken();
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // If another request refreshed successfully, retry with the latest token.
        const latestToken = useAuthStore.getState().token;
        if (latestToken) {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${latestToken}`;
          try {
            return await api(originalRequest);
          } catch {
            // fall through to logout
          }
        }

        forceLogoutToLogin();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
