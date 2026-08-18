import type { Medicine } from "@/types/medicine.types";
import { MEDICINE_FORMS } from "@/types/medicine.types";
import type { CreateMedicineData } from "@/types/medicine.types";

export type MedicineFormState = {
  name: string;
  genericName: string;
  brandName: string;
  dosageForm: string;
  strength: string;
  route: string;
  cost: string;
  conditions: string[];
};

export const emptyMedicineFormState = (): MedicineFormState => ({
  name: "",
  genericName: "",
  brandName: "",
  dosageForm: "",
  strength: "",
  route: "",
  cost: "",
  conditions: [],
});

export const formatMedicineCost = (cost?: number | null) => {
  const value = typeof cost === "number" && Number.isFinite(cost) ? cost : 0;
  return `₹${value.toFixed(2)}`;
};

export const parseMedicineCost = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
};

export const medicineSelectClassName =
  "flex h-10 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35";

export const isDosageFormValue = (value: string) =>
  MEDICINE_FORMS.some(
    (item) => item.toLowerCase() === value.trim().toLowerCase(),
  );

export const collectConditions = (listed: string[], draft: string) => {
  const next = [...listed];
  const pending = draft.trim();
  if (
    pending &&
    !next.some((item) => item.toLowerCase() === pending.toLowerCase())
  ) {
    next.push(pending);
  }
  return next;
};

export const mapMedicineToFormState = (medicine: Medicine): MedicineFormState => {
  const storedGeneric = (medicine.genericName || "").trim();
  return {
    name: medicine.name || "",
    genericName: isDosageFormValue(storedGeneric)
      ? medicine.name || ""
      : storedGeneric || medicine.name || "",
    brandName: medicine.brandName || "",
    dosageForm: medicine.form || "",
    strength: medicine.strength || "",
    route: medicine.route || "",
    cost:
      typeof medicine.cost === "number" && Number.isFinite(medicine.cost)
        ? String(medicine.cost)
        : "",
    conditions: (medicine.indications || []).map((item) => item.name),
  };
};

export const buildMedicinePayload = (
  fields: MedicineFormState,
  organizationId: string,
  conditionDraft = "",
  cost = 0,
): CreateMedicineData => {
  const conditions = collectConditions(fields.conditions, conditionDraft);

  let genericName = fields.genericName.trim();
  let dosageForm = fields.dosageForm.trim();
  if (isDosageFormValue(genericName)) {
    if (!dosageForm) {
      dosageForm =
        MEDICINE_FORMS.find(
          (item) => item.toLowerCase() === genericName.toLowerCase(),
        ) || dosageForm;
    }
    genericName = fields.name.trim();
  }
  if (!genericName) genericName = fields.name.trim();

  return {
    organizationId,
    name: fields.name.trim(),
    genericName,
    brandName: fields.brandName.trim() || undefined,
    form: dosageForm || undefined,
    strength: fields.strength.trim() || undefined,
    route: fields.route || undefined,
    cost,
    conditions,
    indications: conditions.map((name) => ({ name })),
  };
};
