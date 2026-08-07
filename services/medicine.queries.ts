export const medicineKeys = {
  all: ["medicines"] as const,
  lists: () => [...medicineKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) =>
    [...medicineKeys.lists(), filters] as const,
  search: (query: string, organizationId?: string) =>
    [...medicineKeys.all, "search", query, organizationId || ""] as const,
  details: () => [...medicineKeys.all, "detail"] as const,
  detail: (id: string) => [...medicineKeys.details(), id] as const,
};
