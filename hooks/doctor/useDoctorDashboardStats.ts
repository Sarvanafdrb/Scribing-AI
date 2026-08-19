import { useQuery } from "@tanstack/react-query";
import { sessionService } from "@/services/session.service";
import { sessionKeys } from "@/services/session.queries";
import { useAuthStore } from "@/store/auth.store";
import { useTenantScope } from "@/hooks/useTenantScope";

export const useDoctorDashboardStats = () => {
  const user = useAuthStore((state) => state.user);
  const { organizationId } = useTenantScope();
  const doctorId = String(user?.id || user?._id || "");

  return useQuery({
    queryKey: sessionKeys.doctorDashboardStats(doctorId, organizationId || ""),
    queryFn: () =>
      sessionService.getDoctorDashboardStats({
        organizationId: organizationId || undefined,
        doctorId: doctorId || undefined,
      }),
    enabled: Boolean(doctorId && organizationId),
    staleTime: 60 * 1000,
  });
};
