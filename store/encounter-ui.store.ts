import { create } from "zustand";
import type { DispositionType } from "@/types/encounter.types";

interface EncounterUiState {
  roundsDrawerOpen: boolean;
  admitModalOpen: boolean;
  dischargeModalOpen: boolean;
  saveDialogOpen: boolean;
  pendingDisposition: DispositionType | null;
  setRoundsDrawerOpen: (open: boolean) => void;
  setAdmitModalOpen: (open: boolean) => void;
  setDischargeModalOpen: (open: boolean) => void;
  setSaveDialogOpen: (open: boolean) => void;
  setPendingDisposition: (value: DispositionType | null) => void;
  reset: () => void;
}

export const useEncounterUiStore = create<EncounterUiState>((set) => ({
  roundsDrawerOpen: false,
  admitModalOpen: false,
  dischargeModalOpen: false,
  saveDialogOpen: false,
  pendingDisposition: null,
  setRoundsDrawerOpen: (open) => set({ roundsDrawerOpen: open }),
  setAdmitModalOpen: (open) => set({ admitModalOpen: open }),
  setDischargeModalOpen: (open) => set({ dischargeModalOpen: open }),
  setSaveDialogOpen: (open) => set({ saveDialogOpen: open }),
  setPendingDisposition: (value) => set({ pendingDisposition: value }),
  reset: () =>
    set({
      roundsDrawerOpen: false,
      admitModalOpen: false,
      dischargeModalOpen: false,
      saveDialogOpen: false,
      pendingDisposition: null,
    }),
}));
