import type { TranscriptSpeaker } from "@/types/transcript.types";

/** Indian languages supported for live browser speech recognition. */
export const LIVE_SPEECH_LANGUAGES = [
  "en-IN",
  "ta-IN",
  "hi-IN",
  "kn-IN",
  "ml-IN",
  "te-IN",
  "mr-IN",
  "bn-IN",
  "gu-IN",
  "pa-IN",
] as const;

export type LiveSpeechLanguage = (typeof LIVE_SPEECH_LANGUAGES)[number];

export const DEFAULT_LIVE_SPEECH_LANGUAGE: LiveSpeechLanguage = "ta-IN";

/** Devanagari, Tamil, Kannada, Malayalam, Telugu, Bengali, Gurmukhi, Gujarati, Oriya */
export const INDIC_SCRIPT_REGEX =
  /[\u0900-\u097F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F]/;

export const detectSpeechLanguageFromText = (
  text: string,
): LiveSpeechLanguage => {
  const trimmed = text.trim();
  if (/[\u0B80-\u0BFF]/.test(trimmed)) return "ta-IN";
  if (/[\u0D00-\u0D7F]/.test(trimmed)) return "ml-IN";
  if (/[\u0C80-\u0CFF]/.test(trimmed)) return "kn-IN";
  if (/[\u0900-\u097F]/.test(trimmed)) return "hi-IN";
  if (/[\u0C00-\u0C7F]/.test(trimmed)) return "te-IN";
  if (/[\u0980-\u09FF]/.test(trimmed)) return "bn-IN";
  if (/[\u0A80-\u0AFF]/.test(trimmed)) return "gu-IN";
  if (/[\u0A00-\u0A7F]/.test(trimmed)) return "pa-IN";
  return "en-IN";
};

export const needsEnglishTranslation = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (INDIC_SCRIPT_REGEX.test(trimmed)) return true;
  return !/^[a-zA-Z0-9\s'.,!?-]+$/.test(trimmed);
};

const PATIENT_CUE_PATTERNS: RegExp[] = [
  /(?:hlo|hello|ஹலோ).*?(?:doctor|டாக்டர்)/i,
  /good\s*morning\s*doctor/i,
  /good\s*afternoon\s*doctor/i,
  /good\s*evening\s*doctor/i,
  /thank\s*you\s*doctor/i,
  /thanks\s*doctor/i,
  /yes\s*doctor|no\s*doctor|ok(?:ay)?\s*doctor/i,
  /\bdoctor\b\s*[.!?]?$/i,
  /டாக்டர்\s*[.!?]?$/,
  /டாக்டர்\s*(?:ரெண்டு|ரெண்ட்|மூணு|நாலு|நாளா)/i,
  /(?:^|\s)(?:எனக்கு|எங்களுக்கு|enakku|enaku)\b/i,
  /(?:^|\s)(?:என்|en|my)\s*(?:காலு|தலை|வயிறு|வயித்து|fever|pain|body)/i,
  /(?:^|\s)(?:எனக்கு|enakku).*(?:இருக்க|irukk|pain|fever|problem)/i,
  /(?:^|\s)(?:ஃபீவர்|fever|காய்ச்சல்|pain|headache|cough|vomiting|tired|டயர்ட்).*(?:இருக்க|irukk|have|had)/i,
  /(?:^|\s)(?:இருந்தது|வலிக்குது|valikuthu)/,
  /(?:கொண்டு\s*வந்த|வந்திருக்கேன்|வந்தேன்)/,
  /(?:ரிப்போர்ட்|report).*(?:கொடுத்த|brought)/i,
  /இல்ல\s*டாக்டர்|சரி\s*டாக்டர்|ஓகே\s*டாக்டர்/i,
  /\bi\s+(?:have|had|am|feel|felt|took|didn't|cannot|can't)\b/i,
  /\bmy\s+(?:fever|pain|head|stomach|chest|leg|hand|report|test|body)\b/i,
  /(?:^|\s)(?:मुझे|मेरे\s*को|दर्द|बुखार)/,
  /(?:^|\s)(?:ನನಗೆ|ನೋವು)/,
  /(?:^|\s)(?:എനിക്ക്|വേദന)/,
  /(?:^|\s)(?:నాకు|నొప్పి)/,
];

const DOCTOR_CUE_PATTERNS: RegExp[] = [
  /(?:^|\s)(?:வாங்க|வாருங்க|உள்ளே\s*வா|vaanga|vanga)/i,
  /(?:^|\s)(?:come\s+in|how\s+(?:are|have)\s+you|how\s+do\s+you\s+feel)/i,
  /(?:^|\s)(?:எப்படி|eppadi)\s*(?:இருக்க|irukk)/i,
  /(?:^|\s)(?:good\s+(?:morning|afternoon|evening))(?!\s*doctor)/i,
  /(?:^|\s)(?:உங்க|உங்கள்|unga|ungal|ungaloda)\b/i,
  /(?:^|\s)(?:உனக்கு|unaku|unakku)\s*(?:என்ன|enna|what)/i,
  /(?:^|\s)(?:என்ன|enna)\s*(?:பண்ண|problem|issue|panr)/i,
  /உட்காருங்க|படுங்க|வாயை\s*திற|நாக்கு\s*காட்ட/i,
  /(?:^|\s)(?:பார்க்க(?:லாம்|ட்டு|போம்|paapom|paapom)|சொல்ல(?:ுங்க|ுங்கள்|unga)|solli?ng|sollunga)/i,
  /(?:^|\s)(?:கேளுங்க|kelunga)/i,
  /அட்மிட்|admit|admission/i,
  /(?:வார்டு|ward|room|bed\s*no)/i,
  /observation|அப்சர்வேஷன்|follow[\s-]?up/i,
  /(?:டெங்கு|dengue|diagnosis|diagnosed)/i,
  /(?:blood\s*count|platelet|cbc|wbc|பிளட்\s*கவுண்ட்)/i,
  /(?:ரிப்போர்ட்|report).*(?:பார்த்த|checked|reviewed)/i,
  /(?:^|\s)(?:நீங்க|நீ|நீங்கள்|neenga|ningal).*(?:போ|செய்|எடு|குடி|வா|panu)/i,
  /(?:^|\s)(?:நான்|naan)\b.*(?:கொடுக்க|kudukk|prescrib|medicine|மெடிச)/i,
  /(?:tablet|capsule|syrup|மெடிசின்|மாத்திரை|மருந்து|\bmedicine\b)/i,
  /(?:prescribe|prescription|confirm|கன்ஃபார்ம்)/i,
  /(?:இன்ஜெக்ஷன்|injection)/i,
  /(?:^|\s)(?:பண்ண(?:ிக்க)?(?:ோ)?ங்க|panunga|check\s*up|செக்)/i,
  /(?:^|\s)(?:திரும்பி\s*வந்த|come\s+back|சாப்பிட)/i,
  /\b(?:let\s+me|i\s+will|i'll|i\s+am\s+giving|we\s+(?:will|need\s+to)|please\s+(?:sit|lie\s+down))\b/i,
  /\b(?:what\s+(?:is|are)\s+your|how\s+long|since\s+when|any\s+(?:allergy|history)|do\s+you\s+have|did\s+you\s+take|your\s+body)\b/i,
  /\b(?:take\s+this|i\s+am\s+prescribing|come\s+back\s+(?:after|for|in))\b/i,
  /(?:^|\s)(?:आप(?:को|का)|दवा|दवाई|जांच)/,
  /(?:^|\s)(?:ನಿಮ(?:ಗ|್ಮ)|ಔಷಧ|ಚಿಕಿತ್ಸೆ)/,
  /(?:^|\s)(?:നിങ്ങ(?:ൾ|ൾക്ക)|മരുന്ന്|ചികിത്സ)/,
  /(?:^|\s)(?:మీ(?:ర|రిక)|మందు|చికిత్స)/,
  /^scribe[,\s]/i,
];

const QUESTION_PATTERNS: RegExp[] = [
  /[?؟]\s*$/,
  /\b(?:what|how|when|where|why|which|any|do\s+you|did\s+you|have\s+you|can\s+you|are\s+you)\b/i,
  /(?:எப்படி|எப்போ|என்ன|ஏன்|எவ்வளவு|உங்கள)/,
  /(?:eppadi|eppo|enna|en|evvalavu|unga)/i,
];

const SHORT_PATIENT_REPLY_PATTERNS: RegExp[] = [
  /^(?:yes|no|ok|okay|haan|illa|amam|sari|ஆமா|ஆம்|இல்ல|இல்லை|சரி)[.!]?$/i,
  /^(?:yes|no)\s*doctor[.!]?$/i,
];

const cueScore = (text: string, patterns: RegExp[]) =>
  patterns.reduce((score, pattern) => (pattern.test(text) ? score + 1 : score), 0);

export const detectSpeakerSeed = (text: string): TranscriptSpeaker | null => {
  const doctorScore = cueScore(text, DOCTOR_CUE_PATTERNS);
  const patientScore = cueScore(text, PATIENT_CUE_PATTERNS);
  if (doctorScore === 0 && patientScore === 0) return null;
  return patientScore > doctorScore ? "patient" : "doctor";
};

export const inferLiveSpeaker = (
  text: string,
  previousSpeaker: TranscriptSpeaker | null,
  segmentIndex: number,
  sessionSeed: TranscriptSpeaker | null = null,
): TranscriptSpeaker => {
  const trimmed = text.trim();
  if (!trimmed) {
    return previousSpeaker ?? sessionSeed ?? "doctor";
  }

  const doctorScore = cueScore(trimmed, DOCTOR_CUE_PATTERNS);
  const patientScore = cueScore(trimmed, PATIENT_CUE_PATTERNS);

  if (doctorScore >= patientScore + 1) return "doctor";
  if (patientScore >= doctorScore + 1) return "patient";

  if (doctorScore > 0 && patientScore > 0) {
    return doctorScore >= patientScore ? "doctor" : "patient";
  }
  if (doctorScore > 0) return "doctor";
  if (patientScore > 0) return "patient";

  if (
    previousSpeaker === "doctor" &&
    SHORT_PATIENT_REPLY_PATTERNS.some((pattern) => pattern.test(trimmed))
  ) {
    return "patient";
  }

  if (QUESTION_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return "doctor";
  }

  if (previousSpeaker) {
    return previousSpeaker === "doctor" ? "patient" : "doctor";
  }

  if (sessionSeed) {
    return sessionSeed;
  }

  // Doctor starts recording and usually opens the consultation.
  return segmentIndex === 0 ? "doctor" : "patient";
};

export const flipLiveSpeaker = (
  speaker: TranscriptSpeaker,
): TranscriptSpeaker => {
  if (speaker === "doctor") return "patient";
  if (speaker === "patient") return "doctor";
  return speaker;
};

type LiveSpeakerSegment = { id: string; text: string; speaker: TranscriptSpeaker };

const scoreLiveSpeakerAlignment = (segments: LiveSpeakerSegment[]) => {
  let doctorAsPatient = 0;
  let doctorAsDoctor = 0;
  let patientAsDoctor = 0;
  let patientAsPatient = 0;

  for (const segment of segments) {
    const text = segment.text || "";
    const d = cueScore(text, DOCTOR_CUE_PATTERNS);
    const p = cueScore(text, PATIENT_CUE_PATTERNS);
    if (segment.speaker === "doctor") {
      doctorAsDoctor += d;
      doctorAsPatient += p;
    } else if (segment.speaker === "patient") {
      patientAsPatient += p;
      patientAsDoctor += d;
    }
  }

  const swapEvidence =
    doctorAsPatient + patientAsDoctor - (doctorAsDoctor + patientAsPatient);
  const keepEvidence =
    doctorAsDoctor + patientAsPatient - (doctorAsPatient + patientAsDoctor);

  return { swapEvidence, keepEvidence };
};

const maybeCorrectLiveSpeakerSwap = <T extends LiveSpeakerSegment>(
  segments: T[],
): T[] => {
  const score = scoreLiveSpeakerAlignment(segments);
  if (score.swapEvidence >= 3 && score.swapEvidence > score.keepEvidence + 1) {
    return segments.map((segment) => ({
      ...segment,
      speaker: flipLiveSpeaker(segment.speaker),
    }));
  }
  return segments;
};

/** Reassign speakers across all live segments using full conversation context. */
export const assignLiveSpeakersHeuristic = <T extends LiveSpeakerSegment>(
  segments: T[],
): T[] => {
  if (segments.length === 0) return segments;

  let seed: TranscriptSpeaker = "doctor";
  for (const segment of segments) {
    const d = cueScore(segment.text || "", DOCTOR_CUE_PATTERNS);
    const p = cueScore(segment.text || "", PATIENT_CUE_PATTERNS);
    if (d >= 1 || p >= 1) {
      seed = p > d ? "patient" : "doctor";
      break;
    }
  }

  let previous: TranscriptSpeaker | null = null;
  const assigned = segments.map((segment, index) => {
    const text = segment.text || "";
    const speaker = inferLiveSpeaker(text, previous, index, seed);
    previous = speaker;
    return { ...segment, speaker };
  });

  return maybeCorrectLiveSpeakerSwap(assigned);
};
