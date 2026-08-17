export const invitationKeys = {
  all: ["invitations"] as const,
  lists: () => [...invitationKeys.all, "list"] as const,
  list: (filters: {
    search?: string;
    status?: string;
    organizationId?: string;
    roleId?: string;
    departmentId?: string;
    page?: number;
    limit?: number;
  }) => [...invitationKeys.lists(), filters] as const,
  acceptPreview: (token: string) =>
    [...invitationKeys.all, "accept-preview", token] as const,
};
