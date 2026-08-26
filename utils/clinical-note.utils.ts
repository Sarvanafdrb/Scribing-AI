import type { TranscriptSegment } from "@/types/transcript.types";

export type ClinicalNoteLineKind = "spoken" | "inferred" | "lab" | "code";

export interface ClinicalNoteLine {
  id: string;
  text: string;
  kind: ClinicalNoteLineKind;
  timestamp?: string;
  icdCode?: string;
}

const INFERRED_PATTERN =
  /\b(inferred|adherence|adhere|forget|template|usual plan|counsell|counsel|likely|suggest)\b/i;
const LAB_PATTERN =
  /\b(hb?a1c|glucose|creatinine|hemoglobin|platelet|wbc|lab|mg\/dl|mmol|mmhg|bp\s*\d)/i;
const ICD_PATTERN = /\b([A-Z]\d{2}(?:\.\d+)?)\b/g;

const formatTimestamp = (seconds?: number) => {
  if (seconds === undefined || Number.isNaN(seconds)) return undefined;
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const secs = (total % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const scoreSegmentMatch = (line: string, segment: TranscriptSegment) => {
  const lineWords = new Set(normalizeText(line).split(" ").filter(Boolean));
  const segmentWords = normalizeText(segment.text).split(" ").filter(Boolean);
  if (lineWords.size === 0 || segmentWords.length === 0) return 0;

  let overlap = 0;
  for (const word of segmentWords) {
    if (lineWords.has(word)) overlap += 1;
  }
  return overlap / Math.max(lineWords.size, segmentWords.length);
};

const findBestTimestamp = (
  line: string,
  segments: TranscriptSegment[],
): string | undefined => {
  let bestScore = 0;
  let bestStart: number | undefined;

  for (const segment of segments) {
    const score = scoreSegmentMatch(line, segment);
    if (score > bestScore) {
      bestScore = score;
      bestStart = segment.start;
    }
  }

  if (bestScore < 0.25) return undefined;
  return formatTimestamp(bestStart);
};

const classifyLine = (line: string): ClinicalNoteLineKind => {
  if (INFERRED_PATTERN.test(line)) return "inferred";
  if (LAB_PATTERN.test(line)) return "lab";
  return "spoken";
};

export const splitSoapLines = (content?: string) =>
  (content || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-•*]+\s*/, ""));

export const buildClinicalNoteLines = (
  content: string | undefined,
  sectionKey: string,
  segments: TranscriptSegment[] = [],
): ClinicalNoteLine[] =>
  splitSoapLines(content).map((line, index) => {
    const icdMatch = line.match(ICD_PATTERN);
    const icdCode = icdMatch?.[0];
    const kind = classifyLine(line);
    const timestamp =
      kind === "inferred"
        ? undefined
        : kind === "lab"
          ? "lab"
          : findBestTimestamp(line, segments);

    return {
      id: `${sectionKey}-${index}`,
      text: line.replace(ICD_PATTERN, "").replace(/\(\s*\)/g, "").trim(),
      kind,
      timestamp: timestamp === "lab" ? undefined : timestamp,
      icdCode,
    };
  });

export const extractIcdCodes = (text: string) => {
  const matches = text.match(/\b[A-Z]\d{2}(?:\.\d+)?\b/g) ?? [];
  return [...new Set(matches)];
};

/** Primary diagnosis phrase for medicine formulary search. */
export const extractDiagnosisQuery = (assessment?: string, plan?: string) => {
  const source = (assessment || plan || "").trim();
  if (!source) return "";

  const firstLine =
    splitSoapLines(source)[0] ||
    source.split(/[.;]/)[0]?.trim() ||
    source;

  return firstLine
    .replace(/\b[A-Z]\d{2}(?:\.\d+)?\b/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

export const getInferredLines = (lines: ClinicalNoteLine[]) =>
  lines.filter((line) => line.kind === "inferred");
