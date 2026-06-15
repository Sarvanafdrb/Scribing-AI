import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/auth.store";
import { useRouter } from "next/navigation";

export const useSessionExpiry = () => {
  const { token, logout } = useAuthStore();
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!token) return;

    // clear previous timer (VERY IMPORTANT)
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    try {
      const base64 = token.split(".")[1];
      if (!base64) return;

      const payload = JSON.parse(atob(base64));
      if (!payload?.exp) return;

      const expiryTime = payload.exp * 1000;
      const currentTime = Date.now();

      let timeUntilExpiry = expiryTime - currentTime;

      // If already expired → logout immediately
      if (timeUntilExpiry <= 0) {
        logout();
        router.push("/login?expired=true");
        return;
      }

      // logout 1 min before expiry
      const logoutTime = timeUntilExpiry - 60000;

      // if token expires in less than 1 min → logout slightly earlier
      const finalTimeout = logoutTime > 0 ? logoutTime : 0;

      timerRef.current = setTimeout(() => {
        console.log("⏰ Session expiring soon... logging out");
        logout();
        router.push("/login?expired=true");
      }, finalTimeout);
    } catch (error) {
      console.error("Error parsing token:", error);
      logout();
      router.push("/login?expired=true");
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [token, logout, router]);
};
