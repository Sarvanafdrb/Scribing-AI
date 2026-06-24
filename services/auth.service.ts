import { api } from "./api";

export interface LoginData {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      isSuperAdmin?: boolean;
      permissions?: string[];
      organizationName?: string;
      organization?: {
        id?: string;
        _id?: string;
        name: string;
        organizationCode?: string;
      } | null;
      role?: string;
      roleName?: string;
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
