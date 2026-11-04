import type {
  IpMedicineCharge,
  IpMedicineDispense,
  IpMedicineOrder,
} from "@/types/ip-medicine-billing.types";
import { canDispenseIpMedicineFromPermissions } from "@/constants/permissions";

export { canDispenseIpMedicineFromPermissions as canReturnIpMedicine };

export const sumReturnedQuantityForDispenseCharge = (
  charges: IpMedicineCharge[] | null | undefined,
  originalChargeId: string,
): number => {
  if (!charges?.length) return 0;
  return charges
    .filter(
      (c) =>
        c.chargeType === "return" && c.relatedChargeId === originalChargeId,
    )
    .reduce((sum, c) => sum + c.quantity, 0);
};

export type IpPharmacyReturnableDispenseTarget = {
  chargeId: string;
  dispenseId: string;
  dispenseReference: string;
  medicineLabel: string;
  dispensedQuantity: number;
  returnedQuantity: number;
  remainingReturnableQuantity: number;
  unitPricePaise: number;
};

const resolveMedicineLabel = (
  orders: IpMedicineOrder[] | null | undefined,
  prescriptionLineId: string,
): string => {
  if (!orders?.length) return "Medicine";
  for (const order of orders) {
    for (const line of order.lines ?? []) {
      if (line.prescriptionLineId === prescriptionLineId) {
        return line.medicineNameSnapshot || "Medicine";
      }
    }
  }
  return "Medicine";
};

export const buildReturnableDispenseTargets = (input: {
  charges: IpMedicineCharge[] | null | undefined;
  dispenses: IpMedicineDispense[] | null | undefined;
  orders: IpMedicineOrder[] | null | undefined;
}): IpPharmacyReturnableDispenseTarget[] => {
  const confirmedDispenseIds = new Set(
    (input.dispenses ?? []).map((d) => d.id),
  );
  const dispenseById = new Map(
    (input.dispenses ?? []).map((d) => [d.id, d] as const),
  );

  const targets: IpPharmacyReturnableDispenseTarget[] = [];
  for (const charge of input.charges ?? []) {
    if (charge.chargeType !== "dispense") continue;
    if (!charge.dispenseId || !confirmedDispenseIds.has(charge.dispenseId)) {
      continue;
    }
    const returnedQuantity = sumReturnedQuantityForDispenseCharge(
      input.charges,
      charge.id,
    );
    const remainingReturnableQuantity = charge.quantity - returnedQuantity;
    if (remainingReturnableQuantity <= 0) continue;

    const dispense = dispenseById.get(charge.dispenseId);
    const medicineLabel = dispense
      ? resolveMedicineLabel(input.orders, dispense.prescriptionLineId)
      : "Medicine";

    targets.push({
      chargeId: charge.id,
      dispenseId: charge.dispenseId,
      dispenseReference: dispense?.clientReferenceId ?? charge.dispenseId,
      medicineLabel,
      dispensedQuantity: charge.quantity,
      returnedQuantity,
      remainingReturnableQuantity,
      unitPricePaise: charge.unitPricePaise,
    });
  }
  return targets;
};

export const findReturnableTargetByChargeId = (
  targets: IpPharmacyReturnableDispenseTarget[],
  chargeId: string,
): IpPharmacyReturnableDispenseTarget | undefined =>
  targets.find((t) => t.chargeId === chargeId);

export const canShowReturnMedicineControl = (input: {
  canReturn: boolean;
  admissionDischarged: boolean;
  target: IpPharmacyReturnableDispenseTarget | null | undefined;
}): boolean => {
  if (!input.canReturn) return false;
  if (input.admissionDischarged) return false;
  if (!input.target) return false;
  return input.target.remainingReturnableQuantity > 0;
};

export type ValidateIpPharmacyReturnInput = {
  canReturn: boolean;
  admissionDischarged: boolean;
  target: IpPharmacyReturnableDispenseTarget | null | undefined;
  quantityInput: string;
  notes?: string;
  clientReferenceId: string;
};

export type ValidateIpPharmacyReturnResult =
  | {
      ok: true;
      chargeId: string;
      quantity: number;
      clientReferenceId: string;
      notes?: string;
    }
  | { ok: false; message: string };

export const buildIpPharmacyReturnAttemptKey = (
  encounterId: string,
  attemptId: string,
): string => `return-attempt:${encounterId}:${attemptId}`;

export const validateIpPharmacyReturn = (
  input: ValidateIpPharmacyReturnInput,
): ValidateIpPharmacyReturnResult => {
  if (!input.canReturn) {
    return {
      ok: false,
      message: "You do not have permission to record medicine returns.",
    };
  }
  if (input.admissionDischarged) {
    return {
      ok: false,
      message: "Returns are not available for discharged admissions.",
    };
  }
  if (!input.target) {
    return { ok: false, message: "Select a confirmed dispense charge to return." };
  }
  if (input.clientReferenceId.trim().length < 8) {
    return {
      ok: false,
      message: "Return client reference must be at least 8 characters.",
    };
  }

  const trimmed = input.quantityInput.trim();
  if (!trimmed) {
    return { ok: false, message: "Enter a return quantity." };
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    return { ok: false, message: "Return quantity must be a whole number." };
  }
  if (parsed <= 0) {
    return { ok: false, message: "Return quantity must be greater than zero." };
  }
  if (parsed > input.target.remainingReturnableQuantity) {
    return {
      ok: false,
      message: "Return quantity exceeds the remaining returnable quantity.",
    };
  }

  const notes = input.notes?.trim();
  return {
    ok: true,
    chargeId: input.target.chargeId,
    quantity: parsed,
    clientReferenceId: input.clientReferenceId.trim(),
    ...(notes ? { notes } : {}),
  };
};

export const buildIpPharmacyReturnRequest = (
  validated: Extract<ValidateIpPharmacyReturnResult, { ok: true }>,
) => ({
  chargeId: validated.chargeId,
  quantity: validated.quantity,
  clientReferenceId: validated.clientReferenceId,
  ...(validated.notes ? { notes: validated.notes } : {}),
});
