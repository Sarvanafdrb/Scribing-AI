import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/auth.store";
import { useRouter } from "next/navigation";

export const useSessionExpiry = () => {
  const { token, logout } = useAuthStore();
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!token) return;

    // Clear old timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));

      if (!payload?.exp) return;

      const expiryTime = payload.exp * 1000;
      const currentTime = Date.now();

      const timeUntilExpiry = expiryTime - currentTime;

      console.log(
        "⏰ Token expires in:",
        Math.floor(timeUntilExpiry / 1000),
        "seconds",
      );

      // Already expired
      if (timeUntilExpiry <= 0) {
        console.log("❌ Token already expired");
        logout();
        router.replace("/login?expired=true");
        return;
      }

      // Warning threshold (1 minute before expiry)
      const WARNING_BUFFER = 60 * 1000;

      // If less than 1 min remains, DON'T logout immediately
      if (timeUntilExpiry <= WARNING_BUFFER) {
        console.log(
          "⚠️ Token expires in less than 1 minute. Waiting for refresh flow.",
        );
        return;
      }

      timerRef.current = setTimeout(() => {
        console.log("⚠️ Session will expire soon");

        // Optional:
        // show toast/modal instead of logout

        // logout();
        // router.replace("/login?expired=true");
      }, timeUntilExpiry - WARNING_BUFFER);
    } catch (error) {
      console.error("❌ Invalid token:", error);

      logout();
      router.replace("/login?expired=true");
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [token, logout, router]);
};
