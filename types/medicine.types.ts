export interface MedicineIndication {
  id: string;
  name: string;
  normalizedName: string;
  aliases: string[];
}

export interface Medicine {
  id: string;
  _id?: string;
  organizationId: string;
  name: string;
  genericName?: string;
  brandName?: string;
  form?: string;
  strength?: string;
  route?: string;
  cost: number;
  indications: MedicineIndication[];
  isActive: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MedicineSearchResult extends Medicine {
  matchedConditions: string[];
  matchScore: number;
  matchPriority: "all" | "partial" | "name";
}

export interface CreateMedicineData {
  organizationId?: string;
  name: string;
  genericName?: string;
  brandName?: string;
  form?: string;
  strength?: string;
  route?: string;
  cost?: number;
  conditions?: string[];
  indications?: Array<{ name: string; aliases?: string[] }>;
}

export interface UpdateMedicineData {
  name?: string;
  genericName?: string;
  brandName?: string;
  form?: string;
  strength?: string;
  route?: string;
  cost?: number;
  conditions?: string[];
  indications?: Array<{ name: string; aliases?: string[] }>;
  isActive?: boolean;
}

export const MEDICINE_FORMS = [
  "Tablet",
  "Capsule",
  "Syrup",
  "Injection",
  "Cream",
  "Drops",
  "Inhaler",
  "Other",
] as const;

export const MEDICINE_ROUTES = [
  "Oral",
  "IV",
  "IM",
  "Topical",
  "Inhalation",
  "Sublingual",
  "Other",
] as const;
