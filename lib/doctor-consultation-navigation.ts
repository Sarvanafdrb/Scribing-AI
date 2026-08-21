export function getConsultationPreVisitHref(sessionId: string) {
  return `/doctor/consultations/${sessionId}`;
}

export function getConsultationPreVisitPatientHref(
  patientId: string,
  options?: { appointmentId?: string; reason?: string },
) {
  const params = new URLSearchParams();
  if (options?.appointmentId) {
    params.set("appointmentId", options.appointmentId);
  }
  if (options?.reason) {
    params.set("reason", options.reason);
  }
  const query = params.toString();
  return query
    ? `/doctor/consultations/patient/${patientId}?${query}`
    : `/doctor/consultations/patient/${patientId}`;
}

/** Navigate to the doctor consultation workspace for a session. */
export function getDoctorWorkspaceHref(sessionId: string) {
  return `/doctor/workspace/${sessionId}`;
}
