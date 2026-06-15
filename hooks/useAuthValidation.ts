// hooks/useAuthValidation.ts
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth.store";
import { authService } from "@/services/auth.service";

export const useAuthValidation = () => {
  const { token, setUser, logout, _hasHydrated, isLoading } = useAuthStore();
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    if (!_hasHydrated) return;

    const validateAuth = async () => {
      console.log("🔍 Auth Validation Started", {
        hasToken: !!token,
        isHydrated: _hasHydrated,
      });

      if (!token) {
        console.log("❌ No token found, skipping validation");
        setIsValidating(false);
        return;
      }

      try {
        console.log(
          "🚀 Calling /auth/me with token:",
          token.substring(0, 20) + "...",
        );

        const response = await authService.getCurrentUser();

        console.log("📡 /auth/me Response:", response);

        // Handle different response structures
        const user = response?.data?.user || response?.user || response?.data;

        if (!user || !user.id) {
          throw new Error("Invalid user response structure");
        }

        setUser(user);
        console.log("✅ User validated successfully:", user.email);
      } catch (error: any) {
        console.error("❌ Auth validation failed:", error.message);

        // Check if it's a token error
        if (
          error.response?.status === 401 ||
          error.message === "Invalid token"
        ) {
          console.log("🔄 Token invalid, logging out");
          logout();
        }
      } finally {
        setIsValidating(false);
      }
    };

    validateAuth();
  }, [_hasHydrated, token, setUser, logout]);

  return { isValidating: isValidating || isLoading };
};
