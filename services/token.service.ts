import axios from "axios";
import { useAuthStore } from "@/store/auth.store";

const refreshApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

let refreshPromise: Promise<string> | null = null;

export const tokenService = {
  async refreshAccessToken(): Promise<string> {
    if (refreshPromise) {
      return refreshPromise;
    }

    refreshPromise = (async () => {
      const { refreshToken } = useAuthStore.getState();

      if (!refreshToken) {
        throw new Error("No refresh token available");
      }

      const response = await refreshApi.post("/auth/refresh-token", {
        refreshToken,
      });

      const { accessToken, refreshToken: newRefreshToken } = response.data.data;

      const store = useAuthStore.getState();

      if (store.user) {
        store.setAuth(store.user, accessToken, newRefreshToken);
      } else {
        store.setToken(accessToken);
      }

      return accessToken;
    })();

    try {
      return await refreshPromise;
    } finally {
      refreshPromise = null;
    }
  },
};
