import type { AiNotesMedication } from "@/types/ai-notes.types";
import type { MedicineSearchResult } from "@/types/medicine.types";
import {
  getCatalogIdentityFromSearchResult,
  getCatalogMedicationIdentity,
  normalizeCatalogToken,
} from "@/utils/prescriptionMedication.utils";
import { medicationFromFormulary } from "@/utils/prescription-draft.utils";

const normalizeStrengthToken = (value: string) =>
  normalizeCatalogToken(value).replace(/\s+/g, "");

export type MedicationCatalogLookupIdentity = {
  name: string;
  strength: string;
  form: string;
  fullMedicine: string;
};

/** Identity used to match a prescription row to exactly one catalog medicine. */
export const resolveMedicationCatalogLookupIdentity = (
  medication: AiNotesMedication,
): MedicationCatalogLookupIdentity => {
  let name = medication.medicineNameSnapshot?.trim() || "";
  let strength = medication.strengthSnapshot?.trim() || "";
  const form = medication.formSnapshot?.trim() || "";
  const full = medication.medicine?.trim() || "";

  if (name && !strength && full) {
    const prefix = `${name} `;
    if (full.toLowerCase().startsWith(prefix.toLowerCase())) {
      strength = full.slice(prefix.length).trim();
    }
  }

  if (!name && full) {
    name = full;
  }

  return {
    name: normalizeCatalogToken(name),
    strength: normalizeStrengthToken(strength),
    form: normalizeCatalogToken(form),
    fullMedicine: normalizeCatalogToken(full),
  };
};

const catalogDisplayIdentity = (catalog: MedicineSearchResult) => {
  const name = normalizeCatalogToken(catalog.name);
  const strength = normalizeStrengthToken(catalog.strength || "");
  const form = normalizeCatalogToken(catalog.form || "");
  const fullMedicine = normalizeCatalogToken(
    catalog.strength ? `${catalog.name} ${catalog.strength}` : catalog.name,
  );
  return { name, strength, form, fullMedicine };
};

const identitiesMatch = (
  lookup: MedicationCatalogLookupIdentity,
  catalog: MedicineSearchResult,
): boolean => {
  const candidate = catalogDisplayIdentity(catalog);

  if (lookup.fullMedicine && candidate.fullMedicine) {
    if (lookup.fullMedicine === candidate.fullMedicine) {
      if (lookup.form && candidate.form && lookup.form !== candidate.form) {
        return false;
      }
      return true;
    }
  }

  if (!lookup.name || lookup.name !== candidate.name) {
    return false;
  }

  if (lookup.strength || candidate.strength) {
    if (lookup.strength !== candidate.strength) {
      return false;
    }
  }

  if (lookup.form && candidate.form && lookup.form !== candidate.form) {
    return false;
  }

  return true;
};

/**
 * Returns exactly one catalog medicine when name/strength/form identity matches.
 * Never matches by name alone when multiple strengths exist.
 */
export const findExactCatalogMedicineMatch = (
  medication: AiNotesMedication,
  candidates: MedicineSearchResult[],
): MedicineSearchResult | null => {
  if (!candidates.length) return null;

  const existingId = medication.medicineId?.trim();
  if (existingId) {
    const byId = candidates.filter((candidate) => candidate.id === existingId);
    return byId.length === 1 ? byId[0] : null;
  }

  const lookup = resolveMedicationCatalogLookupIdentity(medication);
  if (!lookup.name && !lookup.fullMedicine) return null;

  const matched = candidates.filter((candidate) =>
    identitiesMatch(lookup, candidate),
  );

  if (matched.length !== 1) return null;
  return matched[0];
};

/** Shallow-clone saved medications for editable prescription state. */
export const hydrateSavedPrescriptionMedications = (
  medications: AiNotesMedication[] | undefined,
): AiNotesMedication[] => {
  if (!medications?.length) return [];
  return medications
    .filter((medication) => medication.medicine?.trim())
    .map((medication) => ({ ...medication }));
};

export const medicationHasResolvedCatalogPrice = (
  medication: AiNotesMedication,
): boolean => {
  if (
    typeof medication.priceAtPrescription === "number" &&
    Number.isFinite(medication.priceAtPrescription)
  ) {
    return true;
  }
  return Boolean(
    medication.medicineId?.trim() &&
      typeof medication.catalogCostPreview === "number" &&
      Number.isFinite(medication.catalogCostPreview),
  );
};

/** Merge catalog linkage onto an existing row without overwriting clinical edits. */
export const enrichMedicationWithCatalogMatch = (
  medication: AiNotesMedication,
  catalog: MedicineSearchResult,
): AiNotesMedication => {
  const catalogBase = medicationFromFormulary(catalog);
  const hasDosage = Boolean(
    medication.morning?.trim() ||
      medication.afternoon?.trim() ||
      medication.night?.trim(),
  );
  const hasDays = Boolean(medication.days?.trim());
  const hasInstructions = Boolean(medication.instructions?.trim());

  return {
    ...catalogBase,
    morning: hasDosage ? medication.morning : catalogBase.morning,
    afternoon: hasDosage ? medication.afternoon : catalogBase.afternoon,
    night: hasDosage ? medication.night : catalogBase.night,
    days: hasDays ? medication.days : catalogBase.days,
    instructions: hasInstructions
      ? medication.instructions
      : catalogBase.instructions,
    priceAtPrescription: medication.priceAtPrescription,
    catalogCostPreview: catalogBase.catalogCostPreview,
  };
};

export const buildCatalogSearchQueryForMedication = (
  medication: AiNotesMedication,
): string => {
  const lookup = resolveMedicationCatalogLookupIdentity(medication);
  if (lookup.name && lookup.strength) {
    return `${medication.medicineNameSnapshot?.trim() || lookup.name} ${medication.strengthSnapshot?.trim() || lookup.strength}`.trim();
  }
  if (lookup.fullMedicine) {
    return medication.medicine?.trim() || lookup.fullMedicine;
  }
  return medication.medicineNameSnapshot?.trim() || medication.medicine?.trim() || "";
};

export const enrichMedicationFromCatalogCandidates = (
  medication: AiNotesMedication,
  candidates: MedicineSearchResult[],
): AiNotesMedication => {
  if (medicationHasResolvedCatalogPrice(medication)) {
    return medication;
  }

  const match = findExactCatalogMedicineMatch(medication, candidates);
  if (!match) return medication;

  return enrichMedicationWithCatalogMatch(medication, match);
};

/** For tests — compare catalog identity helpers stay aligned. */
export const catalogIdentityMatchesMedication = (
  medication: AiNotesMedication,
  catalog: MedicineSearchResult,
): boolean => {
  const medIdentity = getCatalogMedicationIdentity(medication);
  const catalogIdentity = getCatalogIdentityFromSearchResult(catalog);
  if (medIdentity.medicineId && catalogIdentity.medicineId) {
    return medIdentity.medicineId === catalogIdentity.medicineId;
  }
  if (medIdentity.name !== catalogIdentity.name) return false;
  if (medIdentity.strength !== catalogIdentity.strength) return false;
  return true;
};
