import axios from "axios";
import { api } from "@/services/api";
import type {
  CorrectRoomRentInput,
  CreateOtherChargeInput,
  IpAdmissionSearchResult,
  IpBillingSnapshot,
  IpConsolidatedAdmissionInvoice,
  IpDischargePreview,
  IpOtherCharge,
  IpRoomAllocation,
  IpRoomRentCharge,
  IpRoomRentCorrection,
  IpStatementRevision,
  IpUnifiedPayments,
  RecordAdmissionPaymentInput,
} from "@/types/ip-admission-billing.types";

const base = (encounterId: string) =>
  `/ip-admission/encounters/${encounterId}`;

export const getIpAdmissionApiErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim()) return message;
    if (error.response?.status === 403) {
      return "You do not have permission for this billing action.";
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

const normalizeId = (row: { _id?: string; id?: string }) =>
  String(row._id || row.id || "");

export const ipAdmissionBillingService = {
  searchAdmissions: async (params: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<IpAdmissionSearchResult> => {
    const response = await api.get("/ip-admission/encounters", { params });
    return response.data.data as IpAdmissionSearchResult;
  },

  getInvoice: async (
    encounterId: string,
  ): Promise<IpConsolidatedAdmissionInvoice> => {
    const response = await api.get(`${base(encounterId)}/invoice`);
    return response.data.data;
  },

  listRoomRentCharges: async (
    encounterId: string,
  ): Promise<IpRoomRentCharge[]> => {
    const response = await api.get(`${base(encounterId)}/room-rent/charges`);
    const rows = response.data.data as IpRoomRentCharge[];
    return rows.map((row) => ({ ...row, _id: normalizeId(row) }));
  },

  listRoomRentCorrections: async (
    encounterId: string,
  ): Promise<IpRoomRentCorrection[]> => {
    const response = await api.get(`${base(encounterId)}/room-rent/corrections`);
    const rows = response.data.data as IpRoomRentCorrection[];
    return rows.map((row) => ({
      ...row,
      _id: normalizeId(row),
      originalChargeId: String(row.originalChargeId),
    }));
  },

  generateRoomRent: async (
    encounterId: string,
    body: { throughDate?: string; allowDischarged?: boolean } = {},
  ) => {
    const response = await api.post(
      `${base(encounterId)}/room-rent/generate`,
      body,
    );
    return response.data.data as {
      created: IpRoomRentCharge[];
      idempotentCount: number;
    };
  },

  correctRoomRent: async (
    encounterId: string,
    chargeId: string,
    input: CorrectRoomRentInput,
  ) => {
    const response = await api.post(
      `${base(encounterId)}/room-rent/charges/${chargeId}/correct`,
      input,
    );
    return response.data.data as {
      correction: IpRoomRentCorrection;
      idempotent: boolean;
      statementRevision?: IpStatementRevision | null;
    };
  },

  listOtherCharges: async (encounterId: string): Promise<IpOtherCharge[]> => {
    const response = await api.get(`${base(encounterId)}/other-charges`);
    const rows = response.data.data as IpOtherCharge[];
    return rows.map((row) => ({ ...row, _id: normalizeId(row) }));
  },

  createOtherCharge: async (
    encounterId: string,
    input: CreateOtherChargeInput,
  ) => {
    const response = await api.post(
      `${base(encounterId)}/other-charges`,
      input,
    );
    const row = response.data.data as IpOtherCharge;
    return { ...row, _id: normalizeId(row) };
  },

  cancelOtherCharge: async (
    encounterId: string,
    chargeId: string,
    reason: string,
  ) => {
    const response = await api.post(
      `${base(encounterId)}/other-charges/${chargeId}/cancel`,
      { reason },
    );
    const row = response.data.data as IpOtherCharge;
    return { ...row, _id: normalizeId(row) };
  },

  listPayments: async (encounterId: string): Promise<IpUnifiedPayments> => {
    const response = await api.get(`${base(encounterId)}/payments`);
    return response.data.data;
  },

  recordPayment: async (
    encounterId: string,
    input: RecordAdmissionPaymentInput,
  ) => {
    const response = await api.post(`${base(encounterId)}/payments`, input);
    return response.data.data as { payment: unknown; idempotent: boolean };
  },

  listAllocations: async (
    encounterId: string,
  ): Promise<IpRoomAllocation[]> => {
    const response = await api.get(`${base(encounterId)}/allocations`);
    const rows = response.data.data as IpRoomAllocation[];
    return rows.map((row) => ({ ...row, _id: normalizeId(row) }));
  },

  getDischargePreview: async (
    encounterId: string,
  ): Promise<IpDischargePreview> => {
    const response = await api.get(
      `${base(encounterId)}/discharge-statement/preview`,
    );
    return response.data.data;
  },

  finalizeDischargeStatement: async (
    encounterId: string,
    body: { dischargedAt?: string } = {},
  ) => {
    const response = await api.post(
      `${base(encounterId)}/discharge-statement/finalize`,
      body,
    );
    return response.data.data as {
      snapshot: IpBillingSnapshot;
      idempotent: boolean;
    };
  },

  getDischargeSnapshot: async (
    encounterId: string,
  ): Promise<IpBillingSnapshot | null> => {
    try {
      const response = await api.get(
        `${base(encounterId)}/discharge-statement/snapshot`,
      );
      return response.data.data as IpBillingSnapshot;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  listStatementRevisions: async (
    encounterId: string,
  ): Promise<IpStatementRevision[]> => {
    const response = await api.get(
      `${base(encounterId)}/discharge-statement/revisions`,
    );
    const rows = response.data.data as IpStatementRevision[];
    return rows.map((row) => ({ ...row, _id: normalizeId(row) }));
  },
};
