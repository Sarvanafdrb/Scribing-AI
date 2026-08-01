import { api } from "@/services/api";
import type {
  AdmitPatientData,
  CreateRoundData,
  DispositionType,
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

  setDisposition: async (
    sessionId: string,
    disposition: DispositionType,
  ): Promise<Session> => {
    const response = await api.post(`/sessions/${sessionId}/disposition`, {
      disposition,
    });
    return response.data.data;
  },
};
