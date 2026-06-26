export type PatientGender = "male" | "female" | "other" | "unknown";

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
  isActive?: boolean;
}
