import type {
  IpMedicineBalance,
  IpMedicineCharge,
  IpMedicinePaymentMethod,
} from "@/types/ip-medicine-billing.types";
import { canRecordIpMedicinePaymentFromPermissions } from "@/constants/permissions";
import { rupeesInputToPaise } from "@/utils/ip-money.utils";
import { chargeTypeLabel } from "@/utils/ip-pharmacy-desk.utils";

export { canRecordIpMedicinePaymentFromPermissions as canRecordIpMedicinePayment };

export const IP_MEDICINE_PAYMENT_METHODS: IpMedicinePaymentMethod[] = [
  "cash",
  "upi",
  "card",
  "other",
];

export type IpPharmacyEligibleDispenseCharge = {
  chargeId: string;
  description: string;
  amountPaise: number;
  allocatedPaise: number;
  outstandingPaise: number;
  quantity: number;
  paymentStatus: IpMedicineCharge["paymentStatus"];
};

export const buildEligibleDispenseChargeTargets = (
  charges: IpMedicineCharge[] | null | undefined,
): IpPharmacyEligibleDispenseCharge[] => {
  if (!charges?.length) return [];
  return charges
    .filter(
      (c) =>
        c.chargeType === "dispense" &&
        c.amountPaise > 0 &&
        c.outstandingPaise > 0,
    )
    .map((c) => ({
      chargeId: c.id,
      description: `${chargeTypeLabel(c.chargeType)} · qty ${c.quantity}`,
      amountPaise: c.amountPaise,
      allocatedPaise: c.allocatedPaise,
      outstandingPaise: c.outstandingPaise,
      quantity: c.quantity,
      paymentStatus: c.paymentStatus,
    }));
};

export const hasEligibleMedicinePaymentCharges = (
  charges: IpMedicineCharge[] | null | undefined,
): boolean => buildEligibleDispenseChargeTargets(charges).length > 0;

export type IpPharmacyPaymentAllocationDraft = {
  chargeId: string;
  amountRupees: string;
};

export type ValidateIpPharmacyPaymentInput = {
  canRecord: boolean;
  admissionDischarged: boolean;
  eligibleCharges: IpPharmacyEligibleDispenseCharge[];
  method: string;
  receiptReference?: string;
  clientReferenceId: string;
  allocationDrafts: IpPharmacyPaymentAllocationDraft[];
};

export type ValidateIpPharmacyPaymentResult =
  | {
      ok: true;
      amountPaise: number;
      method: IpMedicinePaymentMethod;
      clientReferenceId: string;
      receiptReference?: string;
      allocations: Array<{ chargeId: string; amountPaise: number }>;
    }
  | { ok: false; message: string };

export const buildIpPharmacyPaymentAttemptKey = (
  encounterId: string,
  attemptId: string,
): string => `payment-attempt:${encounterId}:${attemptId}`;

export const canShowRecordMedicinePaymentControl = (input: {
  canRecord: boolean;
  admissionDischarged: boolean;
  charges: IpMedicineCharge[] | null | undefined;
}): boolean => {
  if (!input.canRecord) return false;
  if (input.admissionDischarged) return false;
  return hasEligibleMedicinePaymentCharges(input.charges);
};

export const validateIpPharmacyMedicinePayment = (
  input: ValidateIpPharmacyPaymentInput,
): ValidateIpPharmacyPaymentResult => {
  if (!input.canRecord) {
    return {
      ok: false,
      message: "You do not have permission to record medicine payments.",
    };
  }
  if (input.admissionDischarged) {
    return {
      ok: false,
      message: "Medicine payments cannot be recorded for discharged admissions.",
    };
  }
  if (input.eligibleCharges.length === 0) {
    return {
      ok: false,
      message: "There are no unpaid dispense charges to allocate.",
    };
  }
  if (input.clientReferenceId.trim().length < 8) {
    return {
      ok: false,
      message: "Payment client reference must be at least 8 characters.",
    };
  }
  if (!IP_MEDICINE_PAYMENT_METHODS.includes(input.method as IpMedicinePaymentMethod)) {
    return { ok: false, message: "Unsupported payment method." };
  }

  const eligibleIds = new Set(input.eligibleCharges.map((c) => c.chargeId));
  const allocations: Array<{ chargeId: string; amountPaise: number }> = [];
  const seen = new Set<string>();

  for (const row of input.allocationDrafts) {
    const chargeId = row.chargeId.trim();
    if (!chargeId) continue;
    const amountPaise = rupeesInputToPaise(row.amountRupees);
    if (amountPaise == null) {
      return { ok: false, message: "Each allocation must be a valid amount." };
    }
    if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
      return {
        ok: false,
        message: "Each allocation must be a positive whole paise amount.",
      };
    }
    if (!eligibleIds.has(chargeId)) {
      return {
        ok: false,
        message: "Allocations must target eligible dispense charges only.",
      };
    }
    if (seen.has(chargeId)) {
      return { ok: false, message: "Each charge can appear only once." };
    }
    seen.add(chargeId);
    const target = input.eligibleCharges.find((c) => c.chargeId === chargeId)!;
    if (amountPaise > target.outstandingPaise) {
      return {
        ok: false,
        message: "An allocation exceeds the charge remaining payable amount.",
      };
    }
    allocations.push({ chargeId, amountPaise });
  }

  if (allocations.length === 0) {
    return {
      ok: false,
      message: "Allocate payment to at least one dispense charge.",
    };
  }

  const amountPaise = allocations.reduce((s, a) => s + a.amountPaise, 0);
  if (amountPaise <= 0) {
    return { ok: false, message: "Payment amount must be positive." };
  }

  const receipt = input.receiptReference?.trim();
  return {
    ok: true,
    amountPaise,
    method: input.method as IpMedicinePaymentMethod,
    clientReferenceId: input.clientReferenceId.trim(),
    ...(receipt ? { receiptReference: receipt } : {}),
    allocations,
  };
};

export const summarizeMedicineBalanceForPayment = (
  balance: IpMedicineBalance | null | undefined,
): {
  outstandingPaise: number;
  creditPaise: number;
  paymentStatus: string;
} | null => {
  if (!balance) return null;
  return {
    outstandingPaise: balance.outstandingPaise,
    creditPaise: balance.creditPaise,
    paymentStatus: balance.paymentStatus,
  };
};
