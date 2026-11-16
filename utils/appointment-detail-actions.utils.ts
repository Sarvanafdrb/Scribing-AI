const TERMINAL_ACTION_STATUSES = new Set([
  "cancelled",
  "completed",
  "rescheduled",
  "in_progress",
  "no_show",
]);

export function canShowAppointmentReschedule(
  status: string,
  options: {
    canCreate: boolean;
    auditPending: boolean;
    atRescheduleLimit: boolean;
  },
): boolean {
  if (!options.canCreate || options.auditPending || options.atRescheduleLimit) {
    return false;
  }
  return (
    (status === "scheduled" || status === "confirmed") &&
    !TERMINAL_ACTION_STATUSES.has(status)
  );
}

export function canShowAppointmentCancel(
  status: string,
  canEdit: boolean,
): boolean {
  if (!canEdit) return false;
  return status === "scheduled" || status === "confirmed";
}

export function canShowCreateNewAfterNoShow(
  status: string,
  canCreate: boolean,
): boolean {
  return canCreate && status === "no_show";
}

export function buildCreateAppointmentHref(options: {
  organizationId: string;
  patientId: string;
  doctorId?: string;
}): string {
  const params = new URLSearchParams({
    organizationId: options.organizationId,
    patientId: options.patientId,
  });
  if (options.doctorId) {
    params.set("doctorId", options.doctorId);
  }
  return `/appointments/create?${params.toString()}`;
}