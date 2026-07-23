import { api } from "@/services/api";
import {
  AcceptVoiceEditPayload,
  AcceptVoiceEditResponse,
  AiNotes,
  GenerateAiNotesResponse,
  VoiceEditPreviewResult,
} from "@/types/ai-notes.types";

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

  update: async (
    sessionId: string,
    data: import("@/types/ai-notes.types").UpdateAiNotesData,
  ): Promise<AiNotes> => {
    const response = await api.patch(`/sessions/${sessionId}/ai-notes`, data);
    return response.data.data;
  },

  previewVoiceEdit: async (
    sessionId: string,
    audioBlob: Blob,
    fileName: string,
  ): Promise<VoiceEditPreviewResult> => {
    const formData = new FormData();
    formData.append("audio", audioBlob, fileName);

    const response = await api.post(
      `/sessions/${sessionId}/ai-notes/voice-edit/preview`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return response.data.data;
  },

  acceptVoiceEdit: async (
    sessionId: string,
    data: AcceptVoiceEditPayload,
  ): Promise<AcceptVoiceEditResponse> => {
    const response = await api.post(
      `/sessions/${sessionId}/ai-notes/voice-edit/accept`,
      data,
    );
    return response.data.data;
  },
};
