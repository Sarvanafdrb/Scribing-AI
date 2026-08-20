const RECENTLY_VIEWED_KEY = "doctor-recently-viewed-patients";

function readRecentlyViewed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((id) => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

export function recordDoctorRecentlyViewedPatient(patientId: string) {
  if (typeof window === "undefined" || !patientId) return;
  const existing = readRecentlyViewed();
  const next = [patientId, ...existing.filter((id) => id !== patientId)].slice(
    0,
    20,
  );
  localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(next));
}

export function readDoctorRecentlyViewedPatientIds(): string[] {
  return readRecentlyViewed();
}

export { RECENTLY_VIEWED_KEY };
