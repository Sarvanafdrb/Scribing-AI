import { api } from "@/services/api";
import type {
  CreateMedicineData,
  Medicine,
  MedicineSearchResult,
  UpdateMedicineData,
} from "@/types/medicine.types";

export const medicineService = {
  getAll: async (params?: {
    organizationId?: string;
    search?: string;
    isActive?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get("/medicines", { params });
    const { data, pagination, activeCount, inactiveCount } = response.data;
    return {
      medicines: (data || []) as Medicine[],
      total: pagination?.total || 0,
      page: pagination?.page || 1,
      limit: pagination?.limit || 20,
      totalPages: pagination?.totalPages || 1,
      activeCount: activeCount || 0,
      inactiveCount: inactiveCount || 0,
    };
  },

  search: async (query: string, organizationId?: string) => {
    const response = await api.get("/medicines/search", {
      params: { query, organizationId },
    });
    return (response.data.data || []) as MedicineSearchResult[];
  },

  getById: async (id: string): Promise<Medicine> => {
    const response = await api.get(`/medicines/${id}`);
    return response.data.data;
  },

  create: async (data: CreateMedicineData): Promise<Medicine> => {
    const response = await api.post("/medicines", data);
    return response.data.data;
  },

  update: async (id: string, data: UpdateMedicineData): Promise<Medicine> => {
    const response = await api.patch(`/medicines/${id}`, data);
    return response.data.data;
  },

  deactivate: async (id: string): Promise<Medicine> => {
    const response = await api.patch(`/medicines/${id}/deactivate`);
    return response.data.data;
  },

  activate: async (id: string): Promise<Medicine> => {
    const response = await api.patch(`/medicines/${id}/activate`);
    return response.data.data;
  },

  addIndication: async (
    id: string,
    data: { name: string; aliases?: string[] },
  ): Promise<Medicine> => {
    const response = await api.post(`/medicines/${id}/indications`, data);
    return response.data.data;
  },

  removeIndication: async (
    id: string,
    indicationId: string,
  ): Promise<Medicine> => {
    const response = await api.delete(
      `/medicines/${id}/indications/${indicationId}`,
    );
    return response.data.data;
  },
};
