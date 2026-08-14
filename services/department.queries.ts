export const departmentKeys = {
  all: ["departments"] as const,
  lists: () => [...departmentKeys.all, "list"] as const,
  list: (filters: {
    search?: string;
    isActive?: string;
    organizationId?: string;
    page?: number;
    limit?: number;
  }) => [...departmentKeys.lists(), filters] as const,
  details: () => [...departmentKeys.all, "detail"] as const,
  detail: (id: string) => [...departmentKeys.details(), id] as const,
};
