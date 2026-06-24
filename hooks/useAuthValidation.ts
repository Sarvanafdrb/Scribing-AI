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
        const userData = response?.data?.user || response?.user || response?.data;

        if (!userData || !userData.id) {
          throw new Error("Invalid user response structure");
        }

        const user = {
          ...userData,
          isSuperAdmin: Boolean(userData.isSuperAdmin),
          permissions: userData.permissions || [],
          organizationName:
            userData.organizationName || userData.organization?.name,
          organization: userData.isSuperAdmin ? null : userData.organization,
        };

        setUser(user);
        console.log("✅ User validated successfully:", user.email);
      } catch (error: any) {
        const status = error?.response?.status;
        const isNetworkError =
          error?.code === "ERR_NETWORK" || !error?.response;

        if (isNetworkError) {
          // API/server temporarily unreachable; keep current session state.
          console.warn(
            "⚠️ Auth validation skipped: API not reachable.",
            error?.message,
          );
        } else {
          console.error("❌ Auth validation failed:", error?.message);
        }

        // Logout only for confirmed auth failures
        if (
          status === 401 ||
          status === 403 ||
          error?.message === "Invalid token"
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
