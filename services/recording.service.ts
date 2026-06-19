import { api } from "@/services/api";
import {
  CompleteRecordingData,
  PlaybackUrlResponse,
  UploadUrlResponse,
} from "@/types/recording.types";
import { Session } from "@/types/session.types";

export const recordingService = {
  start: async (sessionId: string): Promise<Session> => {
    const response = await api.post(`/sessions/${sessionId}/recording/start`);
    return response.data.data;
  },

  getUploadUrl: async (
    sessionId: string,
    fileName: string,
    contentType: string,
  ): Promise<UploadUrlResponse> => {
    const response = await api.post(`/sessions/${sessionId}/recording/upload-url`, {
      fileName,
      contentType,
    });
    return response.data.data;
  },

  complete: async (
    sessionId: string,
    data: CompleteRecordingData,
  ): Promise<Session> => {
    const response = await api.post(
      `/sessions/${sessionId}/recording/complete`,
      data,
    );
    return response.data.data;
  },

  uploadFile: async (
    sessionId: string,
    file: File | Blob,
    duration: number,
    fileName = "recording.webm",
  ): Promise<Session> => {
    const formData = new FormData();
    formData.append("audio", file, fileName);
    formData.append("duration", String(Math.round(duration)));

    const response = await api.post(
      `/sessions/${sessionId}/recording/upload`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return response.data.data;
  },

  getPlaybackUrl: async (
    sessionId: string,
  ): Promise<PlaybackUrlResponse> => {
    const response = await api.get(
      `/sessions/${sessionId}/recording/playback-url`,
    );
    return response.data.data;
  },
};

export const resolveAudioUrl = (audioUrl: string): string => {
  if (audioUrl.startsWith("http://") || audioUrl.startsWith("https://")) {
    return audioUrl;
  }

  const apiBase =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, "") ||
    "http://localhost:5000";

  return `${apiBase}${audioUrl.startsWith("/") ? audioUrl : `/${audioUrl}`}`;
};
