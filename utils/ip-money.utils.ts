/** Format integer paise as INR for display (API money unit is paise). */
export const formatPaiseAsInr = (paise?: number | null): string => {
  if (typeof paise !== "number" || !Number.isFinite(paise)) return "—";
  return `₹${(paise / 100).toFixed(2)}`;
};

export const rupeesInputToPaise = (rupees: string): number | null => {
  const trimmed = rupees.trim();
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
};

export const generateClientReferenceId = (prefix: string): string => {
  const slug = prefix.replace(/[^a-z0-9-]/gi, "").slice(0, 12) || "ip";
  const rand =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 16)
      : `${Date.now()}${Math.random().toString(36).slice(2, 10)}`;
  return `${slug}-${rand}`.slice(0, 128);
};
