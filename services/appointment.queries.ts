export const appointmentKeys = {
  all: ["appointments"] as const,
  lists: () => [...appointmentKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) =>
    [...appointmentKeys.lists(), filters] as const,
  details: () => [...appointmentKeys.all, "detail"] as const,
  detail: (id: string) => [...appointmentKeys.details(), id] as const,
};
