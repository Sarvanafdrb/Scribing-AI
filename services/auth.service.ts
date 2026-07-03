import { api } from "./api";
import { AuthOrganization, AuthRole, AuthUser } from "@/types/auth.types";

export interface LoginData {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: AuthUser & {
      organization?: AuthOrganization | null;
      role?: AuthRole | null;
    };
    accessToken: string;
    refreshToken: string;
  };
}

export const authService = {
  login: async (data: LoginData): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>("/auth/login", data);
    return response.data;
  },

  registerOrg: (data: any) => api.post("/auth/register-org", data),
  logout: () => api.post("/auth/logout"),

  getCurrentUser: async () => {
    const response = await api.get("/auth/me");
    return response.data;
  },

  changePassword: (data: {
    currentPassword: string;
    newPassword: string;
  }) => api.post("/auth/change-password", data),

  updateProfile: async (data: {
    firstName: string;
    lastName: string;
    phone?: string;
  }) => {
    const response = await api.patch("/auth/me", data);
    return response.data;
  },

  uploadProfilePicture: async (file: File) => {
    const formData = new FormData();
    formData.append("profilePicture", file);
    const response = await api.post("/auth/me/profile-picture", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  forgotPassword: (email: string) =>
    api.post("/auth/forgot-password", { email }),
  resetPassword: (token: string, password: string) =>
    api.post("/auth/reset-password", { token, password }),
  refreshToken: () => api.post("/auth/refresh-token"),
};
