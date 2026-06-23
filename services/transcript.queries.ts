export const transcriptKeys = {
  all: ["transcripts"] as const,
  detail: (sessionId: string) =>
    [...transcriptKeys.all, sessionId] as const,
  search: (sessionId: string, query: string) =>
    [...transcriptKeys.all, sessionId, "search", query] as const,
};
