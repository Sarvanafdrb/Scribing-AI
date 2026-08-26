import { create } from "zustand";
import type { DispositionType } from "@/types/encounter.types";
import type { PrescriptionPreviewPayload } from "@/types/prescription-preview.types";

interface EncounterUiState {
  roundsDrawerOpen: boolean;
  admitModalOpen: boolean;
  dischargeModalOpen: boolean;
  saveDialogOpen: boolean;
  notesPreviewNonce: number;
  prescriptionSuggestQuery: string | null;
  clinicalReviewRequested: boolean;
  prescriptionReviewRequested: boolean;
  prescriptionPreviewPayload: PrescriptionPreviewPayload | null;
  draftingPipelineActive: boolean;
  pendingDisposition: DispositionType | null;
  setRoundsDrawerOpen: (open: boolean) => void;
  setAdmitModalOpen: (open: boolean) => void;
  setDischargeModalOpen: (open: boolean) => void;
  setSaveDialogOpen: (open: boolean) => void;
  requestNotesPreview: (options?: { suggestQuery?: string }) => void;
  requestClinicalNoteReview: () => void;
  requestPrescriptionReview: (options?: { suggestQuery?: string }) => void;
  openPrescriptionPreview: (payload: PrescriptionPreviewPayload) => void;
  clearClinicalReview: () => void;
  clearPrescriptionReview: () => void;
  clearPrescriptionPreview: () => void;
  startDraftingPipeline: () => void;
  endDraftingPipeline: () => void;
  setPendingDisposition: (value: DispositionType | null) => void;
  reset: () => void;
}

export const useEncounterUiStore = create<EncounterUiState>((set) => ({
  roundsDrawerOpen: false,
  admitModalOpen: false,
  dischargeModalOpen: false,
  saveDialogOpen: false,
  notesPreviewNonce: 0,
  prescriptionSuggestQuery: null,
  clinicalReviewRequested: false,
  prescriptionReviewRequested: false,
  prescriptionPreviewPayload: null,
  draftingPipelineActive: false,
  pendingDisposition: null,
  setRoundsDrawerOpen: (open) => set({ roundsDrawerOpen: open }),
  setAdmitModalOpen: (open) => set({ admitModalOpen: open }),
  setDischargeModalOpen: (open) => set({ dischargeModalOpen: open }),
  setSaveDialogOpen: (open) => set({ saveDialogOpen: open }),
  requestNotesPreview: (options) =>
    set((state) => ({
      notesPreviewNonce: state.notesPreviewNonce + 1,
      prescriptionSuggestQuery: options?.suggestQuery?.trim() || null,
    })),
  requestClinicalNoteReview: () => set({ clinicalReviewRequested: true }),
  requestPrescriptionReview: (options) =>
    set((state) => ({
      prescriptionReviewRequested: true,
      prescriptionSuggestQuery: options?.suggestQuery?.trim() || state.prescriptionSuggestQuery,
    })),
  clearClinicalReview: () => set({ clinicalReviewRequested: false }),
  clearPrescriptionReview: () => set({ prescriptionReviewRequested: false }),
  openPrescriptionPreview: (payload) =>
    set({
      prescriptionPreviewPayload: payload,
      prescriptionReviewRequested: false,
    }),
  clearPrescriptionPreview: () =>
    set({
      prescriptionPreviewPayload: null,
      prescriptionReviewRequested: true,
    }),
  startDraftingPipeline: () => set({ draftingPipelineActive: true }),
  endDraftingPipeline: () => set({ draftingPipelineActive: false }),
  setPendingDisposition: (value) => set({ pendingDisposition: value }),
  reset: () =>
    set({
      roundsDrawerOpen: false,
      admitModalOpen: false,
      dischargeModalOpen: false,
      saveDialogOpen: false,
      notesPreviewNonce: 0,
      prescriptionSuggestQuery: null,
      clinicalReviewRequested: false,
      prescriptionReviewRequested: false,
      prescriptionPreviewPayload: null,
      draftingPipelineActive: false,
      pendingDisposition: null,
    }),
}));
