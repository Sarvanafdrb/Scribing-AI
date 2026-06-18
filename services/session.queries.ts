export const sessionKeys = {
  all: ["sessions"] as const,
  lists: () => [...sessionKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) =>
    [...sessionKeys.lists(), filters] as const,
  stats: () => [...sessionKeys.all, "stats"] as const,
  details: () => [...sessionKeys.all, "detail"] as const,
  detail: (id: string) => [...sessionKeys.details(), id] as const,
};
