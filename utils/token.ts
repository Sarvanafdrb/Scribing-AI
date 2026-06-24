export interface AccessTokenPayload {
  id?: string;
  email?: string;
  isSuperAdmin?: boolean;
  organizationId?: string;
  roleId?: string;
}

export const decodeAccessToken = (
  token: string | null | undefined,
): AccessTokenPayload | null => {
  if (!token) return null;

  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    return JSON.parse(atob(payload)) as AccessTokenPayload;
  } catch {
    return null;
  }
};
