/** Matches API local-day check for appointment check-in. */
export const isAppointmentScheduledForLocalDay = (
  scheduledStart: Date | string,
  reference = new Date(),
): boolean => {
  const start = new Date(scheduledStart);
  const ref = new Date(reference);
  const dayStart = new Date(ref);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const time = start.getTime();
  return time >= dayStart.getTime() && time < dayEnd.getTime();
};

export const isCheckInNotTodayMessage = (message: string) =>
  /not scheduled for today/i.test(message);