import type { Patient } from "@/types/patient.types";

/** Indian mobile: 10 digits, starts with 6, 7, 8, or 9 */
export const INDIAN_MOBILE_LENGTH = 10;

/** Age input: numeric only, up to 3 digits */
export const AGE_MAX_DIGITS = 3;

export const sanitizeAgeInput = (value: string): string =>
  value.replace(/\D/g, "").slice(0, AGE_MAX_DIGITS);

export const INDIAN_PHONE_ERROR =
  "Enter a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9)";

const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

/** Strip non-digits, handle +91/91/0 prefix, cap at 10, reject invalid leading digit */
export const sanitizeIndianPhoneInput = (value: string): string => {
  let digits = value.replace(/\D/g, "");

  if (digits.length > INDIAN_MOBILE_LENGTH) {
    if (digits.startsWith("91") && digits.length >= 12) {
      digits = digits.slice(2, 12);
    } else if (digits.startsWith("0") && digits.length >= 11) {
      digits = digits.slice(1, 11);
    } else {
      digits = digits.slice(0, INDIAN_MOBILE_LENGTH);
    }
  }

  if (digits.length >= 1 && !/[6-9]/.test(digits[0]!)) {
    digits = digits.slice(1);
  }

  return digits.slice(0, INDIAN_MOBILE_LENGTH);
};

export const normalizeIndianPhoneNumber = (phone: string): string =>
  sanitizeIndianPhoneInput(phone);

export const isValidIndianPhoneNumber = (phone: string): boolean =>
  INDIAN_MOBILE_REGEX.test(normalizeIndianPhoneNumber(phone));

/** @deprecated Use normalizeIndianPhoneNumber */
export const normalizePhoneNumber = normalizeIndianPhoneNumber;

/** @deprecated Use INDIAN_PHONE_ERROR */
export const PHONE_NUMBER_ERROR = INDIAN_PHONE_ERROR;

/** Display + inline-edit format for patient DOB (e.g. 4/12/1998). */
export const PATIENT_DOB_LOCALE = "en-IN";
export const PATIENT_DOB_INPUT_PLACEHOLDER = "DD/MM/YYYY";

const patientDobFormatOptions: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "numeric",
  year: "numeric",
};

export const parsePatientDateOfBirthInput = (input: string): Date | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  if (iso) {
    const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(trimmed);
  if (dmy) {
    const date = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/** Parse API ISO strings or user-entered DOB text as a local calendar date. */
export const parsePatientDateOfBirth = (
  value?: string | null,
): Date | null => {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  const isoPrefix = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (isoPrefix) {
    const date = new Date(
      Number(isoPrefix[1]),
      Number(isoPrefix[2]) - 1,
      Number(isoPrefix[3]),
    );
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return parsePatientDateOfBirthInput(trimmed);
};

export const formatPatientDateOfBirthValue = (date: Date): string =>
  date.toLocaleDateString(PATIENT_DOB_LOCALE, patientDobFormatOptions);

export const patientDateOfBirthToInputValue = (
  dateOfBirth?: string | null,
): string => {
  const date = parsePatientDateOfBirth(dateOfBirth);
  if (!date) return "";
  return formatPatientDateOfBirthValue(date);
};

/** Stable ISO for API storage without timezone day-shift. */
export const patientDateOfBirthToIso = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}T12:00:00.000Z`;
};

export const PATIENT_DOB_INVALID_MESSAGE = `Enter date as ${PATIENT_DOB_INPUT_PLACEHOLDER}.`;

export const calculateAgeFromDateOfBirth = (
  dateOfBirth?: string | null,
): number | null => {
  if (!dateOfBirth) return null;

  const birthDate = parsePatientDateOfBirth(dateOfBirth);
  if (!birthDate) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age >= 0 ? age : null;
};

export const getPatientId = (patient: Patient | string | undefined | null) => {
  if (!patient) return "";
  if (typeof patient === "string") return patient;
  return patient.id || patient._id || "";
};

export const getPatientFullName = (
  patient: Patient | string | undefined | null,
) => {
  if (!patient || typeof patient === "string") return "—";
  return `${patient.firstName || ""} ${patient.lastName || ""}`.trim() || "—";
};

export const getPatientAge = (patient: Patient | undefined | null) => {
  if (!patient) return null;
  if (patient.dateOfBirth) {
    return calculateAgeFromDateOfBirth(patient.dateOfBirth) ?? patient.age ?? null;
  }
  return patient.age ?? null;
};

export const formatPatientOptionLabel = (patient: Patient) => {
  const fullName = getPatientFullName(patient);
  const age = getPatientAge(patient);
  const ageLabel = age !== null ? `Age ${age}` : "Age —";
  return `${fullName} · ${patient.patientCode} · ${patient.phoneNumber} · ${ageLabel}`;
};

export const formatPatientDateOfBirth = (dateOfBirth?: string | null) => {
  const date = parsePatientDateOfBirth(dateOfBirth);
  if (!date) return "—";
  return formatPatientDateOfBirthValue(date);
};

export const getNormalizedAllergies = (
  patient: Patient | null | undefined,
): string[] =>
  (patient?.allergies || [])
    .map((allergy) => allergy.trim())
    .filter(Boolean);

export const getHomeMedications = (
  patient: Patient | null | undefined,
): string[] =>
  (patient?.medications || []).map((med) => med.trim()).filter(Boolean);
