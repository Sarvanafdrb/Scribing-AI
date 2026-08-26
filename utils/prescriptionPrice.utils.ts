import type { AiNotesMedication } from "@/types/ai-notes.types";
import { validateMedicationDaysValue } from "@/utils/prescriptionMedication.utils";

export const formatPrescriptionPrice = (price?: number | null): string => {
  if (typeof price !== "number" || !Number.isFinite(price)) return "—";
  return `₹${price.toFixed(2)}`;
};

export const formatUnitPrescriptionPrice = (
  price: number,
  formUnit: string,
): string => `${formatPrescriptionPrice(price)}/${formUnit}`;

export const parseDoseSlot = (value: string | undefined): number => {
  const trimmed = value?.trim() || "";
  if (!trimmed) return 0;
  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
};

export const getMedicationDailyQuantity = (med: AiNotesMedication): number =>
  parseDoseSlot(med.morning) +
  parseDoseSlot(med.afternoon) +
  parseDoseSlot(med.night);

export const getMedicationFormUnit = (med: AiNotesMedication): string => {
  const form = med.formSnapshot?.trim();
  if (form) return form.toLowerCase();
  return "tablet";
};

export type MedicationDurationParse = {
  durationDays: number | null;
  isOngoing: boolean;
};

export const parseMedicationDurationDays = (
  days: string | undefined,
): MedicationDurationParse => {
  const trimmed = days?.trim() || "";
  if (!trimmed) {
    return { durationDays: null, isOngoing: false };
  }
  if (/^ongoing$/i.test(trimmed)) {
    return { durationDays: null, isOngoing: true };
  }
  const result = validateMedicationDaysValue(days);
  if (result.valid) {
    return { durationDays: result.value, isOngoing: false };
  }
  return { durationDays: null, isOngoing: false };
};

export type MedicationCostBreakdown = {
  unitPrice: number;
  formUnit: string;
  dailyQuantity: number;
  durationDays: number | null;
  isOngoing: boolean;
  totalQuantity: number | null;
  dailyCost: number;
  courseTotalCost: number | null;
  monthlyEstimate: number;
};

export const getMedicationCostBreakdown = (
  med: AiNotesMedication,
): MedicationCostBreakdown | null => {
  const unitPrice = getEditableMedicationPrice(med);
  if (unitPrice === undefined) return null;

  const dailyQuantity = getMedicationDailyQuantity(med);
  const { durationDays, isOngoing } = parseMedicationDurationDays(med.days);
  const dailyCost = unitPrice * dailyQuantity;
  const formUnit = getMedicationFormUnit(med);
  const totalQuantity =
    durationDays !== null && dailyQuantity > 0
      ? dailyQuantity * durationDays
      : null;
  const courseTotalCost =
    durationDays !== null ? dailyCost * durationDays : null;

  return {
    unitPrice,
    formUnit,
    dailyQuantity,
    durationDays,
    isOngoing,
    totalQuantity,
    dailyCost,
    courseTotalCost,
    monthlyEstimate: dailyCost * 30,
  };
};

/** Course cost when duration is set; otherwise 30-day estimate for ongoing medicines. */
export const getMedicationDisplayTotalCost = (
  med: AiNotesMedication,
): number | undefined => {
  const breakdown = getMedicationCostBreakdown(med);
  if (!breakdown) return undefined;
  if (breakdown.courseTotalCost !== null) return breakdown.courseTotalCost;
  if (breakdown.isOngoing) return breakdown.monthlyEstimate;
  return undefined;
};

export type PrescriptionCostSummary = {
  courseTotal: number;
  monthlyOngoing: number;
  grandTotal: number;
  hasOngoing: boolean;
  hasFixedDuration: boolean;
};

export const getPrescriptionCostSummary = (
  medications: AiNotesMedication[],
): PrescriptionCostSummary => {
  let courseTotal = 0;
  let monthlyOngoing = 0;
  let hasOngoing = false;
  let hasFixedDuration = false;

  for (const med of medications) {
    const breakdown = getMedicationCostBreakdown(med);
    if (!breakdown) continue;

    if (breakdown.courseTotalCost !== null) {
      courseTotal += breakdown.courseTotalCost;
      hasFixedDuration = true;
    } else if (breakdown.isOngoing) {
      monthlyOngoing += breakdown.monthlyEstimate;
      hasOngoing = true;
    }
  }

  return {
    courseTotal,
    monthlyOngoing,
    grandTotal: courseTotal + monthlyOngoing,
    hasOngoing,
    hasFixedDuration,
  };
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
