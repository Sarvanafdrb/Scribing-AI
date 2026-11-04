import type { IpPharmacyOrderLineRow } from "./ip-pharmacy-desk.utils";
import { canDispenseIpMedicineFromPermissions } from "@/constants/permissions";

export { canDispenseIpMedicineFromPermissions as canDispenseIpMedicine };

export type ValidateDispenseQuantityInput = {
  quantityInput: string;
  remainingQuantity: number;
  orderStatus: IpPharmacyOrderLineRow["orderStatus"];
  admissionDischarged: boolean;
  canDispense: boolean;
};

export type ValidateDispenseQuantityResult =
  | { ok: true; quantity: number }
  | { ok: false; message: string };

export const isOrderLineEligibleForDispense = (
  row: Pick<
    IpPharmacyOrderLineRow,
    "orderStatus" | "remainingQuantity"
  >,
): boolean => {
  if (row.orderStatus === "cancelled") return false;
  if (row.remainingQuantity <= 0) return false;
  return true;
};

export const canShowDispenseControl = (input: {
  canDispense: boolean;
  admissionDischarged: boolean;
  row: Pick<IpPharmacyOrderLineRow, "orderStatus" | "remainingQuantity">;
}): boolean => {
  if (!input.canDispense) return false;
  if (input.admissionDischarged) return false;
  return isOrderLineEligibleForDispense(input.row);
};

export const validateIpPharmacyDispenseQuantity = (
  input: ValidateDispenseQuantityInput,
): ValidateDispenseQuantityResult => {
  if (!input.canDispense) {
    return { ok: false, message: "You do not have permission to dispense medicines." };
  }
  if (input.admissionDischarged) {
    return {
      ok: false,
      message: "Dispensing is not available for discharged admissions.",
    };
  }
  if (input.orderStatus === "cancelled") {
    return { ok: false, message: "This medicine order was cancelled." };
  }
  if (input.remainingQuantity <= 0) {
    return { ok: false, message: "No remaining quantity to dispense." };
  }

  const trimmed = input.quantityInput.trim();
  if (!trimmed) {
    return { ok: false, message: "Enter a dispense quantity." };
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    return { ok: false, message: "Quantity must be a whole number." };
  }
  if (parsed <= 0) {
    return { ok: false, message: "Quantity must be greater than zero." };
  }
  if (parsed > input.remainingQuantity) {
    return {
      ok: false,
      message: `Quantity cannot exceed remaining (${input.remainingQuantity}).`,
    };
  }

  return { ok: true, quantity: parsed };
};

export const buildIpPharmacyDispenseRequest = (input: {
  orderId: string;
  prescriptionLineId: string;
  quantity: number;
  clientReferenceId: string;
}) => ({
  orderId: input.orderId,
  prescriptionLineId: input.prescriptionLineId,
  quantity: input.quantity,
  clientReferenceId: input.clientReferenceId.trim(),
});

/** Query slices refreshed after a successful dispense (encounter prefix covers all). */
export const IP_PHARMACY_POST_DISPENSE_QUERY_SLICES = [
  "orders",
  "dispenses",
  "charges",
  "balance",
  "payments",
  "audit",
] as const;
