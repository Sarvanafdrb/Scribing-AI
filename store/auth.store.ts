// store/auth.store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AuthUser, toPersistedAuthUser } from "@/types/auth.types";
import { useWorkspaceStore } from "@/store/workspace.store";

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

const AUTH_STORAGE_KEY = "auth-storage";

export const clearPersistedAuthStorage = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem("workspace-storage");
};

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
          user: toPersistedAuthUser(user),
          token,
          refreshToken: refreshToken || null,
          isLoading: false,
        });
      },

      setUser: (user) => set({ user: toPersistedAuthUser(user) }),
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
        useWorkspaceStore.getState().clearWorkspace();
        clearPersistedAuthStorage();
        sessionStorage.clear();
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      partialize: (state) => ({
        user: toPersistedAuthUser(state.user),
        token: state.token,
        refreshToken: state.refreshToken,
      }),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState || {}) as Partial<AuthState>;
        return {
          ...currentState,
          ...persisted,
          user: toPersistedAuthUser(persisted.user ?? null),
          token: persisted.token ?? null,
          refreshToken: persisted.refreshToken ?? null,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state?.user) {
          state.setUser(toPersistedAuthUser(state.user));
        }
        state?.setHasHydrated(true);
        state?.setLoading(false);
      },
    },
  ),
);
