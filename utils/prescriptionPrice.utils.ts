import type { AiNotesMedication } from "@/types/ai-notes.types";

export const formatPrescriptionPrice = (price?: number | null): string => {
  if (typeof price !== "number" || !Number.isFinite(price)) return "—";
  return `₹${price.toFixed(2)}`;
};

export const getMedicationDisplayName = (med: AiNotesMedication): string => {
  const name = (med.medicineNameSnapshot || med.medicine || "").trim();
  const strength = (med.strengthSnapshot || "").trim();
  if (name && strength) return `${name} ${strength}`;
  return name || "—";
};

export const getMedicationDoseLabel = (med: AiNotesMedication): string | undefined => {
  if (!med.morning && !med.afternoon && !med.night) return undefined;
  return `${med.morning || "0"}-${med.afternoon || "0"}-${med.night || "0"}`;
};

/** Saved snapshot price only — use for history and persisted prescription display. */
export const getSavedMedicationPrice = (
  med: AiNotesMedication,
): number | undefined =>
  typeof med.priceAtPrescription === "number" &&
  Number.isFinite(med.priceAtPrescription)
    ? med.priceAtPrescription
    : undefined;

/** Saved snapshot, or unsaved catalog preview cost for editable prescription UI/export preview. */
export const getEditableMedicationPrice = (
  med: AiNotesMedication,
): number | undefined => {
  const saved = getSavedMedicationPrice(med);
  if (saved !== undefined) return saved;
  if (
    med.medicineId &&
    typeof med.catalogCostPreview === "number" &&
    Number.isFinite(med.catalogCostPreview)
  ) {
    return med.catalogCostPreview;
  }
  return undefined;
};

export const formatSavedMedicationPrice = (med: AiNotesMedication): string =>
  formatPrescriptionPrice(getSavedMedicationPrice(med));

export const formatEditableMedicationPrice = (med: AiNotesMedication): string =>
  formatPrescriptionPrice(getEditableMedicationPrice(med));

export const isUnsavedCatalogMedicationPrice = (
  med: AiNotesMedication,
): boolean =>
  Boolean(
    med.medicineId &&
      getSavedMedicationPrice(med) === undefined &&
      getEditableMedicationPrice(med) !== undefined,
  );
