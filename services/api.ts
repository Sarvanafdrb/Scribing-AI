// services/api.ts
import axios from "axios";
import { useAuthStore } from "@/store/auth.store";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "/api/backend";

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

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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

    // Check if error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;

        if (!refreshToken) {
          throw new Error("No refresh token available");
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
