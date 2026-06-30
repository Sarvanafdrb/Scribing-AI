export const roleKeys = {
  all: ["roles"] as const,
  lists: () => [...roleKeys.all, "list"] as const,
  list: (filters: {
    search?: string;
    organizationId?: string;
    page?: number;
    limit?: number;
  }) => [...roleKeys.lists(), filters] as const,
  permissionsPage: (organizationId: string) =>
    [...roleKeys.all, "permissions-page", organizationId] as const,
  rolePermissions: (roleId: string) =>
    [...roleKeys.all, roleId, "permissions"] as const,
  details: () => [...roleKeys.all, "detail"] as const,
  detail: (id: string) => [...roleKeys.details(), id] as const,
  stats: (organizationId?: string) =>
    [...roleKeys.all, "stats", organizationId || "all"] as const,
};
