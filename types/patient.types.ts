export type PatientGender = "male" | "female" | "other" | "unknown";

export const BLOOD_GROUPS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
] as const;

export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export interface PatientOrganization {
  _id?: string;
  id?: string;
  name?: string;
  organizationCode?: string;
}

export interface Patient {
  _id?: string;
  id?: string;
  patientCode: string;
  firstName: string;
  lastName: string;
  gender: PatientGender;
  dateOfBirth?: string;
  age?: number;
  phoneNumber: string;
  email?: string;
  address?: string;
  allergies?: string[];
  medications?: string[];
  bloodGroup?: BloodGroup;
  organizationId: string | PatientOrganization;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePatientData {
  firstName: string;
  lastName: string;
  gender: PatientGender;
  dateOfBirth?: string;
  age?: number;
  phoneNumber: string;
  email?: string;
  address?: string;
  allergies?: string[];
  medications?: string[];
  bloodGroup?: BloodGroup;
  organizationId: string;
}

export interface UpdatePatientData {
  firstName?: string;
  lastName?: string;
  gender?: PatientGender;
  dateOfBirth?: string;
  age?: number;
  phoneNumber?: string;
  email?: string;
  address?: string;
  allergies?: string[];
  medications?: string[];
  bloodGroup?: BloodGroup | "";
  isActive?: boolean;
}
