import type {
  IpMedicineAuditTrail,
  IpMedicineBalance,
  IpMedicineCharge,
  IpMedicineDispense,
  IpMedicineOrder,
  IpMedicinePayment,
  IpMedicineRefund,
  IpPharmacyEncounterSearchItem,
} from "@/types/ip-medicine-billing.types";
import { IP_MEDICINE_VIEW, hasPermissionCode } from "@/constants/permissions";

export const IP_PHARMACY_DESK_MUTATION_ACTIONS = [
  "dispense",
  "record-payment",
  "record-return",
  "record-refund",
  "cancel",
  "edit",
] as const;

/** Read-only phase: no mutation actions are exposed in the desk UI. */
export const ipPharmacyDeskExposesMutationActions = (): boolean => false;

export const canAccessIpPharmacyDesk = (
  permissions: string[],
  isSuperAdmin = false,
): boolean => {
  if (isSuperAdmin) return true;
  return hasPermissionCode(permissions, IP_MEDICINE_VIEW);
};

export const pickPharmacyEncounterHeader = (
  items: IpPharmacyEncounterSearchItem[],
  encounterId: string,
): IpPharmacyEncounterSearchItem | null => {
  const normalized = encounterId.trim().toLowerCase();
  return (
    items.find((row) => row.encounterId.toLowerCase() === normalized) ?? null
  );
};

export const isPharmacyAdmissionDischarged = (status: string | undefined): boolean =>
  status === "discharged";

export const pharmacyAdmissionStatusLabel = (status: string | undefined): string => {
  if (!status) return "Unknown";
  if (status === "discharged") return "Discharged";
  if (status === "admitted") return "Admitted";
  return status;
};

export type IpPharmacyBalanceDisplayRow = {
  label: string;
  paise: number;
  rupees: number;
};

/** Display rows sourced only from GET /balance — no frontend recomputation of totals. */
export const buildIpPharmacyBalanceDisplayRows = (
  balance: IpMedicineBalance | null | undefined,
): IpPharmacyBalanceDisplayRow[] => {
  if (!balance) return [];
  return [
    {
      label: "Total medicine charges (net)",
      paise: balance.totalChargePaise,
      rupees: balance.totalChargeRupees,
    },
    {
      label: "Total allocated payments",
      paise: balance.totalPaidPaise,
      rupees: balance.totalPaidRupees,
    },
    {
      label: "Net paid (after refunds)",
      paise: balance.netPaidPaise,
      rupees: balance.netPaidRupees,
    },
    {
      label: "Total refunded",
      paise: balance.totalRefundedPaise,
      rupees: balance.totalRefundedRupees,
    },
    {
      label: "Outstanding",
      paise: balance.outstandingPaise,
      rupees: balance.outstandingRupees,
    },
    {
      label: "Credit balance",
      paise: balance.creditPaise,
      rupees: balance.creditRupees,
    },
  ];
};

export type IpPharmacyAuditTimelineEvent = {
  id: string;
  kind:
    | "order"
    | "dispense"
    | "charge"
    | "payment"
    | "refund";
  at: string;
  title: string;
  detail: string;
  amountPaise?: number;
};

export const chargeTypeLabel = (chargeType: string): string => {
  switch (chargeType) {
    case "dispense":
      return "Dispense charge";
    case "return":
      return "Return adjustment";
    case "adjustment":
      return "Adjustment";
    case "reversal":
      return "Reversal";
    default:
      return chargeType;
  }
};

export const buildIpPharmacyAuditTimeline = (
  audit: IpMedicineAuditTrail | null | undefined,
): IpPharmacyAuditTimelineEvent[] => {
  if (!audit) return [];

  const events: IpPharmacyAuditTimelineEvent[] = [];

  for (const order of audit.orders ?? []) {
    events.push({
      id: `order-${order.id}`,
      kind: "order",
      at: order.createdAt,
      title: `Medicine order (${order.status})`,
      detail: `${order.lines?.length ?? 0} line(s) · prescription ${order.prescriptionId}`,
    });
  }

  for (const dispense of audit.dispenses ?? []) {
    events.push({
      id: `dispense-${dispense.id}`,
      kind: "dispense",
      at: dispense.dispensedAt,
      title: "Dispense confirmed",
      detail: `Qty ${dispense.quantity} · ref ${dispense.clientReferenceId}`,
      amountPaise: dispense.chargeAmountPaise,
    });
  }

  for (const charge of audit.charges ?? []) {
    events.push({
      id: `charge-${charge.id}`,
      kind: "charge",
      at: charge.createdAt,
      title: chargeTypeLabel(charge.chargeType),
      detail: `Qty ${charge.quantity} · ${charge.paymentStatus}`,
      amountPaise: charge.amountPaise,
    });
  }

  for (const payment of audit.payments ?? []) {
    events.push({
      id: `payment-${payment.id}`,
      kind: "payment",
      at: payment.recordedAt,
      title: `Payment (${payment.status})`,
      detail: `${payment.method.toUpperCase()} · ref ${payment.clientReferenceId} · ${payment.allocations?.length ?? 0} allocation(s)`,
      amountPaise: payment.amountPaise,
    });
  }

  for (const refund of audit.refunds ?? []) {
    events.push({
      id: `refund-${refund.id}`,
      kind: "refund",
      at: refund.recordedAt,
      title: "Refund",
      detail: `${refund.method.toUpperCase()} · ref ${refund.clientReferenceId}`,
      amountPaise: refund.amountPaise,
    });
  }

  return events.sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );
};

export type IpPharmacyOrderLineRow = {
  orderId: string;
  orderStatus: IpMedicineOrder["status"];
  lineId: string;
  prescriptionLineId: string;
  medicineLabel: string;
  instructions?: string;
  authorizedQuantity: number;
  dispensedQuantity: number;
  remainingQuantity: number;
  unitOfMeasure: string;
  unitPricePaise: number;
  unitPriceRupees: number;
};

export const flattenIpPharmacyOrderLines = (
  orders: IpMedicineOrder[] | null | undefined,
): IpPharmacyOrderLineRow[] => {
  if (!orders?.length) return [];
  const rows: IpPharmacyOrderLineRow[] = [];
  for (const order of orders) {
    for (const line of order.lines ?? []) {
      const strength = line.strengthSnapshot?.trim();
      const medicineLabel = strength
        ? `${line.medicineNameSnapshot} (${strength})`
        : line.medicineNameSnapshot;
      rows.push({
        orderId: order.id,
        orderStatus: order.status,
        lineId: line.id,
        prescriptionLineId: line.prescriptionLineId,
        medicineLabel,
        instructions: line.instructions,
        authorizedQuantity: line.authorizedQuantity,
        dispensedQuantity: line.dispensedQuantity,
        remainingQuantity: line.remainingQuantity,
        unitOfMeasure: line.unitOfMeasure,
        unitPricePaise: line.unitPricePaise,
        unitPriceRupees: line.unitPriceRupees,
      });
    }
  }
  return rows;
};

export const safeOptionalText = (value: string | null | undefined): string =>
  value?.trim() ? value.trim() : "—";

export const formatPaymentAllocationsSummary = (
  payment: IpMedicinePayment,
): string => {
  const rows = payment.allocations ?? [];
  if (!rows.length) return "No allocations";
  return rows
    .map((a) => `${a.chargeId.slice(-6)}: ${a.amountPaise} paise`)
    .join("; ");
};

export type IpPharmacyDeskSectionId =
  | "admission"
  | "orders"
  | "dispenses"
  | "charges"
  | "payments"
  | "balance"
  | "audit";

export const IP_PHARMACY_DESK_SECTIONS: IpPharmacyDeskSectionId[] = [
  "admission",
  "orders",
  "dispenses",
  "charges",
  "payments",
  "balance",
  "audit",
];
