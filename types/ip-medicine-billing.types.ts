/** Matches backend `ComputedPaymentStatus` from ip-medicine-money.utils. */
export type IpMedicineComputedPaymentStatus =
  | "UNPAID"
  | "PARTIALLY_PAID"
  | "PAID";

export type IpMedicineOrderStatus = "open" | "closed" | "cancelled";

export type IpMedicineChargeType =
  | "dispense"
  | "return"
  | "adjustment"
  | "reversal";

export type IpMedicinePaymentMethod = "cash" | "upi" | "card" | "other";

export type IpMedicinePaymentStatus = "pending" | "succeeded" | "failed";

export type IpMedicineDispenseStatus = "pending" | "confirmed" | "voided";

/** GET /orders — formatted order line (not a separate dispense-line entity). */
export type IpMedicineOrderLine = {
  id: string;
  prescriptionLineId: string;
  medicineId?: string;
  medicineNameSnapshot: string;
  strengthSnapshot?: string;
  authorizedQuantity: number;
  dispensedQuantity: number;
  remainingQuantity: number;
  unitOfMeasure: string;
  unitPricePaise: number;
  unitPriceRupees: number;
  instructions?: string;
};

export type IpMedicineOrder = {
  id: string;
  organizationId: string;
  patientId: string;
  encounterId: string;
  prescriptionId: string;
  sourceSessionId: string;
  roundScheduleId: string | null;
  status: IpMedicineOrderStatus;
  lines: IpMedicineOrderLine[];
  createdAt: string;
  updatedAt: string;
};

/** GET /dispenses — confirmed dispense events only. */
export type IpMedicineDispense = {
  id: string;
  orderId: string;
  prescriptionLineId: string;
  quantity: number;
  unitPricePaise: number;
  chargeAmountPaise: number;
  clientReferenceId: string;
  dispensedAt: string;
  createdBy?: string;
};

/** GET /charges */
export type IpMedicineCharge = {
  id: string;
  chargeType: IpMedicineChargeType;
  amountPaise: number;
  amountRupees: number;
  quantity: number;
  unitPricePaise: number;
  dispenseId: string | null;
  relatedChargeId: string | null;
  allocatedPaise: number;
  outstandingPaise: number;
  paymentStatus: IpMedicineComputedPaymentStatus;
  createdAt: string;
};

/** GET /balance */
export type IpMedicineBalance = {
  totalChargePaise: number;
  totalChargeRupees: number;
  totalPaidPaise: number;
  totalPaidRupees: number;
  netPaidPaise: number;
  netPaidRupees: number;
  totalRefundedPaise: number;
  totalRefundedRupees: number;
  creditPaise: number;
  creditRupees: number;
  outstandingPaise: number;
  outstandingRupees: number;
  paymentStatus: IpMedicineComputedPaymentStatus;
  currency: "INR";
};

/** GET /payments — allocation rows on each payment. */
export type IpMedicinePaymentAllocation = {
  chargeId: string;
  amountPaise: number;
};

export type IpMedicinePayment = {
  id: string;
  amountPaise: number;
  amountRupees: number;
  method: IpMedicinePaymentMethod;
  status: IpMedicinePaymentStatus;
  clientReferenceId: string;
  receiptReference?: string;
  recordedAt: string;
  allocations: IpMedicinePaymentAllocation[];
};

/** GET /audit — refund ledger rows. */
export type IpMedicineRefund = {
  id: string;
  amountPaise: number;
  amountRupees: number;
  method: IpMedicinePaymentMethod;
  clientReferenceId: string;
  relatedReturnChargeId: string;
  reason?: string;
  recordedAt: string;
};

export type IpMedicineAuditTrail = {
  orders: IpMedicineOrder[];
  dispenses: IpMedicineDispense[];
  charges: IpMedicineCharge[];
  payments: IpMedicinePayment[];
  refunds: IpMedicineRefund[];
};

/** POST /dispenses */
export type ConfirmIpMedicineDispenseInput = {
  orderId: string;
  prescriptionLineId: string;
  quantity: number;
  clientReferenceId: string;
  dispensedAt?: string | Date;
};

/** Raw charge/dispense/payment documents returned on mutations (normalized to string ids in service). */
export type IpMedicineDispenseRecord = {
  id: string;
  _id: string;
  encounterId: string;
  orderId: string;
  prescriptionLineId: string;
  clientReferenceId: string;
  quantity: number;
  unitPricePaise: number;
  chargeAmountPaise: number;
  status: IpMedicineDispenseStatus;
  dispensedAt: string;
};

export type IpMedicineChargeRecord = {
  id: string;
  _id: string;
  encounterId: string;
  chargeType: IpMedicineChargeType;
  amountPaise: number;
  quantity: number;
  unitPricePaise: number;
  dispenseId?: string | null;
  relatedChargeId?: string | null;
  clientReferenceId?: string;
};

export type IpMedicinePaymentRecord = {
  id: string;
  _id: string;
  encounterId: string;
  amountPaise: number;
  method: IpMedicinePaymentMethod;
  status: IpMedicinePaymentStatus;
  clientReferenceId: string;
  receiptReference?: string;
  recordedAt: string;
};

export type IpMedicineReturnChargeRecord = IpMedicineChargeRecord;

export type IpMedicineRefundRecord = {
  id: string;
  _id: string;
  encounterId: string;
  amountPaise: number;
  method: IpMedicinePaymentMethod;
  clientReferenceId: string;
  relatedReturnChargeId: string;
  recordedAt: string;
};

export type ConfirmIpMedicineDispenseResult = {
  dispense: IpMedicineDispenseRecord;
  charge: IpMedicineChargeRecord | null;
  idempotent: boolean;
};

/** POST /payments */
export type RecordIpMedicinePaymentInput = {
  amountPaise: number;
  method: IpMedicinePaymentMethod;
  clientReferenceId: string;
  receiptReference?: string;
  recordedAt?: string | Date;
  allocations: IpMedicinePaymentAllocation[];
};

export type RecordIpMedicinePaymentResult = {
  payment: IpMedicinePaymentRecord;
  allocations?: IpMedicinePaymentAllocation[];
  idempotent: boolean;
};

/** POST /returns */
export type RecordIpMedicineReturnInput = {
  chargeId: string;
  quantity: number;
  clientReferenceId: string;
  notes?: string;
};

export type RecordIpMedicineReturnResult = {
  adjustment: IpMedicineReturnChargeRecord;
  idempotent: boolean;
  suggestedRefundPaise: number;
};

/** POST /refunds */
export type RecordIpMedicineRefundInput = {
  returnChargeId: string;
  amountPaise: number;
  method: IpMedicinePaymentMethod;
  clientReferenceId: string;
  reason?: string;
  recordedAt?: string | Date;
};

export type RecordIpMedicineRefundResult = {
  refund: IpMedicineRefundRecord;
  idempotent: boolean;
};

export type IpMedicineApiSuccessResponse<T> = {
  success: true;
  data: T;
  message?: string;
};

export type IpPharmacyEncounterSearchItem = {
  encounterId: string;
  encounterCode?: string;
  status: string;
  patientId: string | null;
  patientCode: string | null;
  patientName: string | null;
  ward: string | null;
  bed: string | null;
  admittedAt: string | null;
  dischargedAt: string | null;
};

export type IpPharmacyEncounterSearchResult = {
  items: IpPharmacyEncounterSearchItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
