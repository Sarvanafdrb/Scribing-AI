export const ipAdmissionBillingKeys = {
  all: ["ip-admission-billing"] as const,
  search: (search: string, page: number) =>
    [...ipAdmissionBillingKeys.all, "search", search, page] as const,
  encounter: (encounterId: string) =>
    [...ipAdmissionBillingKeys.all, encounterId] as const,
  invoice: (encounterId: string) =>
    [...ipAdmissionBillingKeys.encounter(encounterId), "invoice"] as const,
  roomRent: (encounterId: string) =>
    [...ipAdmissionBillingKeys.encounter(encounterId), "room-rent"] as const,
  corrections: (encounterId: string) =>
    [...ipAdmissionBillingKeys.encounter(encounterId), "corrections"] as const,
  otherCharges: (encounterId: string) =>
    [...ipAdmissionBillingKeys.encounter(encounterId), "other-charges"] as const,
  payments: (encounterId: string) =>
    [...ipAdmissionBillingKeys.encounter(encounterId), "payments"] as const,
  allocations: (encounterId: string) =>
    [...ipAdmissionBillingKeys.encounter(encounterId), "allocations"] as const,
  discharge: (encounterId: string) =>
    [...ipAdmissionBillingKeys.encounter(encounterId), "discharge"] as const,
  revisions: (encounterId: string) =>
    [...ipAdmissionBillingKeys.encounter(encounterId), "revisions"] as const,
};

export const invalidateIpAdmissionBillingEncounter = (
  encounterId: string,
) => ipAdmissionBillingKeys.encounter(encounterId);
