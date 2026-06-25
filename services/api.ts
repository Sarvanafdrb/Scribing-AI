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
  withCredentials: true,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Get fresh token from store
    const token = useAuthStore.getState().token;
    const workspaceId = useWorkspaceStore.getState().selectedWorkspace?.id;

    if (token && !isPublicAuthRequest(config.url)) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (workspaceId) {
      config.headers["X-Workspace-Id"] = workspaceId;
    }

    console.log("📤 Request:", {
      url: config.url,
      method: config.method,
      hasToken: !!token,
      headers: config.headers,
    });

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

        // Call refresh endpoint
        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh-token`,
          { refreshToken },
          { withCredentials: true },
        );

        const { accessToken, refreshToken: newRefreshToken } =
          response.data.data;

        // Update store with new tokens
        const { user } = useAuthStore.getState();
        useAuthStore.getState().setAuth(user!, accessToken, newRefreshToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - logout user
        useAuthStore.getState().logout();

        // Redirect to login if in browser
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
