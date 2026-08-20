export const sessionKeys = {
  all: ["sessions"] as const,
  lists: () => [...sessionKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) =>
    [...sessionKeys.lists(), filters] as const,
  stats: (organizationId?: string) =>
    [...sessionKeys.all, "stats", organizationId || "all"] as const,
  doctorDashboardStats: (
    doctorId: string,
    organizationId: string,
    dateFrom?: string,
    dateTo?: string,
  ) =>
    [
      ...sessionKeys.all,
      "doctor-dashboard-stats",
      doctorId,
      organizationId,
      dateFrom || "",
      dateTo || "",
    ] as const,
  details: () => [...sessionKeys.all, "detail"] as const,
  detail: (id: string) => [...sessionKeys.details(), id] as const,
};
