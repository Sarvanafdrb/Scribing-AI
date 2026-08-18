const LAST_DOCTOR_WORKSPACE_SESSION_KEY = "doctor-last-workspace-session";

export const setLastDoctorWorkspaceSessionId = (sessionId: string) => {
  if (typeof window === "undefined" || !sessionId) return;
  sessionStorage.setItem(LAST_DOCTOR_WORKSPACE_SESSION_KEY, sessionId);
};

export const getLastDoctorWorkspaceSessionId = (): string | null => {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(LAST_DOCTOR_WORKSPACE_SESSION_KEY);
};

/** Prefer returning to the last open consultation instead of the queue bootstrap page. */
export const getDoctorWorkspaceBackPath = (): string => {
  const sessionId = getLastDoctorWorkspaceSessionId();
  return sessionId ? `/doctor/workspace/${sessionId}` : "/doctor/workspace";
};
