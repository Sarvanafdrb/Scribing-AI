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

  changePassword: (data: any) => api.post("/auth/change-password", data),
  forgotPassword: (email: string) =>
    api.post("/auth/forgot-password", { email }),
  resetPassword: (token: string, password: string) =>
    api.post("/auth/reset-password", { token, password }),
  refreshToken: () => api.post("/auth/refresh-token"),
};
