import { MIN_CLIENT_REFERENCE_LENGTH } from "@/utils/ip-admission-billing.utils";
import { generateClientReferenceId } from "@/utils/ip-money.utils";

export { MIN_CLIENT_REFERENCE_LENGTH };

export const IP_MEDICINE_CLIENT_REF_PREFIX = {
  dispense: "ipm-disp",
  payment: "ipm-pay",
  return: "ipm-ret",
  refund: "ipm-ref",
} as const;

const stableReferenceByOperationKey = new Map<string, string>();

/**
 * Returns the same clientReferenceId for a logical operation key until cleared.
 * New ids use {@link generateClientReferenceId} (shared with IP admission billing).
 */
export const getStableClientReferenceId = (
  operationKey: string,
  prefix: string,
): string => {
  const key = operationKey.trim();
  if (!key) {
    throw new Error("operationKey is required for stable client references");
  }
  const existing = stableReferenceByOperationKey.get(key);
  if (existing) return existing;
  const created = generateClientReferenceId(prefix);
  stableReferenceByOperationKey.set(key, created);
  return created;
};

export const clearStableClientReferenceId = (operationKey: string): void => {
  stableReferenceByOperationKey.delete(operationKey.trim());
};

export const buildIpMedicineDispenseOperationKey = (input: {
  encounterId: string;
  orderId: string;
  prescriptionLineId: string;
  quantity: number;
}): string =>
  [
    "dispense",
    input.encounterId,
    input.orderId,
    input.prescriptionLineId,
    String(input.quantity),
  ].join(":");

export const buildIpMedicinePaymentOperationKey = (input: {
  encounterId: string;
  clientReferenceId: string;
}): string => `payment:${input.encounterId}:${input.clientReferenceId.trim()}`;

export const buildIpMedicineReturnOperationKey = (input: {
  encounterId: string;
  chargeId: string;
  quantity: number;
}): string =>
  ["return", input.encounterId, input.chargeId, String(input.quantity)].join(
    ":",
  );

export const buildIpMedicineRefundOperationKey = (input: {
  encounterId: string;
  returnChargeId: string;
  amountPaise: number;
}): string =>
  [
    "refund",
    input.encounterId,
    input.returnChargeId,
    String(input.amountPaise),
  ].join(":");

export const isValidEncounterIdParam = (encounterId: string | undefined): boolean =>
  typeof encounterId === "string" &&
  /^[0-9a-fA-F]{24}$/.test(encounterId.trim());

/** Test-only reset for stable reference map. */
export const resetStableClientReferenceIdsForTests = (): void => {
  stableReferenceByOperationKey.clear();
};
