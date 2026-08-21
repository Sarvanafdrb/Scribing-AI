import { api } from "@/services/api";
import {
  TranscriptData,
  TranscriptSearchResult,
  UpdateTranscriptData,
} from "@/types/transcript.types";

export const transcriptService = {
  get: async (sessionId: string): Promise<TranscriptData | null> => {
    const response = await api.get(`/sessions/${sessionId}/transcript`);
    return response.data.data;
  },

  generate: async (sessionId: string): Promise<TranscriptData> => {
    const response = await api.post(`/sessions/${sessionId}/transcript/generate`);
    return response.data.data;
  },

  update: async (
    sessionId: string,
    data: UpdateTranscriptData,
  ): Promise<TranscriptData> => {
    const response = await api.put(`/sessions/${sessionId}/transcript`, data);
    return response.data.data;
  },

  reassignSpeakers: async (
    sessionId: string,
    mode: "auto" | "flip" = "auto",
  ): Promise<TranscriptData> => {
    const response = await api.post(
      `/sessions/${sessionId}/transcript/reassign-speakers`,
      { mode },
    );
    return response.data.data;
  },

  translate: async (
    sessionId: string,
    targetLanguage: string,
  ): Promise<TranscriptData> => {
    const response = await api.post(
      `/sessions/${sessionId}/transcript/translate`,
      { targetLanguage },
    );
    return response.data.data;
  },

  translateLiveLine: async (
    sessionId: string,
    text: string,
  ): Promise<{ translation: string }> => {
    const response = await api.post(
      `/sessions/${sessionId}/transcript/translate-live`,
      { text },
    );
    return response.data.data;
  },

  search: async (
    sessionId: string,
    query: string,
  ): Promise<TranscriptSearchResult[]> => {
    const response = await api.get(`/sessions/${sessionId}/transcript/search`, {
      params: { q: query },
    });
    return response.data.data || [];
  },
};
