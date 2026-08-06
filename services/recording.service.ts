import { api } from "@/services/api";
import {
  CompleteRecordingData,
  PlaybackUrlResponse,
  RecordingAutosaveData,
  UploadUrlResponse,
} from "@/types/recording.types";
import { Session } from "@/types/session.types";

export const getUploadsBaseUrl = (): string => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

  if (apiUrl.startsWith("http://") || apiUrl.startsWith("https://")) {
    return apiUrl.replace(/\/api\/?$/, "");
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return (
    process.env.NEXT_PUBLIC_UPLOADS_BASE_URL || "http://localhost:5000"
  ).replace(/\/$/, "");
};

export const resolveAudioUrl = (audioUrl: string): string => {
  if (audioUrl.startsWith("http://") || audioUrl.startsWith("https://")) {
    return audioUrl;
  }

  // Opaque S3 storage refs are not playable — callers must use playback-url.
  if (audioUrl.startsWith("s3://")) {
    return audioUrl;
  }

  const base = getUploadsBaseUrl();
  const normalizedPath = audioUrl.startsWith("/") ? audioUrl : `/${audioUrl}`;

  return `${base}${normalizedPath}`;
};

export const recordingService = {
  start: async (sessionId: string): Promise<Session> => {
    const response = await api.post(`/sessions/${sessionId}/recording/start`);
    return response.data.data;
  },

  pause: async (sessionId: string): Promise<Session> => {
    const response = await api.post(`/sessions/${sessionId}/recording/pause`);
    return response.data.data;
  },

  resume: async (sessionId: string): Promise<Session> => {
    const response = await api.post(`/sessions/${sessionId}/recording/resume`);
    return response.data.data;
  },

  interrupt: async (
    sessionId: string,
    data?: { elapsedSeconds?: number },
  ): Promise<Session> => {
    const response = await api.post(
      `/sessions/${sessionId}/recording/interrupt`,
      data || {},
    );
    return response.data.data;
  },

  discard: async (sessionId: string): Promise<Session> => {
    const response = await api.post(`/sessions/${sessionId}/recording/discard`);
    return response.data.data;
  },

  autosave: async (
    sessionId: string,
    data: RecordingAutosaveData,
  ): Promise<Session> => {
    const response = await api.post(
      `/sessions/${sessionId}/recording/autosave`,
      data,
    );
    return response.data.data;
  },

  finalize: async (sessionId: string): Promise<Session> => {
    const response = await api.post(
      `/sessions/${sessionId}/recording/finalize`,
    );
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

  completeSegment: async (
    sessionId: string,
    data: CompleteRecordingData,
  ): Promise<Session> => {
    const response = await api.post(
      `/sessions/${sessionId}/recording/segment/complete`,
      data,
    );
    return response.data.data;
  },

  uploadFile: async (
    sessionId: string,
    file: File | Blob,
    duration: number,
    fileName = "recording.webm",
    options?: { finalize?: boolean; statusAfter?: string },
  ): Promise<Session> => {
    const formData = new FormData();
    formData.append("audio", file, fileName);
    formData.append("duration", String(Math.round(duration)));
    if (options?.finalize === false) {
      formData.append("finalize", "false");
    }
    if (options?.statusAfter) {
      formData.append("statusAfter", options.statusAfter);
    }

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

  uploadSegment: async (
    sessionId: string,
    file: File | Blob,
    duration: number,
    fileName: string,
    statusAfter = "interrupted",
  ): Promise<Session> => {
    const formData = new FormData();
    formData.append("audio", file, fileName);
    formData.append("duration", String(Math.round(duration)));
    formData.append("statusAfter", statusAfter);

    const response = await api.post(
      `/sessions/${sessionId}/recording/segment/upload`,
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
