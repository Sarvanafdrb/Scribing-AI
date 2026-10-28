/** Must match API `APPOINTMENT_FREE_RESCHEDULE_LIMIT`. */
export const APPOINTMENT_FREE_RESCHEDULE_LIMIT = 2;

export const isAtRescheduleLimit = (chainDepth: number | undefined) =>
  (chainDepth ?? 0) >= APPOINTMENT_FREE_RESCHEDULE_LIMIT;
