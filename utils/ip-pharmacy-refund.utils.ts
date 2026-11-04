import type {
  IpMedicineBalance,
  IpMedicineCharge,
  IpMedicinePaymentMethod,
  IpMedicineRefund,
} from "@/types/ip-medicine-billing.types";
import { canRecordIpMedicinePaymentFromPermissions } from "@/constants/permissions";
import { rupeesInputToPaise } from "@/utils/ip-money.utils";
import { IP_MEDICINE_PAYMENT_METHODS } from "@/utils/ip-pharmacy-payment.utils";

export { canRecordIpMedicinePaymentFromPermissions as canRefundIpMedicine };

/**
 * Backend refund limits (`validateRefundRequest` + GET formatters):
 *
 * maxForReturn = computeMaxRefundableForReturnCharge(return)
 *   - if return.relatedChargeId: min(|return.amountPaise|, sumSucceededAllocations(original))
 *   - else: |return.amountPaise|
 *   - GET /charges `allocatedPaise` uses the same succeeded-allocation sum as the backend helper.
 *
 * alreadyForReturn = sum(IpMedicineRefund.amountPaise where relatedReturnChargeId = return._id)
 *   - GET /audit `refunds` is a full encounter list (no pagination).
 *
 * remainingForReturn = maxForReturn - alreadyForReturn (frontend pre-check; backend: already + amount <= maxForReturn)
 *
 * creditPaise (encounter limit) = max(0, netPaidPaise - totalChargePaise) where
 *   netPaidPaise = sumSucceededAllocations(all encounter charges) - sumRefundsForEncounter
 *   - Exposed directly as GET /balance `creditPaise` (authoritative for UI cap).
 *
 * maxPermittedRefund = min(remainingForReturn, creditPaise)
 *   - Backend validates amountPaise against each constraint separately (equivalent for integer paise).
 */

export const isIpMedicineRefundAuditRowValid = (
  row: IpMedicineRefund,
): boolean => {
  if (!row.relatedReturnChargeId?.trim()) return false;
  if (!Number.isInteger(row.amountPaise) || row.amountPaise <= 0) return false;
  return true;
};

export type RefundLimitDataAssessment = {
  reliable: boolean;
  reason?: string;
};

export const assessRefundLimitDataReliability = (input: {
  balance: IpMedicineBalance | null | undefined;
  balanceLoaded: boolean;
  refunds: IpMedicineRefund[] | null | undefined;
  auditRefundsLoaded: boolean;
}): RefundLimitDataAssessment => {
  if (!input.balanceLoaded || input.balance == null) {
    return {
      reliable: false,
      reason: "Medicine balance must be loaded before refund limits can be shown.",
    };
  }
  if (!input.auditRefundsLoaded || input.refunds == null) {
    return {
      reliable: false,
      reason: "Refund history must be loaded from the audit API before refund limits can be shown.",
    };
  }
  for (const row of input.refunds) {
    if (!isIpMedicineRefundAuditRowValid(row)) {
      return {
        reliable: false,
        reason: "Refund audit data is malformed; refund is disabled to avoid overstating limits.",
      };
    }
  }
  return { reliable: true };
};

export const sumRefundedPaiseForReturnCharge = (
  refunds: IpMedicineRefund[] | null | undefined,
  returnChargeId: string,
): number => {
  if (!refunds?.length) return 0;
  return refunds
    .filter((r) => r.relatedReturnChargeId === returnChargeId)
    .reduce((sum, r) => sum + r.amountPaise, 0);
};

/** Mirrors backend `computeMaxRefundableForReturnCharge` using GET /charges fields. */
export const computeMaxRefundableForReturnChargeFromApi = (input: {
  returnCharge: IpMedicineCharge;
  originalCharge: IpMedicineCharge | undefined;
}): number => {
  const absReturn = Math.abs(input.returnCharge.amountPaise);
  if (!input.returnCharge.relatedChargeId) {
    return absReturn;
  }
  const paidOnOriginal = input.originalCharge?.allocatedPaise ?? 0;
  return Math.min(absReturn, paidOnOriginal);
};

export type RefundLimitComputation = {
  maxForReturn: number;
  alreadyRefunded: number;
  remainingForReturn: number;
  encounterCredit: number;
  maxPermittedRefund: number;
};

export const computeRefundLimitsForReturnCharge = (input: {
  returnCharge: IpMedicineCharge;
  originalCharge: IpMedicineCharge | undefined;
  refunds: IpMedicineRefund[];
  balance: IpMedicineBalance;
}): RefundLimitComputation => {
  const maxForReturn = computeMaxRefundableForReturnChargeFromApi({
    returnCharge: input.returnCharge,
    originalCharge: input.originalCharge,
  });
  const alreadyRefunded = sumRefundedPaiseForReturnCharge(
    input.refunds,
    input.returnCharge.id,
  );
  const remainingForReturn = Math.max(0, maxForReturn - alreadyRefunded);
  const encounterCredit = Math.max(0, input.balance.creditPaise);
  const maxPermittedRefund = Math.min(remainingForReturn, encounterCredit);
  return {
    maxForReturn,
    alreadyRefunded,
    remainingForReturn,
    encounterCredit,
    maxPermittedRefund,
  };
};

/** Mirrors backend `validateRefundRequest` amount checks (integer paise). */
export const wouldBackendRejectRefundAmount = (input: {
  amountPaise: number;
  maxForReturn: number;
  alreadyForReturn: number;
  creditPaise: number;
}): { rejected: boolean; message?: string } => {
  if (
    input.alreadyForReturn + input.amountPaise >
    input.maxForReturn + 1e-9
  ) {
    return {
      rejected: true,
      message: "Cumulative refunds exceed refundable amount for this return",
    };
  }
  if (input.amountPaise > input.creditPaise + 1e-9) {
    return {
      rejected: true,
      message: "Refund amount exceeds patient credit balance",
    };
  }
  return { rejected: false };
};

export type IpPharmacyRefundableReturnTarget = {
  returnChargeId: string;
  relatedDispenseChargeId: string;
  returnQuantity: number;
  returnAmountPaise: number;
  paidOnOriginalPaise: number;
  maxRefundablePaise: number;
  alreadyRefundedPaise: number;
  remainingRefundablePaise: number;
  encounterCreditPaise: number;
  maxRefundPaise: number;
};

export type BuildRefundableReturnTargetsInput = {
  charges: IpMedicineCharge[] | null | undefined;
  refunds: IpMedicineRefund[] | null | undefined;
  balance: IpMedicineBalance | null | undefined;
  balanceLoaded: boolean;
  auditRefundsLoaded: boolean;
};

export const buildRefundableReturnTargets = (
  input: BuildRefundableReturnTargetsInput,
): IpPharmacyRefundableReturnTarget[] => {
  const assessment = assessRefundLimitDataReliability({
    balance: input.balance,
    balanceLoaded: input.balanceLoaded,
    refunds: input.refunds,
    auditRefundsLoaded: input.auditRefundsLoaded,
  });
  if (!assessment.reliable || !input.balance || !input.refunds) {
    return [];
  }

  const chargeById = new Map(
    (input.charges ?? []).map((c) => [c.id, c] as const),
  );

  const targets: IpPharmacyRefundableReturnTarget[] = [];
  for (const returnCharge of input.charges ?? []) {
    if (returnCharge.chargeType !== "return") continue;

    const originalId = returnCharge.relatedChargeId;
    const original = originalId ? chargeById.get(originalId) : undefined;
    const limits = computeRefundLimitsForReturnCharge({
      returnCharge,
      originalCharge: original,
      refunds: input.refunds,
      balance: input.balance,
    });
    if (limits.maxPermittedRefund <= 0) continue;

    targets.push({
      returnChargeId: returnCharge.id,
      relatedDispenseChargeId: originalId ?? "",
      returnQuantity: returnCharge.quantity,
      returnAmountPaise: returnCharge.amountPaise,
      paidOnOriginalPaise: original?.allocatedPaise ?? 0,
      maxRefundablePaise: limits.maxForReturn,
      alreadyRefundedPaise: limits.alreadyRefunded,
      remainingRefundablePaise: limits.remainingForReturn,
      encounterCreditPaise: limits.encounterCredit,
      maxRefundPaise: limits.maxPermittedRefund,
    });
  }
  return targets;
};

export const findRefundableTargetByReturnChargeId = (
  targets: IpPharmacyRefundableReturnTarget[],
  returnChargeId: string,
): IpPharmacyRefundableReturnTarget | undefined =>
  targets.find((t) => t.returnChargeId === returnChargeId);

export const canShowRefundMedicineControl = (input: {
  canRefund: boolean;
  admissionDischarged: boolean;
  refundLimitsReliable: boolean;
  target: IpPharmacyRefundableReturnTarget | null | undefined;
}): boolean => {
  if (!input.canRefund) return false;
  if (!input.refundLimitsReliable) return false;
  if (input.admissionDischarged) return false;
  if (!input.target) return false;
  return input.target.maxRefundPaise > 0;
};

export type ValidateIpPharmacyRefundInput = {
  canRefund: boolean;
  admissionDischarged: boolean;
  target: IpPharmacyRefundableReturnTarget | null | undefined;
  amountRupees: string;
  method: string;
  reason?: string;
  clientReferenceId: string;
};

export type ValidateIpPharmacyRefundResult =
  | {
      ok: true;
      returnChargeId: string;
      amountPaise: number;
      method: IpMedicinePaymentMethod;
      clientReferenceId: string;
      reason?: string;
    }
  | { ok: false; message: string };

export const buildIpPharmacyRefundAttemptKey = (
  encounterId: string,
  attemptId: string,
): string => `refund-attempt:${encounterId}:${attemptId}`;

export const validateIpPharmacyRefund = (
  input: ValidateIpPharmacyRefundInput,
): ValidateIpPharmacyRefundResult => {
  if (!input.canRefund) {
    return {
      ok: false,
      message: "You do not have permission to record medicine refunds.",
    };
  }
  if (input.admissionDischarged) {
    return {
      ok: false,
      message: "Refunds are not available for discharged admissions.",
    };
  }
  if (!input.target) {
    return { ok: false, message: "Select a return adjustment to refund." };
  }
  if (input.clientReferenceId.trim().length < 8) {
    return {
      ok: false,
      message: "Refund client reference must be at least 8 characters.",
    };
  }
  if (
    !IP_MEDICINE_PAYMENT_METHODS.includes(input.method as IpMedicinePaymentMethod)
  ) {
    return { ok: false, message: "Unsupported refund method." };
  }

  const amountPaise = rupeesInputToPaise(input.amountRupees);
  if (amountPaise == null) {
    return { ok: false, message: "Enter a valid refund amount." };
  }
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    return {
      ok: false,
      message: "Refund amount must be a positive whole paise amount.",
    };
  }
  if (amountPaise > input.target.maxRefundPaise) {
    return {
      ok: false,
      message:
        "Refund exceeds the maximum permitted amount for this return and encounter credit.",
    };
  }

  const backendCheck = wouldBackendRejectRefundAmount({
    amountPaise,
    maxForReturn: input.target.maxRefundablePaise,
    alreadyForReturn: input.target.alreadyRefundedPaise,
    creditPaise: input.target.encounterCreditPaise,
  });
  if (backendCheck.rejected) {
    return {
      ok: false,
      message: backendCheck.message ?? "Refund exceeds backend limits.",
    };
  }

  const reason = input.reason?.trim();
  return {
    ok: true,
    returnChargeId: input.target.returnChargeId,
    amountPaise,
    method: input.method as IpMedicinePaymentMethod,
    clientReferenceId: input.clientReferenceId.trim(),
    ...(reason ? { reason } : {}),
  };
};

export const buildIpPharmacyRefundRequest = (
  validated: Extract<ValidateIpPharmacyRefundResult, { ok: true }>,
) => ({
  returnChargeId: validated.returnChargeId,
  amountPaise: validated.amountPaise,
  method: validated.method,
  clientReferenceId: validated.clientReferenceId,
  ...(validated.reason ? { reason: validated.reason } : {}),
});
