export interface DoctorDashboardDateRange {
  start: string;
  end: string;
}

export type DoctorDateRangePreset =
  | "this-week"
  | "last-7-days"
  | "last-30-days"
  | "custom";

export const DOCTOR_DATE_PRESET_LABELS: Record<
  Exclude<DoctorDateRangePreset, "custom">,
  string
> = {
  "this-week": "This week",
  "last-7-days": "Last 7 days",
  "last-30-days": "Last 30 days",
};

function startOfLocalDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfLocalDay(date: Date) {
  const next = startOfLocalDay(date);
  next.setDate(next.getDate() + 1);
  return next;
}

export function toLocalInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseLocalInputDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return startOfLocalDay(new Date(year, month - 1, day));
}

export function toRangeIso(range: DoctorDashboardDateRange) {
  const start = parseLocalInputDate(range.start);
  const end = startOfLocalDay(parseLocalInputDate(range.end));
  end.setHours(23, 59, 59, 999);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export function getDoctorDatePresetRange(
  preset: Exclude<DoctorDateRangePreset, "custom">,
  reference = new Date(),
): DoctorDashboardDateRange {
  const today = startOfLocalDay(reference);

  if (preset === "this-week") {
    const dayOfWeek = today.getDay();
    const mondayOffset = (dayOfWeek + 6) % 7;
    const start = new Date(today);
    start.setDate(start.getDate() - mondayOffset);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return {
      start: toLocalInputDate(start),
      end: toLocalInputDate(end),
    };
  }

  if (preset === "last-7-days") {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return {
      start: toLocalInputDate(start),
      end: toLocalInputDate(today),
    };
  }

  const start = new Date(today);
  start.setDate(start.getDate() - 29);
  return {
    start: toLocalInputDate(start),
    end: toLocalInputDate(today),
  };
}

export function getDefaultDoctorDateRange(reference = new Date()) {
  return getDoctorDatePresetRange("this-week", reference);
}

export function formatDoctorDateRangeLabel(range: DoctorDashboardDateRange) {
  const startDate = parseLocalInputDate(range.start);
  const endDate = parseLocalInputDate(range.end);
  const sameYear = startDate.getFullYear() === endDate.getFullYear();
  const startLabel = startDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  const endLabel = endDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startLabel} – ${endLabel}`;
}

export function getDayBoundsFromInput(value: string) {
  const start = parseLocalInputDate(value);
  return { start, end: endOfLocalDay(start) };
}
