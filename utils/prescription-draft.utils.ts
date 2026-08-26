import type { AiNotes, AiNotesMedication } from "@/types/ai-notes.types";
import type { TranscriptSegment } from "@/types/transcript.types";
import type { MedicineSearchResult } from "@/types/medicine.types";
import {
  extractDiagnosisQuery,
  extractIcdCodes,
  splitSoapLines,
} from "@/utils/clinical-note.utils";
import { getMedicationDoseLabel } from "@/utils/prescriptionPrice.utils";

export type DraftProposalKind =
  | "medication"
  | "lab"
  | "followup"
  | "billing"
  | "formulary";

export interface DraftProposal {
  id: string;
  kind: DraftProposalKind;
  title: string;
  subtitle?: string;
  timestamp?: string;
  medication?: AiNotesMedication;
  formularyMedicine?: MedicineSearchResult;
}

export interface ConditionPack {
  label: string;
  query: string;
}

const LAB_LINE_PATTERN =
  /\b(hb?a1c|fasting glucose|glucose|creatinine|lipid|cbc|tsh|lab|investigation|order)\b/i;
const FOLLOWUP_LINE_PATTERN =
  /\b(review|follow[\s-]?up|return|recheck|revisit|months?|weeks?)\b/i;

const formatTimestamp = (seconds?: number) => {
  if (seconds === undefined || Number.isNaN(seconds)) return undefined;
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const secs = (total % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

const findMedicationTimestamp = (
  med: AiNotesMedication,
  segments: TranscriptSegment[],
) => {
  const query = (med.medicine || "").trim().toLowerCase();
  if (!query || segments.length === 0) return undefined;

  for (const segment of segments) {
    if (segment.text.toLowerCase().includes(query.split(" ")[0])) {
      return formatTimestamp(segment.start);
    }
  }
  return undefined;
};

const formatMedicationProposalTitle = (med: AiNotesMedication) => {
  const name = med.medicine?.trim() || "Medication";
  const dose = getMedicationDoseLabel(med);
  const days = med.days?.trim();

  let title = name;
  if (dose) title += ` · ${dose}`;
  if (days) title += ` · ${days} days`;
  return title;
};

const formatMedicationProposalSubtitle = (med: AiNotesMedication) => {
  if (med.instructions?.trim()) return med.instructions.trim();

  const morning = med.morning || "0";
  const afternoon = med.afternoon || "0";
  const night = med.night || "0";

  if (morning === "1" && afternoon === "0" && night === "1") {
    return "Twice daily dosing from the consultation.";
  }
  if (morning === "0" && afternoon === "0" && night === "1") {
    return "At night — as discussed in the consultation.";
  }
  if (morning === "1" && afternoon === "0" && night === "0") {
    return "Once daily — as discussed in the consultation.";
  }

  return "Medication discussed during the consultation.";
};

const CLINICAL_TEXT = (aiNotes?: AiNotes) =>
  [aiNotes?.subjective, aiNotes?.assessment, aiNotes?.plan, aiNotes?.summary]
    .filter(Boolean)
    .join("\n");

const CONDITION_SIGNALS: Array<{
  pattern: RegExp;
  query: string;
  packLabel?: string;
}> = [
  {
    pattern: /\bfever\b|\bpyrexia\b|\bகாய்ச்சல்\b|\btemperature\b/i,
    query: "fever",
    packLabel: "Fever care pack",
  },
  {
    pattern: /\bcough\b|\bcold\b|\burti\b|\bsore throat\b/i,
    query: "cough",
    packLabel: "Cold & cough pack",
  },
  {
    pattern: /\bheadache\b|\bmigraine\b/i,
    query: "headache",
  },
  {
    pattern: /\bdiabetes|dm\b|e11|metformin|hba1c/i,
    query: "diabetes",
    packLabel: "Type 2 diabetes review pack",
  },
  {
    pattern: /\bhypertension|htn|i10|telmisartan|blood pressure|\bbp\b/i,
    query: "hypertension",
    packLabel: "Hypertension follow-up pack",
  },
];

/** Condition keywords from SOAP notes — used to load formulary suggestions. */
export const extractConditionQueries = (aiNotes?: AiNotes): string[] => {
  const source = CLINICAL_TEXT(aiNotes);
  if (!source.trim()) return [];

  const queries = new Set<string>();

  for (const signal of CONDITION_SIGNALS) {
    if (signal.pattern.test(source)) {
      queries.add(signal.query);
    }
  }

  const assessmentQuery = extractDiagnosisQuery(
    aiNotes?.assessment,
    aiNotes?.plan,
  );
  if (assessmentQuery) queries.add(assessmentQuery);

  if (queries.size === 0 && aiNotes?.subjective?.trim()) {
    const chief = splitSoapLines(aiNotes.subjective)[0]?.trim();
    if (chief && chief.length >= 3) queries.add(chief.slice(0, 40));
  }

  return [...queries].slice(0, 5);
};

export const detectConditionPacks = (
  assessment?: string,
  plan?: string,
  subjective?: string,
): ConditionPack[] => {
  const text = `${subjective || ""} ${assessment || ""} ${plan || ""}`.toLowerCase();
  const packs: ConditionPack[] = [];
  const seen = new Set<string>();

  for (const signal of CONDITION_SIGNALS) {
    if (!signal.packLabel || !signal.pattern.test(text) || seen.has(signal.query)) {
      continue;
    }
    seen.add(signal.query);
    packs.push({ label: signal.packLabel, query: signal.query });
  }

  return packs;
};

export const buildDraftProposals = (
  aiNotes: AiNotes | undefined,
  segments: TranscriptSegment[] = [],
): DraftProposal[] => {
  if (!aiNotes) return [];

  const proposals: DraftProposal[] = [];

  (aiNotes.medications || []).forEach((med, index) => {
    if (!med.medicine?.trim()) return;
    proposals.push({
      id: `med-${index}-${med.medicine}`,
      kind: "medication",
      title: formatMedicationProposalTitle(med),
      subtitle: formatMedicationProposalSubtitle(med),
      timestamp: findMedicationTimestamp(med, segments),
      medication: med,
    });
  });

  splitSoapLines(aiNotes.plan).forEach((line, index) => {
    if (LAB_LINE_PATTERN.test(line)) {
      proposals.push({
        id: `lab-${index}`,
        kind: "lab",
        title: line.match(/^order/i) ? line : `Order ${line}`,
        subtitle: "Suggested investigation from the consultation plan.",
        timestamp: undefined,
      });
      return;
    }

    if (FOLLOWUP_LINE_PATTERN.test(line)) {
      proposals.push({
        id: `followup-${index}`,
        kind: "followup",
        title: line.match(/^review/i) ? line : `Review — ${line}`,
        subtitle: "Follow-up timing from the consultation.",
      });
    }
  });

  const billingCodes = extractIcdCodes(
    [aiNotes.assessment, aiNotes.plan].filter(Boolean).join(" "),
  );
  if (billingCodes.length > 0) {
    proposals.push({
      id: "billing-codes",
      kind: "billing",
      title: `Code as ${billingCodes.join(" + ")}`,
      subtitle: "Sent to billing when you sign.",
    });
  }

  return proposals;
};

export const buildFormularyProposals = (
  medicines: MedicineSearchResult[],
  existingProposals: DraftProposal[],
): DraftProposal[] => {
  const existingKeys = new Set(
    existingProposals
      .map((proposal) =>
        proposal.medication?.medicine?.trim().toLowerCase() ||
        proposal.formularyMedicine?.name.trim().toLowerCase(),
      )
      .filter(Boolean),
  );

  return medicines
    .sort((a, b) => b.matchScore - a.matchScore)
    .filter((medicine) => !existingKeys.has(medicine.name.trim().toLowerCase()))
    .slice(0, 6)
    .map((medicine) => {
      const condition =
        medicine.matchedConditions.slice(0, 2).join(", ") || "patient condition";
      return {
        id: `formulary-${medicine.id}`,
        kind: "formulary" as const,
        title: medicine.strength
          ? `${medicine.name} ${medicine.strength}`
          : medicine.name,
        subtitle: `Suggested for ${condition}${medicine.brandName ? ` · ${medicine.brandName}` : ""}`,
        formularyMedicine: medicine,
      };
    });
};

const defaultScheduleForMedicine = (name: string) => {
  const lower = name.toLowerCase();
  if (/paracetamol|pcm|dolo|ibuprofen|combiflam|acetaminophen/.test(lower)) {
    return {
      morning: "1",
      afternoon: "0",
      night: "1",
      instructions: "After food",
      days: "3",
    };
  }
  if (/statin|atorva|rosuva|simva/.test(lower)) {
    return {
      morning: "0",
      afternoon: "0",
      night: "1",
      instructions: "At night",
      days: "Ongoing",
    };
  }
  if (/telmi|amlodipine|losartan|metformin/.test(lower)) {
    return {
      morning: "1",
      afternoon: "0",
      night: "0",
      instructions: "Before food",
      days: "Ongoing",
    };
  }
  return {
    morning: "1",
    afternoon: "0",
    night: "0",
    instructions: "After food",
    days: "5",
  };
};

export const medicationFromFormulary = (
  medicine: MedicineSearchResult,
): AiNotesMedication => {
  const defaults = defaultScheduleForMedicine(medicine.name);
  return {
    medicine: medicine.strength
      ? `${medicine.name} ${medicine.strength}`.trim()
      : medicine.name,
    medicineId: medicine.id,
    medicineNameSnapshot: medicine.name,
    strengthSnapshot: medicine.strength || "",
    brandNameSnapshot: medicine.brandName || "",
    formSnapshot: medicine.form || "Tablet",
    catalogCostPreview: medicine.cost,
    morning: defaults.morning,
    afternoon: defaults.afternoon,
    night: defaults.night,
    days: defaults.days,
    instructions: defaults.instructions,
  };
};

export const getMedicationScheduleLabel = (med: AiNotesMedication) => {
  const morning = med.morning || "0";
  const afternoon = med.afternoon || "0";
  const night = med.night || "0";

  if (morning === "1" && afternoon === "0" && night === "0") return "Once daily";
  if (morning === "0" && afternoon === "0" && night === "1") return "At night";
  if (morning === "1" && afternoon === "0" && night === "1") return "Twice daily";
  if (morning === "1" && afternoon === "1" && night === "1") return "Three times daily";

  return `${morning}-${afternoon}-${night}`;
};

export const getDiagnosisQueryForSession = (aiNotes?: AiNotes) => {
  const queries = extractConditionQueries(aiNotes);
  return queries[0] || extractDiagnosisQuery(aiNotes?.assessment, aiNotes?.plan);
};
