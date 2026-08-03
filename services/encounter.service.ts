import { api } from "@/services/api";
import type {
  AdmitPatientData,
  CreateRoundData,
  DispositionType,
  DoctorQueueItem,
  EncounterBundle,
} from "@/types/encounter.types";
import type { Session } from "@/types/session.types";

export const encounterService = {
  getForSession: async (sessionId: string): Promise<EncounterBundle> => {
    const response = await api.get(`/sessions/${sessionId}/encounter`);
    return response.data.data;
  },

  admitPatient: async (
    sessionId: string,
    data: AdmitPatientData,
  ): Promise<EncounterBundle> => {
    const response = await api.post(`/sessions/${sessionId}/encounter/admit`, data);
    return response.data.data;
  },

  createNextRound: async (
    sessionId: string,
    data: CreateRoundData = {},
  ): Promise<{ session: Session } & EncounterBundle> => {
    const response = await api.post(
      `/sessions/${sessionId}/encounter/rounds`,
      data,
    );
    return response.data.data;
  },

  startRoundForEncounter: async (
    encounterId: string,
    data: { roundScheduleId?: string } = {},
  ): Promise<{ session: Session } & EncounterBundle> => {
    const response = await api.post(
      `/sessions/encounters/${encounterId}/rounds/start`,
      data,
    );
    return response.data.data;
  },

  setDisposition: async (
    sessionId: string,
    disposition: DispositionType,
    options?: { followUpDate?: string },
  ): Promise<{ session: Session; encounter?: unknown }> => {
    const response = await api.post(`/sessions/${sessionId}/disposition`, {
      disposition,
      followUpDate: options?.followUpDate,
    });
    return response.data.data;
  },

  getDoctorQueue: async (params: {
    organizationId: string;
    doctorId?: string;
  }): Promise<{ items: DoctorQueueItem[]; dateKey: string }> => {
    const response = await api.get("/sessions/doctor-queue", { params });
    return response.data.data;
  },
};
