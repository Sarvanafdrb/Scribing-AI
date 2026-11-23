import type { WeeklyDaySchedule, WorkingSession } from "@/types/availability.types";

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export const defaultWeeklySchedule = (): WeeklyDaySchedule[] =>
  Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    isWorking: dayOfWeek >= 1 && dayOfWeek <= 5,
    workingSessions: [{ startTime: "09:00", endTime: "17:00" }],
    breaks: [],
  }));

export const normalizeWeeklyFromApi = (
  weekly?: WeeklyDaySchedule[] | null,
): WeeklyDaySchedule[] => {
  if (!weekly?.length) return defaultWeeklySchedule();
  const byDay = new Map(weekly.map((d) => [d.dayOfWeek, d]));
  return Array.from({ length: 7 }, (_, dayOfWeek) => {
    const day = byDay.get(dayOfWeek);
    if (!day) {
      return { dayOfWeek, isWorking: false, workingSessions: [], breaks: [] };
    }
    const sessions: WorkingSession[] =
      day.workingSessions?.length
        ? day.workingSessions
        : day.startTime && day.endTime
          ? [{ startTime: day.startTime, endTime: day.endTime }]
          : [];
    return {
      dayOfWeek,
      isWorking: Boolean(day.isWorking && sessions.length),
      workingSessions: sessions,
      breaks: day.breaks || [],
      startTime: day.startTime,
      endTime: day.endTime,
    };
  });
};

export const syncLegacyBounds = (day: WeeklyDaySchedule): WeeklyDaySchedule => {
  const sessions = (day.workingSessions || []).filter(
    (s) => s.startTime && s.endTime,
  );
  if (!sessions.length) {
    return { ...day, workingSessions: [], startTime: undefined, endTime: undefined };
  }
  return {
    ...day,
    workingSessions: sessions,
    startTime: sessions[0].startTime,
    endTime: sessions[sessions.length - 1].endTime,
  };
};

export const prepareWeeklyForSave = (
  weekly: WeeklyDaySchedule[],
): WeeklyDaySchedule[] =>
  weekly.map((day) => {
    if (!day.isWorking) {
      return {
        dayOfWeek: day.dayOfWeek,
        isWorking: false,
        workingSessions: [],
        breaks: [],
      };
    }
    return syncLegacyBounds({
      ...day,
      workingSessions: day.workingSessions?.length
        ? day.workingSessions
        : [{ startTime: "09:00", endTime: "17:00" }],
    });
  });