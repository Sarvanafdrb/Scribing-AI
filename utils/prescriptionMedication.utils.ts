import type { AiNotesMedication } from "@/types/ai-notes.types";
import type { MedicineSearchResult } from "@/types/medicine.types";

const normalizeCatalogToken = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

export type CatalogMedicationIdentity = {
  medicineId: string;
  name: string;
  strength: string;
};

export const getCatalogMedicationIdentity = (
  med: Pick<
    AiNotesMedication,
    "medicineId" | "medicineNameSnapshot" | "medicine" | "strengthSnapshot"
  >,
): CatalogMedicationIdentity => ({
  medicineId: med.medicineId?.trim() || "",
  name: normalizeCatalogToken(med.medicineNameSnapshot || med.medicine || ""),
  strength: normalizeCatalogToken(med.strengthSnapshot || ""),
});

export const getCatalogIdentityFromSearchResult = (
  medicine: MedicineSearchResult,
): CatalogMedicationIdentity => ({
  medicineId: medicine.id,
  name: normalizeCatalogToken(medicine.name),
  strength: normalizeCatalogToken(medicine.strength || ""),
});

/** Keys used to detect duplicate medications across catalog, manual, and AI rows. */
export const getMedicationDuplicateKeys = (
  med: Pick<
    AiNotesMedication,
    | "medicineId"
    | "medicineNameSnapshot"
    | "medicine"
    | "strengthSnapshot"
  >,
): Set<string> => {
  const keys = new Set<string>();
  const identity = getCatalogMedicationIdentity(med);

  if (identity.medicineId) {
    keys.add(`id:${identity.medicineId}`);
  }

  if (identity.name && identity.strength) {
    keys.add(`ns:${identity.name}::${identity.strength}`);
    keys.add(
      `full:${normalizeCatalogToken(`${identity.name} ${identity.strength}`)}`,
    );
  } else if (identity.name) {
    keys.add(`full:${identity.name}`);
  }

  const medicineField = normalizeCatalogToken(med.medicine || "");
  if (medicineField) {
    keys.add(`full:${medicineField}`);
  }

  return keys;
};

export const medicationsAreDuplicates = (
  left: Pick<
    AiNotesMedication,
    | "medicineId"
    | "medicineNameSnapshot"
    | "medicine"
    | "strengthSnapshot"
  >,
  right: Pick<
    AiNotesMedication,
    | "medicineId"
    | "medicineNameSnapshot"
    | "medicine"
    | "strengthSnapshot"
  >,
): boolean => {
  const leftKeys = getMedicationDuplicateKeys(left);
  const rightKeys = getMedicationDuplicateKeys(right);
  for (const key of leftKeys) {
    if (rightKeys.has(key)) return true;
  }
  return false;
};

export const formatMedicationDuplicateLabel = (
  med: Pick<
    AiNotesMedication,
    "medicine" | "medicineNameSnapshot" | "strengthSnapshot"
  >,
): string => {
  const name = (med.medicineNameSnapshot || med.medicine || "Medication").trim();
  const strength = med.strengthSnapshot?.trim();
  return strength ? `${name} ${strength}` : name;
};

export const findIncompleteMedicationRowIndexes = (
  medications: AiNotesMedication[],
): number[] =>
  medications.flatMap((medication, index) =>
    medication.medicine?.trim() ? [] : [index],
  );

export const findDuplicateMedicationIssue = (
  medications: AiNotesMedication[],
): { index: number; label: string } | null => {
  const seenKeys = new Map<string, number>();

  for (let index = 0; index < medications.length; index += 1) {
    const medication = medications[index];
    for (const key of getMedicationDuplicateKeys(medication)) {
      if (seenKeys.has(key)) {
        return {
          index,
          label: formatMedicationDuplicateLabel(medication),
        };
      }
      seenKeys.set(key, index);
    }
  }

  return null;
};

export type PrescriptionMedicationValidationResult =
  | { valid: true }
  | { valid: false; message: string; medicationIndex?: number };

/** Maximum allowed prescription duration in days (inclusive). */
export const PRESCRIPTION_DAYS_MAX = 365;

export const hasMedicationDosageFrequency = (
  med: Pick<AiNotesMedication, "morning" | "afternoon" | "night">,
): boolean =>
  Boolean(
    med.morning?.trim() || med.afternoon?.trim() || med.night?.trim(),
  );

export type MedicationDaysValidation =
  | { valid: true; value: number }
  | { valid: false; reason: "missing" | "invalid" | "too_large" };

export const validateMedicationDaysValue = (
  days: string | undefined,
): MedicationDaysValidation => {
  const trimmed = days?.trim() || "";
  if (!trimmed) {
    return { valid: false, reason: "missing" };
  }
  if (!/^\d+$/.test(trimmed)) {
    return { valid: false, reason: "invalid" };
  }
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return { valid: false, reason: "invalid" };
  }
  if (parsed > PRESCRIPTION_DAYS_MAX) {
    return { valid: false, reason: "too_large" };
  }
  return { valid: true, value: parsed };
};

const getClinicalCompletenessMessage = (
  row: number,
  daysResult: Extract<MedicationDaysValidation, { valid: false }>,
): string => {
  if (daysResult.reason === "missing") {
    return `Medication ${row} requires the number of days.`;
  }
  if (daysResult.reason === "too_large") {
    return `Medication ${row} days cannot exceed ${PRESCRIPTION_DAYS_MAX}.`;
  }
  return `Medication ${row} days must be a positive whole number.`;
};

export const findClinicalCompletenessIssue = (
  medications: AiNotesMedication[],
): { index: number; message: string } | null => {
  for (let index = 0; index < medications.length; index += 1) {
    const row = index + 1;
    const medication = medications[index];

    if (!hasMedicationDosageFrequency(medication)) {
      return {
        index,
        message: `Medication ${row} needs at least one dosage/frequency.`,
      };
    }

    const daysResult = validateMedicationDaysValue(medication.days);
    if (!daysResult.valid) {
      return {
        index,
        message: getClinicalCompletenessMessage(row, daysResult),
      };
    }
  }

  return null;
};

export type PrescriptionCompletionIssue = {
  medicationIndex: number;
  rowNumber: number;
  label: string;
  message: string;
};

/** True when at least one medication row has a non-empty medicine name. */
export const hasNamedPrescriptionMedications = (
  medications: AiNotesMedication[],
): boolean => medications.some((medication) => Boolean(medication.medicine?.trim()));

/**
 * Collect all prescription issues that should warn before consultation completion.
 * Reuses Phase A/B rules; returns no issues for an empty prescription.
 */
export const findPrescriptionCompletionIssues = (
  medications: AiNotesMedication[],
): PrescriptionCompletionIssue[] => {
  if (!hasNamedPrescriptionMedications(medications)) {
    return [];
  }

  const issues: PrescriptionCompletionIssue[] = [];
  const issueKeys = new Set<string>();

  const pushIssue = (issue: PrescriptionCompletionIssue) => {
    const key = `${issue.medicationIndex}:${issue.message}`;
    if (issueKeys.has(key)) return;
    issueKeys.add(key);
    issues.push(issue);
  };

  for (const index of findIncompleteMedicationRowIndexes(medications)) {
    pushIssue({
      medicationIndex: index,
      rowNumber: index + 1,
      label: `Row ${index + 1}`,
      message: `Medication ${index + 1} is incomplete. Add a medicine name or remove it.`,
    });
  }

  const seenDuplicateKeys = new Map<string, number>();
  for (let index = 0; index < medications.length; index += 1) {
    const medication = medications[index];
    for (const key of getMedicationDuplicateKeys(medication)) {
      if (!seenDuplicateKeys.has(key)) {
        seenDuplicateKeys.set(key, index);
        continue;
      }

      const firstIndex = seenDuplicateKeys.get(key)!;
      const label = formatMedicationDuplicateLabel(medication);
      pushIssue({
        medicationIndex: firstIndex,
        rowNumber: firstIndex + 1,
        label,
        message: `Duplicate medication: ${label} is already in this prescription.`,
      });
      pushIssue({
        medicationIndex: index,
        rowNumber: index + 1,
        label,
        message: `Duplicate medication: ${label} is already in this prescription.`,
      });
    }
  }

  for (let index = 0; index < medications.length; index += 1) {
    const medication = medications[index];
    if (!medication.medicine?.trim()) continue;

    const row = index + 1;
    const label = formatMedicationDuplicateLabel(medication);

    if (!hasMedicationDosageFrequency(medication)) {
      pushIssue({
        medicationIndex: index,
        rowNumber: row,
        label,
        message: `Medication ${row} needs at least one dosage/frequency.`,
      });
    }

    const daysResult = validateMedicationDaysValue(medication.days);
    if (!daysResult.valid) {
      pushIssue({
        medicationIndex: index,
        rowNumber: row,
        label,
        message: getClinicalCompletenessMessage(row, daysResult),
      });
    }
  }

  return issues.sort(
    (left, right) =>
      left.rowNumber - right.rowNumber ||
      left.message.localeCompare(right.message),
  );
};

export const hasPrescriptionCompletionWarnings = (
  medications: AiNotesMedication[],
): boolean => findPrescriptionCompletionIssues(medications).length > 0;

export const validatePrescriptionMedications = (
  medications: AiNotesMedication[],
): PrescriptionMedicationValidationResult => {
  const incompleteIndexes = findIncompleteMedicationRowIndexes(medications);
  if (incompleteIndexes.length > 0) {
    return {
      valid: false,
      medicationIndex: incompleteIndexes[0],
      message: `Medication ${incompleteIndexes[0] + 1} is incomplete. Add a medicine name or remove it.`,
    };
  }

  const duplicate = findDuplicateMedicationIssue(medications);
  if (duplicate) {
    return {
      valid: false,
      medicationIndex: duplicate.index,
      message: `Duplicate medication: ${duplicate.label} is already in this prescription.`,
    };
  }

  const clinicalIssue = findClinicalCompletenessIssue(medications);
  if (clinicalIssue) {
    return {
      valid: false,
      medicationIndex: clinicalIssue.index,
      message: clinicalIssue.message,
    };
  }

  return { valid: true };
};

export const wouldDuplicateMedication = (
  candidate: AiNotesMedication,
  existing: AiNotesMedication[],
): boolean =>
  existing.some((row) => medicationsAreDuplicates(candidate, row));

export const COMPLETED_PRESCRIPTION_MEDICATION_MESSAGE =
  "Cannot modify prescription medications on a completed consultation";

/** Compare meaningful prescription medication content; ignores priceAtPrescription. */
export const getPrescriptionMedicationContentSignature = (
  med: Pick<
    AiNotesMedication,
    | "medicine"
    | "medicineId"
    | "medicineNameSnapshot"
    | "strengthSnapshot"
    | "morning"
    | "afternoon"
    | "night"
    | "days"
    | "instructions"
  >,
): string =>
  JSON.stringify({
    medicine: med.medicine.trim(),
    medicineId: med.medicineId?.trim() || "",
    medicineNameSnapshot: (med.medicineNameSnapshot || "").trim(),
    strengthSnapshot: (med.strengthSnapshot || "").trim(),
    morning: (med.morning || "").trim(),
    afternoon: (med.afternoon || "").trim(),
    night: (med.night || "").trim(),
    days: (med.days || "").trim(),
    instructions: (med.instructions || "").trim(),
  });

export const prescriptionMedicationsContentEqual = (
  left: AiNotesMedication[],
  right: AiNotesMedication[],
): boolean => {
  if (left.length !== right.length) return false;
  return left.every(
    (med, index) =>
      getPrescriptionMedicationContentSignature(med) ===
      getPrescriptionMedicationContentSignature(right[index]),
  );
};

export const voiceEditMedicationsChanged = (
  existingMedications: AiNotesMedication[] | undefined,
  proposedMedications: AiNotesMedication[] | undefined,
): boolean =>
  !prescriptionMedicationsContentEqual(
    existingMedications || [],
    proposedMedications || [],
  );

export type VoiceEditMedicationGuardResult =
  | { allowed: true }
  | { allowed: false; message: string };

export const assertVoiceEditMedicationsAllowedForCompletedSession = (
  existingMedications: AiNotesMedication[] | undefined,
  proposedMedications: AiNotesMedication[] | undefined,
): VoiceEditMedicationGuardResult => {
  if (!voiceEditMedicationsChanged(existingMedications, proposedMedications)) {
    return { allowed: true };
  }
  return {
    allowed: false,
    message: COMPLETED_PRESCRIPTION_MEDICATION_MESSAGE,
  };
};

/** @deprecated Prefer wouldDuplicateMedication — kept for callers using search identity. */
export const isDuplicateCatalogMedication = (
  candidate: CatalogMedicationIdentity,
  existing: AiNotesMedication[],
): boolean => {
  const probe: AiNotesMedication = {
    medicine: candidate.strength
      ? `${candidate.name} ${candidate.strength}`.trim()
      : candidate.name,
    medicineId: candidate.medicineId || undefined,
    medicineNameSnapshot: candidate.name,
    strengthSnapshot: candidate.strength,
  };
  return wouldDuplicateMedication(probe, existing);
};
