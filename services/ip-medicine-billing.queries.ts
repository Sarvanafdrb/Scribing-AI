import type { QueryClient } from "@tanstack/react-query";
import {
  ipAdmissionBillingKeys,
  invalidateIpAdmissionBillingEncounter,
} from "@/services/ip-admission-billing.queries";
import { ipMedicineBillingService } from "@/services/ip-medicine-billing.service";
import { isValidEncounterIdParam } from "@/utils/ip-medicine-billing.utils";
import { pickPharmacyEncounterHeader } from "@/utils/ip-pharmacy-desk.utils";

export const ipMedicineBillingKeys = {
  all: ["ip-medicine-billing"] as const,
  search: (search: string, page: number) =>
    [...ipMedicineBillingKeys.all, "search", search, page] as const,
  encounter: (encounterId: string) =>
    [...ipMedicineBillingKeys.all, encounterId] as const,
  orders: (encounterId: string) =>
    [...ipMedicineBillingKeys.encounter(encounterId), "orders"] as const,
  dispenses: (encounterId: string) =>
    [...ipMedicineBillingKeys.encounter(encounterId), "dispenses"] as const,
  charges: (encounterId: string) =>
    [...ipMedicineBillingKeys.encounter(encounterId), "charges"] as const,
  balance: (encounterId: string) =>
    [...ipMedicineBillingKeys.encounter(encounterId), "balance"] as const,
  payments: (encounterId: string) =>
    [...ipMedicineBillingKeys.encounter(encounterId), "payments"] as const,
  audit: (encounterId: string) =>
    [...ipMedicineBillingKeys.encounter(encounterId), "audit"] as const,
  encounterHeader: (encounterId: string) =>
    [...ipMedicineBillingKeys.encounter(encounterId), "header"] as const,
};

export const invalidateIpMedicineBillingEncounter = (encounterId: string) =>
  ipMedicineBillingKeys.encounter(encounterId);

export const ipMedicineBillingQueryEnabled = (
  encounterId: string | undefined,
): boolean => isValidEncounterIdParam(encounterId);

export const ipMedicineBillingOrdersQuery = (encounterId: string) => ({
  queryKey: ipMedicineBillingKeys.orders(encounterId),
  queryFn: () => ipMedicineBillingService.listOrders(encounterId),
  enabled: ipMedicineBillingQueryEnabled(encounterId),
});

export const ipMedicineBillingDispensesQuery = (encounterId: string) => ({
  queryKey: ipMedicineBillingKeys.dispenses(encounterId),
  queryFn: () => ipMedicineBillingService.listDispenses(encounterId),
  enabled: ipMedicineBillingQueryEnabled(encounterId),
});

export const ipMedicineBillingChargesQuery = (encounterId: string) => ({
  queryKey: ipMedicineBillingKeys.charges(encounterId),
  queryFn: () => ipMedicineBillingService.listCharges(encounterId),
  enabled: ipMedicineBillingQueryEnabled(encounterId),
});

export const ipMedicineBillingBalanceQuery = (encounterId: string) => ({
  queryKey: ipMedicineBillingKeys.balance(encounterId),
  queryFn: () => ipMedicineBillingService.getBalance(encounterId),
  enabled: ipMedicineBillingQueryEnabled(encounterId),
});

export const ipMedicineBillingPaymentsQuery = (encounterId: string) => ({
  queryKey: ipMedicineBillingKeys.payments(encounterId),
  queryFn: () => ipMedicineBillingService.listPayments(encounterId),
  enabled: ipMedicineBillingQueryEnabled(encounterId),
});

export const ipMedicineBillingAuditQuery = (encounterId: string) => ({
  queryKey: ipMedicineBillingKeys.audit(encounterId),
  queryFn: () => ipMedicineBillingService.getAuditTrail(encounterId),
  enabled: ipMedicineBillingQueryEnabled(encounterId),
});

export const ipPharmacyEncounterSearchQuery = (
  search: string,
  page: number,
  enabled: boolean,
) => ({
  queryKey: ipMedicineBillingKeys.search(search, page),
  queryFn: () =>
    ipMedicineBillingService.searchEncounters({
      search: search || undefined,
      page,
      limit: 20,
    }),
  enabled,
});

export const ipPharmacyEncounterHeaderQuery = (
  encounterId: string,
  enabled: boolean,
) => ({
  queryKey: ipMedicineBillingKeys.encounterHeader(encounterId),
  queryFn: async () => {
    const result = await ipMedicineBillingService.searchEncounters({
      search: encounterId,
      page: 1,
      limit: 20,
    });
    return pickPharmacyEncounterHeader(result.items, encounterId);
  },
  enabled: enabled && ipMedicineBillingQueryEnabled(encounterId),
});

export const refreshIpPharmacyDeskQueries = async (
  queryClient: QueryClient,
  encounterId: string,
) => {
  await queryClient.invalidateQueries({
    queryKey: invalidateIpMedicineBillingEncounter(encounterId),
  });
};

/**
 * After dispense, payment, return, or refund — refresh medicine ledger reads and
 * admission consolidated invoice / unified payments (medicine rolls into both).
 */
export const invalidateAfterIpMedicineFinancialMutation = async (
  queryClient: QueryClient,
  encounterId: string,
): Promise<void> => {
  await queryClient.invalidateQueries({
    queryKey: invalidateIpMedicineBillingEncounter(encounterId),
  });
  await queryClient.invalidateQueries({
    queryKey: ipAdmissionBillingKeys.invoice(encounterId),
  });
  await queryClient.invalidateQueries({
    queryKey: ipAdmissionBillingKeys.payments(encounterId),
  });
  await queryClient.invalidateQueries({
    queryKey: ipAdmissionBillingKeys.discharge(encounterId),
  });
};

/** Broader invalidation including all admission desk slices for the same encounter. */
export const invalidateIpMedicineAndAdmissionEncounter = async (
  queryClient: QueryClient,
  encounterId: string,
): Promise<void> => {
  await invalidateAfterIpMedicineFinancialMutation(queryClient, encounterId);
  await queryClient.invalidateQueries({
    queryKey: invalidateIpAdmissionBillingEncounter(encounterId),
  });
};

/** After successful dispense — refresh pharmacy ledger queries for the encounter. */
export const invalidateAfterIpMedicineDispense = async (
  queryClient: QueryClient,
  encounterId: string,
) => invalidateAfterIpMedicineFinancialMutation(queryClient, encounterId);

/** After successful medicine payment. */
export const invalidateAfterIpMedicinePayment = invalidateAfterIpMedicineDispense;

/** After successful medicine return. */
export const invalidateAfterIpMedicineReturn = invalidateAfterIpMedicineFinancialMutation;

/** After successful medicine refund. */
export const invalidateAfterIpMedicineRefund = invalidateAfterIpMedicineFinancialMutation;
