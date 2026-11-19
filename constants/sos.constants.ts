import type { SosEmergencyType } from "@/types/sos.types";

export const SOS_EMERGENCY_OPTIONS: Array<{
  value: SosEmergencyType;
  label: string;
  description: string;
}> = [
  {
    value: "cardiac_emergency",
    label: "Cardiac Emergency",
    description: "Chest pain, arrest, or acute cardiac symptoms",
  },
  {
    value: "breathing_difficulty",
    label: "Breathing Difficulty",
    description: "Respiratory distress or severe breathlessness",
  },
  {
    value: "unconscious_patient",
    label: "Unconscious Patient",
    description: "Unresponsive or collapsed patient",
  },
  {
    value: "critical_patient_condition",
    label: "Critical Patient Condition",
    description: "Rapid deterioration or unstable vitals",
  },
  {
    value: "other_emergency",
    label: "Other Emergency",
    description: "Other urgent hospital emergency",
  },
];