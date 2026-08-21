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

/** Devanagari, Tamil, Kannada, Malayalam, Telugu, Bengali, Gurmukhi, Gujarati, Oriya */
export const INDIC_SCRIPT_REGEX =
  /[\u0900-\u097F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F]/;

const PATIENT_CUE_PATTERNS: RegExp[] = [
  /good\s*morning\s*doctor/i,
  /good\s*afternoon\s*doctor/i,
  /good\s*evening\s*doctor/i,
  /thank\s*you\s*doctor/i,
  /thanks\s*doctor/i,
  /yes\s*doctor|no\s*doctor|ok(?:ay)?\s*doctor/i,
  /\bdoctor\b\s*[.!?]?$/i,
  /டாக்டர்\s*[.!?]?$/,
  /டாக்டர்\s*(ரெண்டு|ரெண்ட்|மூணு|நாலு|நாளா)/i,
  /எனக்கு|எங்களுக்கு|என்\s*(காலு|தலைய|வயித்து)/,
  /இருக்குது|இருக்கு|இருந்தது|வலிக்குது/,
  /காய்ச்சல்|ஃபீவர்|fever|pain|headache|cough|vomiting/i,
  /கொண்டு\s*வந்திருக்கேன்|வந்திருக்கேன்|வந்தேன்/,
  /ரிப்போர்ட்.*கொடுத்தேன்|பிளட்\s*டெஸ்ட்\s*கொடுத்தேன்/,
  /இல்ல\s*டாக்டர்|சரி\s*டாக்டர்|ஓகே\s*டாக்டர்/,
  /\bi\s+(have|had|am|feel|felt|took|didn't|cannot|can't)\b/i,
  /\bmy\s+(fever|pain|head|stomach|chest|leg|hand|report|test)\b/i,
  /मुझे|मेरे\s*को|दर्द|बुखार|डॉक्टर/i,
  /ನನಗೆ|ನೋವು|ಡಾಕ್ಟರ/i,
  /എനിക്ക്|വേദന|ഡോക്ട(?:ർ|ര)/i,
  /నాకు|నొప్పి|డాక్టర/i,
];

const DOCTOR_CUE_PATTERNS: RegExp[] = [
  /உட்காருங்க|படுங்க|வாயில|நாக்கு\s*காட்டு/,
  /அட்மிட்|admit|admission/i,
  /வார்டு|ward|ரூம்|room|bed\s*no/i,
  /observation|அப்சர்வேஷன்|follow[\s-]?up/i,
  /டெங்கு|dengue|diagnosis|diagnosed/i,
  /பிளட்\s*கவுண்ட்|blood\s*count|platelet|cbc|wbc/i,
  /ரிப்போர்ட்ல\s*வந்து|ரிப்போர்ட்\s*பார்த்த/,
  /நீங்க\s*(போய்|என்ன\s*பண்ணுங்க|அட்மிட்)/,
  /மெடிசின்\s*(போடு|எடு|உடு)|tablet|capsule|syrup/i,
  /நான்\s*வந்து\s*கொடுக்கிறேன்/,
  /குடுங்க|போய்\s*பிளட்\s*குடுங்க/,
  /confirm|கன்ஃபார்ம்|prescribe|prescription/i,
  /\b(let\s+me|i\s+will|i'll|we\s+(will|need\s+to)|please\s+sit|lie\s+down)\b/i,
  /\b(what\s+(is|are)\s+your|how\s+long|since\s+when|any\s+(allergy|history))\b/i,
  /\b(take\s+this|i\s+am\s+prescribing|come\s+back\s+after)\b/i,
  /आपको|दवाई|भर्ती|जांच/i,
  /ನಿಮಗೆ|ಔಷಧ|ಚಿಕಿತ್ಸೆ/i,
  /നിങ്ങൾ|മരുന്ന്|ചികിത്സ/i,
  /మీరు|మందు|చికిత్స/i,
  /^scribe[,\s]/i,
];

const cueScore = (text: string, patterns: RegExp[]) =>
  patterns.reduce((score, pattern) => (pattern.test(text) ? score + 1 : score), 0);

export const inferLiveSpeaker = (
  text: string,
  previousSpeaker: TranscriptSpeaker | null,
  segmentIndex: number,
): TranscriptSpeaker => {
  const trimmed = text.trim();
  if (!trimmed) {
    return previousSpeaker === "doctor" ? "patient" : "doctor";
  }

  const doctorScore = cueScore(trimmed, DOCTOR_CUE_PATTERNS);
  const patientScore = cueScore(trimmed, PATIENT_CUE_PATTERNS);

  if (doctorScore >= patientScore + 1) return "doctor";
  if (patientScore >= doctorScore + 1) return "patient";

  if (previousSpeaker === "doctor" || previousSpeaker === "patient") {
    return previousSpeaker === "doctor" ? "patient" : "doctor";
  }

  // Consultations usually open with the patient.
  return segmentIndex === 0 ? "patient" : "doctor";
};

export const splitLiveTranscriptText = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) {
    return { primary: "", translation: undefined as string | undefined };
  }

  const hasIndic = INDIC_SCRIPT_REGEX.test(trimmed);
  const latinParts =
    trimmed.match(/[a-zA-Z][a-zA-Z0-9\s'.,!?-]*/g)?.join(" ").trim() || "";

  if (hasIndic && latinParts.length > 2) {
    return {
      primary: trimmed,
      translation: latinParts,
    };
  }

  if (hasIndic) {
    return { primary: trimmed, translation: undefined };
  }

  return { primary: trimmed, translation: undefined };
};

export const flipLiveSpeaker = (
  speaker: TranscriptSpeaker,
): TranscriptSpeaker => {
  if (speaker === "doctor") return "patient";
  if (speaker === "patient") return "doctor";
  return speaker;
};
