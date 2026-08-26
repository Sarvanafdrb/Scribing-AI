import type { AiNotesMedication } from "@/types/ai-notes.types";
import type { Prescription, SignPrescriptionMedication } from "@/types/prescription.types";
import { getCatalogMedicationIdentity } from "@/utils/prescriptionMedication.utils";

/** Clinical medication payload for POST /prescription/sign — no billing fields. */
export const toSignPrescriptionMedications = (
  medications: AiNotesMedication[],
): SignPrescriptionMedication[] =>
  medications
    .filter((medication) => medication.medicine.trim())
    .map((medication) => ({
      medicine: medication.medicine.trim(),
      ...(medication.medicineId?.trim()
        ? { medicineId: medication.medicineId.trim() }
        : {}),
      ...(medication.medicineNameSnapshot?.trim()
        ? { medicineNameSnapshot: medication.medicineNameSnapshot.trim() }
        : {}),
      ...(medication.strengthSnapshot?.trim()
        ? { strengthSnapshot: medication.strengthSnapshot.trim() }
        : {}),
      morning: (medication.morning || "0").trim(),
      afternoon: (medication.afternoon || "0").trim(),
      night: (medication.night || "0").trim(),
      days: (medication.days || "").trim(),
      ...(medication.instructions?.trim()
        ? { instructions: medication.instructions.trim() }
        : {}),
    }));

const normalizeDoseSlot = (value: string | undefined): string =>
  (value || "0").trim() || "0";

/** True when signed billing items match the current editable medication rows. */
export const signedBillingMatchesMedications = (
  billing: Prescription | null | undefined,
  medications: AiNotesMedication[],
): boolean => {
  if (!billing) return false;

  const namedMedications = medications.filter((medication) =>
    medication.medicine.trim(),
  );
  if (billing.items.length !== namedMedications.length) return false;

  return namedMedications.every((medication, index) => {
    const item = billing.items[index];
    if (!item) return false;

    const identity = getCatalogMedicationIdentity(medication);
    const itemName = item.medicineNameSnapshot.trim().toLowerCase();
    const itemStrength = (item.strengthSnapshot || "").trim().toLowerCase();

    if (itemName !== identity.name) return false;
    if (itemStrength !== identity.strength) return false;

    if (normalizeDoseSlot(item.morning) !== normalizeDoseSlot(medication.morning)) {
      return false;
    }
    if (
      normalizeDoseSlot(item.afternoon) !==
      normalizeDoseSlot(medication.afternoon)
    ) {
      return false;
    }
    if (normalizeDoseSlot(item.night) !== normalizeDoseSlot(medication.night)) {
      return false;
    }

    const days = medication.days?.trim() || "";
    if (String(item.durationDays) !== days) return false;

    const medicineId = medication.medicineId?.trim() || "";
    const itemMedicineId = item.medicineId?.trim() || "";
    if (medicineId !== itemMedicineId) return false;

    return true;
  });
};

export const signPayloadHasBillingFields = (
  payload: Record<string, unknown>,
): boolean => {
  const blockedKeys = [
    "dailyQuantity",
    "dailyCost",
    "totalQuantity",
    "lineTotalCost",
    "unitPriceSnapshot",
    "subtotal",
    "grandTotal",
    "priceAtPrescription",
    "catalogCostPreview",
  ];
  return blockedKeys.some((key) => key in payload);
};
