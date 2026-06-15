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
      organizationName?: string;
      role?: string;
    };
    accessToken: string;
    refreshToken: string;
  };
}
export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  organizationId?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export const authService = {
  // Authentication
  login: async (data: LoginData): Promise<LoginResponse> => {
    const response = await api.post("/auth/login", data);
    return response.data;
  },
  // register: (data: RegisterData) => api.post("/auth/register", data),
  registerOrg: (data: any) => api.post("/auth/register-org", data),
  logout: () => api.post("/auth/logout"),

  // User Management
  getCurrentUser: () => api.get("/auth/me"),
  changePassword: (data: ChangePasswordData) =>
    api.post("/auth/change-password", data),

  // Password Reset
  forgotPassword: (email: string) =>
    api.post("/auth/forgot-password", { email }),
  resetPassword: (token: string, password: string) =>
    api.post("/auth/reset-password", { token, password }),

  // Token Management
  refreshToken: () => api.post("/auth/refresh-token"),
};
