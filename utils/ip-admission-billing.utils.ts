import type { CorrectRoomRentInput } from "@/types/ip-admission-billing.types";

export const MIN_CLIENT_REFERENCE_LENGTH = 8;

export const validateRoomRentCorrectionForm = (input: {
  reason: string;
  clientReferenceId: string;
  partialAmountPaise: number | null;
  usePartial: boolean;
}): string | null => {
  if (!input.reason.trim()) return "Correction reason is required.";
  if (input.clientReferenceId.trim().length < MIN_CLIENT_REFERENCE_LENGTH) {
    return `Client reference must be at least ${MIN_CLIENT_REFERENCE_LENGTH} characters.`;
  }
  if (input.usePartial) {
    if (
      input.partialAmountPaise == null ||
      input.partialAmountPaise <= 0 ||
      !Number.isInteger(input.partialAmountPaise)
    ) {
      return "Enter a valid partial correction amount in rupees.";
    }
  }
  return null;
};

export const buildRoomRentCorrectionPayload = (input: {
  reason: string;
  clientReferenceId: string;
  partialAmountPaise: number | null;
  usePartial: boolean;
}): CorrectRoomRentInput => ({
  reason: input.reason.trim(),
  clientReferenceId: input.clientReferenceId.trim(),
  ...(input.usePartial && input.partialAmountPaise != null
    ? { amountPaise: input.partialAmountPaise }
    : {}),
});

export const sumCorrectionsForCharge = (
  corrections: Array<{ originalChargeId: string; amountPaise: number }>,
  chargeId: string,
) =>
  corrections
    .filter((c) => c.originalChargeId === chargeId)
    .reduce((sum, c) => sum + c.amountPaise, 0);

export const canViewIpAdmissionBillingRoute = (
  permissions: string[],
  isSuperAdmin: boolean,
): boolean => {
  if (isSuperAdmin) return true;
  return permissions.some(
    (code) =>
      code === "IP_ADMISSION_VIEW" ||
      code === "ip_admission:read" ||
      code === "IP_ADMISSION_EDIT" ||
      code === "ip_admission:update",
  );
};

export type IpChargeAllocationTarget = {
  chargeKind: "room_rent" | "other";
  chargeId: string;
  outstandingPaise: number;
};

export type IpPaymentAllocationDraft = {
  chargeKind: "room_rent" | "other";
  chargeId: string;
  amountPaise: number;
};

export const validatePaymentAllocations = (
  paymentAmountPaise: number,
  allocations: IpPaymentAllocationDraft[],
  chargeTargets: IpChargeAllocationTarget[],
): string | null => {
  if (!Number.isInteger(paymentAmountPaise) || paymentAmountPaise <= 0) {
    return "Invalid payment amount.";
  }
  if (allocations.length === 0) {
    return "Allocate payment to at least one charge.";
  }
  const totalAllocated = allocations.reduce((sum, row) => sum + row.amountPaise, 0);
  if (totalAllocated !== paymentAmountPaise) {
    return "Allocation total must equal the payment amount.";
  }
  const seen = new Set<string>();
  for (const row of allocations) {
    if (!Number.isInteger(row.amountPaise) || row.amountPaise <= 0) {
      return "Each allocation must be a positive amount.";
    }
    const key = `${row.chargeKind}:${row.chargeId}`;
    if (seen.has(key)) {
      return "Each charge can only appear once in allocations.";
    }
    seen.add(key);
    const target = chargeTargets.find(
      (c) => c.chargeId === row.chargeId && c.chargeKind === row.chargeKind,
    );
    if (!target) {
      return "One or more allocated charges are invalid.";
    }
    if (row.amountPaise > target.outstandingPaise) {
      return "Allocation exceeds outstanding amount for a charge.";
    }
  }
  return null;
};

export const buildChargeAllocationTargets = (input: {
  roomRent: Array<{ _id: string; amountPaise: number; allocatedPaise: number }>;
  otherCharges: Array<{
    _id: string;
    status: string;
    amountPaise: number;
    allocatedPaise: number;
  }>;
}): IpChargeAllocationTarget[] => {
  const rent = input.roomRent.map((c) => ({
    chargeKind: "room_rent" as const,
    chargeId: c._id,
    outstandingPaise: Math.max(0, c.amountPaise - c.allocatedPaise),
  }));
  const other = input.otherCharges
    .filter((c) => c.status === "active")
    .map((c) => ({
      chargeKind: "other" as const,
      chargeId: c._id,
      outstandingPaise: Math.max(0, c.amountPaise - c.allocatedPaise),
    }));
  return [...rent, ...other].filter((c) => c.outstandingPaise > 0);
};

/** Mirrors backend `computeConsolidatedTotals` for display sanity checks. */
export type ConsolidatedInvoiceTotalsLike = {
  lineItems: {
    roomRentPaise: number;
    medicineNetPaise: number;
    otherChargesPaise: number;
  };
  grossTotalPaise: number;
  successfulPaymentsPaise: number;
  successfulRefundsPaise: number;
  netPaidPaise: number;
  balanceDuePaise: number;
  creditPaise: number;
};

export const validateConsolidatedInvoiceTotals = (
  invoice: ConsolidatedInvoiceTotalsLike,
): string | null => {
  const grossFromLines =
    invoice.lineItems.roomRentPaise +
    invoice.lineItems.medicineNetPaise +
    invoice.lineItems.otherChargesPaise;
  if (grossFromLines !== invoice.grossTotalPaise) {
    return "Gross total does not match consolidated line items.";
  }
  const netPaid =
    invoice.successfulPaymentsPaise - invoice.successfulRefundsPaise;
  if (netPaid !== invoice.netPaidPaise) {
    return "Net paid does not match successful payments minus refunds.";
  }
  const expectedBalance = Math.max(0, invoice.grossTotalPaise - netPaid);
  const expectedCredit = Math.max(0, netPaid - invoice.grossTotalPaise);
  if (expectedBalance !== invoice.balanceDuePaise) {
    return "Balance due is inconsistent with gross total and net paid.";
  }
  if (expectedCredit !== invoice.creditPaise) {
    return "Credit is inconsistent with gross total and net paid.";
  }
  return null;
};

/** Invoice subset stored inside an immutable finalized snapshot payload. */
export type IpSnapshotStoredInvoice = {
  grossTotalPaise?: number;
  netPaidPaise?: number;
  balanceDuePaise?: number;
  creditPaise?: number;
  successfulPaymentsPaise?: number;
  successfulRefundsPaise?: number;
};

export const extractSnapshotStoredInvoice = (
  snapshotPayload: Record<string, unknown> | undefined,
): IpSnapshotStoredInvoice | null => {
  if (!snapshotPayload) return null;
  const invoice = snapshotPayload.invoice;
  if (!invoice || typeof invoice !== "object") return null;
  return invoice as IpSnapshotStoredInvoice;
};

const SNAPSHOT_LIVE_COMPARE_KEYS: (keyof IpSnapshotStoredInvoice)[] = [
  "grossTotalPaise",
  "netPaidPaise",
  "balanceDuePaise",
  "creditPaise",
  "successfulPaymentsPaise",
  "successfulRefundsPaise",
];

export const snapshotFinancialsDifferFromLive = (
  snapshotInvoice: IpSnapshotStoredInvoice | null,
  live: IpSnapshotStoredInvoice,
): boolean => {
  if (!snapshotInvoice) return false;
  return SNAPSHOT_LIVE_COMPARE_KEYS.some((key) => {
    const snapVal = snapshotInvoice[key];
    const liveVal = live[key];
    if (typeof snapVal !== "number" || typeof liveVal !== "number") {
      return false;
    }
    return snapVal !== liveVal;
  });
};

export const pickLatestStatementRevision = <
  T extends { revisionNumber: number; createdAt?: string },
>(
  revisions: T[],
): T | null => {
  if (!revisions.length) return null;
  return [...revisions].sort((a, b) => b.revisionNumber - a.revisionNumber)[0];
};
