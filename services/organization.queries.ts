// services/organization.queries.ts
import { QueryKey } from "@tanstack/react-query";

export const organizationKeys = {
  all: ["organizations"] as const,
  lists: () => [...organizationKeys.all, "list"] as const,
  list: (filters: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => [...organizationKeys.lists(), filters] as const,
  details: () => [...organizationKeys.all, "detail"] as const,
  detail: (id: string) => [...organizationKeys.details(), id] as const,
  users: (id: string) => [...organizationKeys.detail(id), "users"] as const,
  stats: () => [...organizationKeys.all, "stats"] as const,
};
