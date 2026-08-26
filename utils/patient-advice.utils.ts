import type { TranscriptSegment } from "@/types/transcript.types";

const ADVICE_LINE_PATTERN =
  /\b(advice|rest|diet|drink|avoid|take|follow|review|return|come back|குடி|சாப்பிட|ஓய்வ|தவிர|வர|follow up|hydrat|fluid|water|food|sleep|exercise|tablet|medicine|மருந்த|அறிகுறை)\b/i;

const hasTamilScript = (text: string) =>
  /[\u0B80-\u0BFF]/.test(text);

/** Fallback: doctor lines from the recording that look like patient advice. */
export const extractDoctorAdviceFromTranscript = (
  segments: TranscriptSegment[] = [],
): string => {
  const doctorLines = segments
    .filter((segment) => segment.speaker === "doctor")
    .map((segment) => segment.text.trim())
    .filter(Boolean);

  if (doctorLines.length === 0) return "";

  const adviceLines = doctorLines.filter((line) => ADVICE_LINE_PATTERN.test(line));
  const chosen = adviceLines.length > 0 ? adviceLines : doctorLines.slice(-4);

  return chosen.join("\n");
};

export const preferTamilAdviceText = (text: string) => {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const tamilLines = lines.filter(hasTamilScript);
  if (tamilLines.length > 0) return tamilLines.join("\n");
  return text.trim();
};
