export const aiNotesKeys = {
  all: ["ai-notes"] as const,
  details: () => [...aiNotesKeys.all, "detail"] as const,
  detail: (sessionId: string) => [...aiNotesKeys.details(), sessionId] as const,
};
