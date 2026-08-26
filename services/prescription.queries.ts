export const prescriptionKeys = {
  all: ["prescriptions"] as const,
  billing: (sessionId: string) =>
    [...prescriptionKeys.all, "billing", sessionId] as const,
};
