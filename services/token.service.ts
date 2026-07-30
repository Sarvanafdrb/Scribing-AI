import axios from "axios";
import { useAuthStore } from "@/store/auth.store";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "/api/backend";

const refreshApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
});

/** Shared across all callers so concurrent 401s trigger exactly one refresh. */
let refreshPromise: Promise<string> | null = null;

export const tokenService = {
  refreshAccessToken(): Promise<string> {
    if (refreshPromise) {
      return refreshPromise;
    }

    refreshPromise = (async () => {
      try {
        const { refreshToken } = useAuthStore.getState();

        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        const response = await refreshApi.post("/auth/refresh-token", {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } =
          response.data.data;
        const store = useAuthStore.getState();

        store.setAuth(store.user, accessToken, newRefreshToken);

        return accessToken as string;
      } finally {
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  },
};
