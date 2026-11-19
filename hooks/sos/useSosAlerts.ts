import { useQuery } from "@tanstack/react-query";
import { sosService } from "@/services/sos.service";

export const sosKeys = {
  all: ["sos"] as const,
  active: (organizationId: string) =>
    [...sosKeys.all, "active", organizationId] as const,
  history: (organizationId: string) =>
    [...sosKeys.all, "history", organizationId] as const,
};

export function useActiveSosAlerts(
  organizationId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: sosKeys.active(organizationId || ""),
    queryFn: () => sosService.listActive(organizationId!),
    enabled: Boolean(organizationId && enabled),
    refetchInterval: 15_000,
  });
}

export function useSosHistory(organizationId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: sosKeys.history(organizationId || ""),
    queryFn: () => sosService.listHistory(organizationId!, { limit: 8 }),
    enabled: Boolean(organizationId && enabled),
    refetchInterval: 30_000,
  });
}