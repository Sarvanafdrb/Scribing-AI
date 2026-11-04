import axios from "axios";
import { api } from "@/services/api";
import type {
  ConfirmIpMedicineDispenseInput,
  ConfirmIpMedicineDispenseResult,
  IpMedicineAuditTrail,
  IpMedicineBalance,
  IpMedicineCharge,
  IpMedicineChargeRecord,
  IpMedicineDispense,
  IpMedicineDispenseRecord,
  IpMedicineOrder,
  IpMedicinePayment,
  IpMedicinePaymentAllocation,
  IpMedicinePaymentRecord,
  IpMedicineRefundRecord,
  RecordIpMedicinePaymentInput,
  RecordIpMedicinePaymentResult,
  RecordIpMedicineRefundInput,
  RecordIpMedicineRefundResult,
  RecordIpMedicineReturnInput,
  RecordIpMedicineReturnResult,
  IpPharmacyEncounterSearchResult,
} from "@/types/ip-medicine-billing.types";

export const buildIpMedicineBillingBasePath = (encounterId: string): string =>
  `/ip-medicine/encounters/${encodeURIComponent(encounterId)}/ip-medicine`;

const base = buildIpMedicineBillingBasePath;

export const getIpMedicineApiErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim()) return message;
    if (error.response?.status === 403) {
      return "You do not have permission for this pharmacy action.";
    }
    if (error.response?.status === 409) {
      return "This client reference was already used for another admission.";
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

const normalizeId = (value: unknown): string => {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const obj = value as { _id?: unknown; toString?: () => string };
    if (obj._id != null) return String(obj._id);
    if (typeof obj.toString === "function") return obj.toString();
  }
  return String(value);
};

const normalizeDispenseRecord = (raw: Record<string, unknown>): IpMedicineDispenseRecord => {
  const id = normalizeId(raw._id ?? raw.id);
  return {
    id,
    _id: id,
    encounterId: normalizeId(raw.encounterId),
    orderId: normalizeId(raw.orderId),
    prescriptionLineId: normalizeId(raw.prescriptionLineId),
    clientReferenceId: String(raw.clientReferenceId ?? ""),
    quantity: Number(raw.quantity),
    unitPricePaise: Number(raw.unitPricePaise),
    chargeAmountPaise: Number(raw.chargeAmountPaise),
    status: raw.status as IpMedicineDispenseRecord["status"],
    dispensedAt:
      raw.dispensedAt instanceof Date
        ? raw.dispensedAt.toISOString()
        : String(raw.dispensedAt ?? ""),
  };
};

const normalizeChargeRecord = (raw: Record<string, unknown>): IpMedicineChargeRecord => {
  const id = normalizeId(raw._id ?? raw.id);
  return {
    id,
    _id: id,
    encounterId: normalizeId(raw.encounterId),
    chargeType: raw.chargeType as IpMedicineChargeRecord["chargeType"],
    amountPaise: Number(raw.amountPaise),
    quantity: Number(raw.quantity),
    unitPricePaise: Number(raw.unitPricePaise),
    dispenseId: raw.dispenseId ? normalizeId(raw.dispenseId) : null,
    relatedChargeId: raw.relatedChargeId
      ? normalizeId(raw.relatedChargeId)
      : null,
    clientReferenceId: raw.clientReferenceId
      ? String(raw.clientReferenceId)
      : undefined,
  };
};

const normalizePaymentRecord = (raw: Record<string, unknown>): IpMedicinePaymentRecord => {
  const id = normalizeId(raw._id ?? raw.id);
  return {
    id,
    _id: id,
    encounterId: normalizeId(raw.encounterId),
    amountPaise: Number(raw.amountPaise),
    method: raw.method as IpMedicinePaymentRecord["method"],
    status: raw.status as IpMedicinePaymentRecord["status"],
    clientReferenceId: String(raw.clientReferenceId ?? ""),
    receiptReference: raw.receiptReference
      ? String(raw.receiptReference)
      : undefined,
    recordedAt:
      raw.recordedAt instanceof Date
        ? raw.recordedAt.toISOString()
        : String(raw.recordedAt ?? ""),
  };
};

const normalizeRefundRecord = (raw: Record<string, unknown>): IpMedicineRefundRecord => {
  const id = normalizeId(raw._id ?? raw.id);
  return {
    id,
    _id: id,
    encounterId: normalizeId(raw.encounterId),
    amountPaise: Number(raw.amountPaise),
    method: raw.method as IpMedicineRefundRecord["method"],
    clientReferenceId: String(raw.clientReferenceId ?? ""),
    relatedReturnChargeId: normalizeId(raw.relatedReturnChargeId),
    recordedAt:
      raw.recordedAt instanceof Date
        ? raw.recordedAt.toISOString()
        : String(raw.recordedAt ?? ""),
  };
};

export const ipMedicineBillingService = {
  searchEncounters: async (params: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<IpPharmacyEncounterSearchResult> => {
    const response = await api.get("/ip-medicine/encounters", { params });
    return response.data.data as IpPharmacyEncounterSearchResult;
  },

  listOrders: async (encounterId: string): Promise<IpMedicineOrder[]> => {
    const response = await api.get(`${base(encounterId)}/orders`);
    return response.data.data as IpMedicineOrder[];
  },

  listDispenses: async (encounterId: string): Promise<IpMedicineDispense[]> => {
    const response = await api.get(`${base(encounterId)}/dispenses`);
    return response.data.data as IpMedicineDispense[];
  },

  confirmDispense: async (
    encounterId: string,
    input: ConfirmIpMedicineDispenseInput,
  ): Promise<ConfirmIpMedicineDispenseResult> => {
    const response = await api.post(`${base(encounterId)}/dispenses`, input);
    const data = response.data.data as {
      dispense: Record<string, unknown>;
      charge: Record<string, unknown> | null;
      idempotent: boolean;
    };
    return {
      idempotent: Boolean(data.idempotent),
      dispense: normalizeDispenseRecord(data.dispense),
      charge: data.charge ? normalizeChargeRecord(data.charge) : null,
    };
  },

  listCharges: async (encounterId: string): Promise<IpMedicineCharge[]> => {
    const response = await api.get(`${base(encounterId)}/charges`);
    return response.data.data as IpMedicineCharge[];
  },

  getBalance: async (encounterId: string): Promise<IpMedicineBalance> => {
    const response = await api.get(`${base(encounterId)}/balance`);
    return response.data.data as IpMedicineBalance;
  },

  listPayments: async (encounterId: string): Promise<IpMedicinePayment[]> => {
    const response = await api.get(`${base(encounterId)}/payments`);
    return response.data.data as IpMedicinePayment[];
  },

  recordPayment: async (
    encounterId: string,
    input: RecordIpMedicinePaymentInput,
  ): Promise<RecordIpMedicinePaymentResult> => {
    const response = await api.post(`${base(encounterId)}/payments`, input);
    const data = response.data.data as {
      payment: Record<string, unknown>;
      allocations?: IpMedicinePaymentAllocation[];
      idempotent: boolean;
    };
    return {
      idempotent: Boolean(data.idempotent),
      payment: normalizePaymentRecord(data.payment),
      allocations: data.allocations,
    };
  },

  recordReturn: async (
    encounterId: string,
    input: RecordIpMedicineReturnInput,
  ): Promise<RecordIpMedicineReturnResult> => {
    const response = await api.post(`${base(encounterId)}/returns`, input);
    const data = response.data.data as {
      adjustment: Record<string, unknown>;
      idempotent: boolean;
      suggestedRefundPaise: number;
    };
    return {
      idempotent: Boolean(data.idempotent),
      suggestedRefundPaise: Number(data.suggestedRefundPaise),
      adjustment: normalizeChargeRecord(data.adjustment),
    };
  },

  recordRefund: async (
    encounterId: string,
    input: RecordIpMedicineRefundInput,
  ): Promise<RecordIpMedicineRefundResult> => {
    const response = await api.post(`${base(encounterId)}/refunds`, input);
    const data = response.data.data as {
      refund: Record<string, unknown>;
      idempotent: boolean;
    };
    return {
      idempotent: Boolean(data.idempotent),
      refund: normalizeRefundRecord(data.refund),
    };
  },

  getAuditTrail: async (encounterId: string): Promise<IpMedicineAuditTrail> => {
    const response = await api.get(`${base(encounterId)}/audit`);
    return response.data.data as IpMedicineAuditTrail;
  },
};
