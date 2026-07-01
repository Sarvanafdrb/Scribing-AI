import { api } from "@/services/api";
import { AiNotes, GenerateAiNotesResponse } from "@/types/ai-notes.types";

export const aiNotesService = {
  get: async (sessionId: string): Promise<AiNotes | null> => {
    const response = await api.get(`/sessions/${sessionId}/ai-notes`);
    return response.data.data;
  },

  generate: async (
    sessionId: string,
    force = false,
  ): Promise<GenerateAiNotesResponse> => {
    const response = await api.post(
      `/sessions/${sessionId}/ai-notes/generate`,
      {},
      {
        params: force ? { force: "true" } : undefined,
      },
    );
    return response.data.data;
  },
};
