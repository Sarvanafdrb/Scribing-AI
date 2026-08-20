import type { QueryClient } from "@tanstack/react-query";
import { sessionKeys } from "@/services/session.queries";

export function invalidateDoctorWorkspaceQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: sessionKeys.all });
  queryClient.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) && query.queryKey.includes("doctor-queue"),
  });
}
