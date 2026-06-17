// services/organization.service.ts
import { api } from "@/services/api";
import {
  CreateOrganizationData,
  Organization,
  OrganizationStats,
  UpdateOrganizationData,
} from "@/types/organization.types";

const compressImage = (
  file: File,
  maxDimension = 400,
  quality = 0.8,
): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const scale = Math.min(
        1,
        maxDimension / Math.max(img.width, img.height),
      );
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Failed to process image"));
        return;
      }

      context.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image"));
    };

    img.src = objectUrl;
  });

const prepareLogo = async (logo: File | string | null | undefined) => {
  if (logo instanceof File) {
    return compressImage(logo);
  }

  if (typeof logo === "string" && logo) {
    return logo;
  }

  return undefined;
};

const preparePayload = async (
  data: CreateOrganizationData | UpdateOrganizationData,
) => {
  const payload: Record<string, unknown> = { ...data };
  const logo = await prepareLogo(data.logo);

  if (logo) {
    payload.logo = logo;
  } else {
    delete payload.logo;
  }

  return payload;
};

export const organizationService = {
  create: async (data: CreateOrganizationData): Promise<Organization> => {
    const payload = await preparePayload(data);
    const response = await api.post("/organizations", payload);
    return response.data.data;
  },

  getAll: async (params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    organizations: Organization[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    activeCount: number;
    inactiveCount: number;
  }> => {
    const response = await api.get("/organizations", { params });
    const data = response.data.data;

    if (Array.isArray(data)) {
      return {
        organizations: data,
        total: data.length,
        page: 1,
        limit: data.length,
        totalPages: 1,
        activeCount: data.filter((o) => o.isActive).length,
        inactiveCount: data.filter((o) => !o.isActive).length,
      };
    }

    return {
      organizations: data.organizations || [],
      total: data.total || 0,
      page: data.page || 1,
      limit: data.limit || 10,
      totalPages: data.totalPages || 1,
      activeCount: data.activeCount || 0,
      inactiveCount: data.inactiveCount || 0,
    };
  },

  getById: async (id: string): Promise<Organization> => {
    const response = await api.get(`/organizations/${id}`);
    return response.data.data;
  },

  update: async (
    id: string,
    data: UpdateOrganizationData,
  ): Promise<Organization> => {
    const payload = await preparePayload(data);
    const response = await api.put(`/organizations/${id}`, payload);
    return response.data.data;
  },

  getUsers: async (id: string): Promise<any[]> => {
    const response = await api.get(`/organizations/${id}/users`);
    return response.data.data;
  },

  activate: async (id: string): Promise<Organization> => {
    const response = await api.patch(`/organizations/${id}/reactivate`);
    return response.data.data;
  },

  deactivate: async (id: string): Promise<Organization> => {
    const response = await api.patch(`/organizations/${id}/deactivate`);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    const response = await api.delete(`/organizations/${id}`);
    return response.data;
  },

  getStats: async (): Promise<OrganizationStats> => {
    const response = await api.get("/organizations/stats");
    return response.data;
  },
};
