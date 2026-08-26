export const aiJobsKeys = {
  all: ["ai-jobs"] as const,
  session: (sessionId: string) => [...aiJobsKeys.all, sessionId] as const,
};
