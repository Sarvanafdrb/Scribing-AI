import { api } from "@/services/api";
import type {
  AdminAvailabilityUserRow,
  AvailabilityException,
  AvailabilityExceptionType,
  AvailabilityUserType,
  DoctorSchedule,
  LeaveRecord,
  ResolvedDayAvailability,
  ScheduleChangeWarning,
  SelfAvailabilityResponse,
  StaffSchedule,
  WeeklyDaySchedule,
  WorkingSession,
} from "@/types/availability.types";

type ApiSaveResponse<T> = {
  success: boolean;
  data: T;
  warnings?: ScheduleChangeWarning[];
};

export const availabilityService = {
  getSelf: async (
    organizationId: string,
    userType?: AvailabilityUserType,
  ): Promise<SelfAvailabilityResponse> => {
    const response = await api.get("/availability/me", {
      params: { organizationId, userType },
    });
    return response.data.data;
  },

  saveDoctorWeekly: async (payload: {
    organizationId: string;
    weekly: WeeklyDaySchedule[];
    consultationMinutes?: number;
    bufferMinutes?: number;
    timeZone?: string;
  }): Promise<ApiSaveResponse<{ schedule: DoctorSchedule }>> => {
    const response = await api.put("/availability/me/weekly", {
      ...payload,
      userType: "doctor",
    });
    return response.data;
  },

  saveStaffWeekly: async (payload: {
    organizationId: string;
    weekly: WeeklyDaySchedule[];
    timeZone?: string;
  }): Promise<ApiSaveResponse<{ schedule: StaffSchedule }>> => {
    const response = await api.put("/availability/me/staff/weekly", {
      ...payload,
      userType: "staff",
    });
    return response.data;
  },

  getSelfDay: async (
    organizationId: string,
    date: string,
    userType?: AvailabilityUserType,
  ): Promise<{
    resolved: ResolvedDayAvailability;
    schedule: DoctorSchedule | StaffSchedule | null;
  }> => {
    const response = await api.get("/availability/me/day", {
      params: { organizationId, date, userType },
    });
    return response.data.data;
  },

  listExceptions: async (
    organizationId: string,
    params?: { from?: string; to?: string; userType?: AvailabilityUserType },
  ): Promise<AvailabilityException[]> => {
    const response = await api.get("/availability/me/exceptions", {
      params: { organizationId, ...params },
    });
    return response.data.data || [];
  },

  createException: async (payload: {
    organizationId: string;
    userType?: AvailabilityUserType;
    date: string;
    exceptionType: AvailabilityExceptionType;
    workingSessions?: WorkingSession[];
    blockedStartTime?: string;
    blockedEndTime?: string;
    reason?: string;
  }): Promise<ApiSaveResponse<{ exception: AvailabilityException }>> => {
    const response = await api.post("/availability/me/exceptions", payload);
    return response.data;
  },

  patchException: async (
    exceptionId: string,
    payload: Record<string, unknown>,
  ): Promise<ApiSaveResponse<{ exception: AvailabilityException }>> => {
    const response = await api.patch(
      `/availability/me/exceptions/${exceptionId}`,
      payload,
    );
    return response.data;
  },

  cancelException: async (
    exceptionId: string,
    organizationId: string,
  ): Promise<ApiSaveResponse<{ exception: AvailabilityException }>> => {
    const response = await api.post(
      `/availability/me/exceptions/${exceptionId}/cancel`,
      { organizationId },
    );
    return response.data;
  },

  deleteException: async (
    exceptionId: string,
    organizationId: string,
  ): Promise<void> => {
    await api.delete(`/availability/me/exceptions/${exceptionId}`, {
      params: { organizationId },
    });
  },

  listLeave: async (
    organizationId: string,
    userType?: AvailabilityUserType,
  ): Promise<LeaveRecord[]> => {
    const response = await api.get("/availability/me/leave", {
      params: { organizationId, userType },
    });
    return response.data.data || [];
  },

  createLeave: async (payload: {
    organizationId: string;
    userType?: AvailabilityUserType;
    startDate: string;
    endDate: string;
    reason?: string;
  }): Promise<ApiSaveResponse<{ leave: LeaveRecord }>> => {
    const response = await api.post("/availability/me/leave", payload);
    return response.data;
  },

  patchLeave: async (
    leaveId: string,
    payload: Record<string, unknown>,
  ): Promise<ApiSaveResponse<{ leave: LeaveRecord }>> => {
    const response = await api.patch(
      `/availability/me/leave/${leaveId}`,
      payload,
    );
    return response.data;
  },

  deleteLeave: async (leaveId: string, organizationId: string): Promise<void> => {
    await api.delete(`/availability/me/leave/${leaveId}`, {
      params: { organizationId },
    });
  },

  adminListDoctors: async (params: {
    organizationId: string;
    page?: number;
    limit?: number;
    date?: string;
  }): Promise<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    items: AdminAvailabilityUserRow[];
  }> => {
    const response = await api.get("/availability/admin/doctors", { params });
    return response.data.data;
  },

  adminGetDoctor: async (
    organizationId: string,
    userId: string,
    date?: string,
  ) => {
    const response = await api.get(`/availability/admin/doctors/${userId}`, {
      params: { organizationId, date },
    });
    return response.data.data;
  },

  adminListStaff: async (params: {
    organizationId: string;
    page?: number;
    limit?: number;
    date?: string;
  }): Promise<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    items: AdminAvailabilityUserRow[];
  }> => {
    const response = await api.get("/availability/admin/staff", { params });
    return response.data.data;
  },

  adminGetStaff: async (
    organizationId: string,
    userId: string,
    date?: string,
  ) => {
    const response = await api.get(`/availability/admin/staff/${userId}`, {
      params: { organizationId, date },
    });
    return response.data.data;
  },
};