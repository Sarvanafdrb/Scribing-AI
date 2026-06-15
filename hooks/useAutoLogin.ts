import { useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";
import { authService } from "@/services/auth.service";

export const useAutoLogin = () => {
  const { token, setAuth, _hasHydrated } = useAuthStore();

  useEffect(() => {
    const autoLogin = async () => {
      // wait for zustand hydration
      if (!_hasHydrated) return;

      // already logged in
      if (token) return;

      try {
        const stored = localStorage.getItem("auth-storage");
        if (!stored) return;

        let parsed;
        try {
          parsed = JSON.parse(stored);
        } catch (err) {
          console.warn("⚠️ Invalid auth storage, clearing...");
          localStorage.removeItem("auth-storage");
          return;
        }

        const savedToken = parsed?.state?.token;
        const refreshToken = parsed?.state?.refreshToken;

        if (!savedToken) return;

        // IMPORTANT:
        // Set token first so axios interceptor can use it
        setAuth(null, savedToken, refreshToken);

        // Now validate session
        const response = await authService.getCurrentUser();

        if (response?.success && response?.data) {
          setAuth(response.data, savedToken, refreshToken);

          console.log("✅ Auto-login successful");
        } else {
          throw new Error("Invalid session");
        }
      } catch (error) {
        console.error("❌ Auto-login failed:", error);

        // clean everything
        localStorage.removeItem("auth-storage");
        setAuth(null, null, null);
      }
    };

    autoLogin();
  }, [_hasHydrated, token, setAuth]);
};
