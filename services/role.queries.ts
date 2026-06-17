export const roleKeys = {
  all: ["roles"] as const,
  lists: () => [...roleKeys.all, "list"] as const,
  list: (filters: {
    search?: string;
    organizationId?: string;
    page?: number;
    limit?: number;
  }) => [...roleKeys.lists(), filters] as const,
  details: () => [...roleKeys.all, "detail"] as const,
  detail: (id: string) => [...roleKeys.details(), id] as const,
};
