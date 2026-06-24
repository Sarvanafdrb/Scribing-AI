// store/auth.store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AuthUser } from "@/types/auth.types";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  _hasHydrated: boolean;

  setAuth: (
    user: AuthUser | null,
    token: string | null,
    refreshToken?: string | null,
  ) => void;
  setUser: (user: AuthUser | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setHasHydrated: (state: boolean) => void;
  logout: () => void;
  updateToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isLoading: true,
      _hasHydrated: false,

      setAuth: (user, token, refreshToken) => {
        set({
          user,
          token,
          refreshToken: refreshToken || null,
          isLoading: false,
        });
      },

      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setLoading: (isLoading) => set({ isLoading }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      updateToken: (token) => set({ token }),

      logout: () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          isLoading: false,
          _hasHydrated: true,
        });
        // Clear all storage
        localStorage.removeItem("auth-storage");
        sessionStorage.clear();
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        state?.setLoading(false);
      },
    },
  ),
);
