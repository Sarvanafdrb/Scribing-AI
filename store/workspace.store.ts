import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Workspace } from "@/types/workspace.types";

interface WorkspaceState {
  selectedWorkspace: Workspace | null;
  _hasHydrated: boolean;

  setSelectedWorkspace: (workspace: Workspace | null) => void;
  setHasHydrated: (state: boolean) => void;
  clearWorkspace: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      selectedWorkspace: null,
      _hasHydrated: false,

      setSelectedWorkspace: (workspace) => set({ selectedWorkspace: workspace }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      clearWorkspace: () => set({ selectedWorkspace: null }),
    }),
    {
      name: "workspace-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedWorkspace: state.selectedWorkspace,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
