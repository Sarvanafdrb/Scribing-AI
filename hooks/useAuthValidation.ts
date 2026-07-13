// hooks/useAuthValidation.ts
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth.store";
import { authService } from "@/services/auth.service";
import { normalizeAuthUser, toPersistedAuthUser } from "@/types/auth.types";

export const useAuthValidation = () => {
  const { token, setUser, logout, _hasHydrated, isLoading } = useAuthStore();
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    if (!_hasHydrated) return;

    const validateAuth = async () => {
      if (!token) {
        setIsValidating(false);
        return;
      }

      try {
        const response = await authService.getCurrentUser();
        const userData = response?.data?.user || response?.user || response?.data;

        if (!userData || !userData.id) {
          throw new Error("Invalid user response structure");
        }

        setUser(
          toPersistedAuthUser(
            normalizeAuthUser({
              ...userData,
              isSuperAdmin: Boolean(userData.isSuperAdmin),
              permissions: userData.permissions || [],
              organizationName:
                userData.organizationName || userData.organization?.name,
              organization: userData.isSuperAdmin
                ? null
                : userData.organization,
            }),
          ),
        );
      } catch (error: any) {
        const status = error?.response?.status;
        const isNetworkError =
          error?.code === "ERR_NETWORK" || !error?.response;

        if (isNetworkError) {
          console.warn(
            "⚠️ Auth validation skipped: API not reachable.",
            error?.message,
          );
        } else {
          console.error("❌ Auth validation failed:", error?.message);
        }

        if (
          status === 401 ||
          status === 403 ||
          error?.message === "Invalid token"
        ) {
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
