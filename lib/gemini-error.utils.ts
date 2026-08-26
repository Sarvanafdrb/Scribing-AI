import type { AiErrorInfo } from "@/types/transcript.types";

const QUOTA_PATTERNS = [
  /quota exceeded/i,
  /exceeded your current quota/i,
  /rate.limit/i,
  /too many requests/i,
  /resource exhausted/i,
  /429/,
];

export const isAiQuotaExceeded = (aiError?: AiErrorInfo | null): boolean =>
  aiError?.code === "AI_QUOTA_EXCEEDED";

export const isAiErrorRetryable = (aiError?: AiErrorInfo | null): boolean =>
  Boolean(aiError?.retryable);

export const isGeminiQuotaError = (
  message?: string | null,
  aiError?: AiErrorInfo | null,
): boolean => {
  if (isAiQuotaExceeded(aiError)) return true;
  if (aiError?.code === "AI_RATE_LIMIT") return true;
  return Boolean(message && QUOTA_PATTERNS.some((pattern) => pattern.test(message)));
};

export const isNonRetryableAiError = (
  message?: string | null,
  aiError?: AiErrorInfo | null,
): boolean => {
  if (aiError) return !aiError.retryable;
  if (!message) return false;
  if (/free_tier|free tier|limit:\s*20|per day|daily limit/i.test(message)) {
    return true;
  }
  if (/GEMINI_API_KEY is not configured|invalid api key/i.test(message)) {
    return true;
  }
  return isGeminiQuotaError(message) && !/retry in/i.test(message);
};

export const parseGeminiRetrySeconds = (message?: string | null): number | null => {
  if (!message) return null;
  const match = message.match(/retry in ([0-9]+(?:\.[0-9]+)?)\s*s/i);
  if (!match) return null;
  const seconds = Math.ceil(Number(match[1]));
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
};

export const formatGeminiErrorForUser = (
  message?: string | null,
  aiError?: AiErrorInfo | null,
): string => {
  if (aiError?.message) {
    if (aiError.code === "AI_QUOTA_EXCEEDED") {
      return (
        "Gemini AI daily quota is exhausted. You can continue with the live transcript or enter notes manually."
      );
    }
    if (aiError.code === "AI_NOT_CONFIGURED") {
      return "AI transcription is not configured on the server. Continue with manual notes.";
    }
    if (aiError.code === "AI_INVALID_KEY") {
      return "AI provider rejected the API key. Continue with manual notes.";
    }
    if (aiError.code === "AI_RATE_LIMIT") {
      return "Gemini AI rate limit reached. Wait a minute, then retry if needed.";
    }
    return aiError.message;
  }

  const raw = message?.trim();
  if (!raw) {
    return "Transcript or note generation failed. You can continue manually.";
  }

  if (isGeminiQuotaError(raw)) {
    if (/free_tier|free tier|limit:\s*20/i.test(raw)) {
      return (
        "Gemini AI free daily limit reached (about 20 requests/day on the free plan). " +
        "Continue with the live transcript or enter notes manually."
      );
    }

    return "Gemini AI rate limit reached. You can continue manually or retry later.";
  }

  if (raw.includes("GEMINI_API_KEY is not configured")) {
    return "AI transcription is not configured. Continue with manual notes.";
  }

  if (raw.length > 280) {
    return `${raw.slice(0, 280)}…`;
  }

  return raw.replace(/^\[(?:GeminiTranscription|GeminiUpload|Gemini)\]\s*/i, "");
};

export const extractAiErrorFromResponse = (error: unknown): AiErrorInfo | null => {
  const payload = error as {
    response?: { data?: { error?: AiErrorInfo } };
  };
  const aiError = payload?.response?.data?.error;
  if (!aiError?.code) return null;
  return aiError;
};
