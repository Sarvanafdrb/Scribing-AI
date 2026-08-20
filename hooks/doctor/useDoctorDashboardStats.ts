import { useQuery } from "@tanstack/react-query";
import { sessionService } from "@/services/session.service";
import { sessionKeys } from "@/services/session.queries";
import { useAuthStore } from "@/store/auth.store";
import { useTenantScope } from "@/hooks/useTenantScope";
import type { DoctorDashboardDateRange } from "@/lib/doctor-dashboard-date-range";

export const useDoctorDashboardStats = (range?: DoctorDashboardDateRange) => {
  const user = useAuthStore((state) => state.user);
  const { organizationId } = useTenantScope();
  const doctorId = String(user?.id || user?._id || "");

  return useQuery({
    queryKey: sessionKeys.doctorDashboardStats(
      doctorId,
      organizationId || "",
      range?.start,
      range?.end,
    ),
    queryFn: () =>
      sessionService.getDoctorDashboardStats({
        organizationId: organizationId || undefined,
        doctorId: doctorId || undefined,
        dateFrom: range?.start,
        dateTo: range?.end,
      }),
    enabled: Boolean(doctorId && organizationId && range?.start && range?.end),
    staleTime: 60 * 1000,
  });
};