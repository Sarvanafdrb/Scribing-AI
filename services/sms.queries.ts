export const smsKeys = {
  all: ["sms"] as const,
  latest: (sessionId: string) => [...smsKeys.all, "latest", sessionId] as const,
};
