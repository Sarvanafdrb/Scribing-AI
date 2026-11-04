export type IpAdmissionPaymentMethod = "cash" | "upi" | "card" | "other";

export type IpOtherChargeCategory =
  | "procedure"
  | "lab"
  | "nursing"
  | "equipment"
  | "miscellaneous"
  | "other";

export interface IpConsolidatedAdmissionInvoice {
  encounterId: string;
  patientId: string;
  currency: string;
  lineItems: {
    roomRentPaise: number;
    roomRentRupees: number;
    medicineNetPaise: number;
    medicineNetRupees: number;
    otherChargesPaise: number;
    otherChargesRupees: number;
  };
  grossTotalPaise: number;
  grossTotalRupees: number;
  successfulPaymentsPaise: number;
  successfulPaymentsRupees: number;
  successfulRefundsPaise: number;
  successfulRefundsRupees: number;
  netPaidPaise: number;
  netPaidRupees: number;
  creditPaise: number;
  creditRupees: number;
  balanceDuePaise: number;
  balanceDueRupees: number;
  outstandingPaise?: number;
  roomRentChargeCount?: number;
  otherChargeCount?: number;
}

export interface IpRoomRentCharge {
  _id: string;
  id?: string;
  billingDateKey: string;
  amountPaise: number;
  allocatedPaise: number;
  ratePerDayPaise: number;
  dayFraction: number;
  status: string;
  clientReferenceId?: string;
}

export interface IpRoomRentCorrection {
  _id: string;
  id?: string;
  originalChargeId: string;
  kind: "partial_adjustment" | "full_reversal";
  amountPaise: number;
  reason: string;
  clientReferenceId: string;
  recordedAt?: string;
  createdAt?: string;
}

export interface IpRoomAllocation {
  _id: string;
  wardNameSnapshot: string;
  roomNumberSnapshot: string;
  bedLabelSnapshot: string;
  categoryNameSnapshot: string;
  ratePerDayPaise: number;
  status: "active" | "ended" | "transferred";
  startedAt: string;
  endedAt?: string | null;
}

export interface IpOtherCharge {
  _id: string;
  category: IpOtherChargeCategory;
  description: string;
  quantity: number;
  unitPricePaise: number;
  amountPaise: number;
  allocatedPaise: number;
  status: "active" | "cancelled";
  cancelledReason?: string;
  cancelledAt?: string;
}

export interface IpPaymentAllocation {
  chargeKind: "room_rent" | "other";
  chargeId: string;
  amountPaise: number;
}

export interface IpUnifiedPaymentRow {
  id: string;
  source: "admission" | "medicine";
  movement: "payment" | "refund";
  amountPaise: number;
  amountRupees?: number;
  method: IpAdmissionPaymentMethod;
  status: string;
  clientReferenceId: string;
  recordedAt: string;
  allocations?: IpPaymentAllocation[];
}

export interface IpUnifiedPayments {
  admissionPayments: IpUnifiedPaymentRow[];
  medicinePayments: IpUnifiedPaymentRow[];
  admissionRefunds: IpUnifiedPaymentRow[];
  medicineRefunds: IpUnifiedPaymentRow[];
  combined: IpUnifiedPaymentRow[];
}

export interface IpDischargePreview {
  invoice: IpConsolidatedAdmissionInvoice;
  payments: IpUnifiedPayments;
  statementText: string;
}

export interface IpBillingSnapshot {
  _id: string;
  finalizedAt: string;
  statementText: string;
  snapshot: Record<string, unknown>;
}

export interface IpStatementRevision {
  _id: string;
  revisionNumber: number;
  reason: string;
  clientReferenceId?: string;
  statementText: string;
  snapshot?: {
    financialDiff?: {
      grossTotalPaise: number;
      netPaidPaise: number;
      balanceDuePaise: number;
      creditPaise: number;
      successfulRefundsPaise: number;
    };
  };
  createdAt?: string;
}

export interface RecordAdmissionPaymentInput {
  amountPaise: number;
  method: IpAdmissionPaymentMethod;
  clientReferenceId: string;
  receiptReference?: string;
  allocations: IpPaymentAllocation[];
}

export interface CorrectRoomRentInput {
  reason: string;
  clientReferenceId: string;
  amountPaise?: number;
}

export interface CreateOtherChargeInput {
  category: IpOtherChargeCategory;
  description: string;
  quantity: number;
  unitPricePaise: number;
  sourceReferenceId?: string;
}

export interface IpAdmissionSearchItem {
  encounterId: string;
  encounterCode?: string;
  status: string;
  patientId?: string | null;
  patientCode?: string | null;
  patientName?: string | null;
  ward?: string | null;
  bed?: string | null;
  admittedAt?: string | null;
  dischargedAt?: string | null;
}

export interface IpAdmissionSearchResult {
  items: IpAdmissionSearchItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
