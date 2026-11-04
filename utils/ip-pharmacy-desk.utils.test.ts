import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  IP_ADMISSION_VIEW,
  IP_MEDICINE_VIEW,
} from "../constants/permissions";
import { resolveRouteAccess } from "./routePermissions";
import {
  buildIpPharmacyAuditTimeline,
  buildIpPharmacyBalanceDisplayRows,
  canAccessIpPharmacyDesk,
  flattenIpPharmacyOrderLines,
  IP_PHARMACY_DESK_MUTATION_ACTIONS,
  IP_PHARMACY_DESK_SECTIONS,
  ipPharmacyDeskExposesMutationActions,
  isPharmacyAdmissionDischarged,
  pickPharmacyEncounterHeader,
  safeOptionalText,
} from "./ip-pharmacy-desk.utils";
import type {
  IpMedicineBalance,
  IpMedicineOrder,
} from "../types/ip-medicine-billing.types";

describe("ip-pharmacy-desk.utils sections", () => {
  it("defines all read-only desk sections", () => {
    assert.deepEqual(IP_PHARMACY_DESK_SECTIONS, [
      "admission",
      "orders",
      "dispenses",
      "charges",
      "payments",
      "balance",
      "audit",
    ]);
  });

  it("does not expose payment or refund mutation actions in desk utils", () => {
    assert.equal(ipPharmacyDeskExposesMutationActions(), false);
    assert.ok(IP_PHARMACY_DESK_MUTATION_ACTIONS.length > 0);
  });
});

describe("ip-pharmacy-desk admission header", () => {
  it("picks exact encounter from pharmacy search results", () => {
    const id = "507f1f77bcf86cd799439011";
    const picked = pickPharmacyEncounterHeader(
      [
        {
          encounterId: "507f1f77bcf86cd799439099",
          status: "admitted",
          patientId: "1",
          patientCode: "P1",
          patientName: "Other",
          ward: null,
          bed: null,
          admittedAt: null,
          dischargedAt: null,
        },
        {
          encounterId: id,
          encounterCode: "IP-001",
          status: "discharged",
          patientId: "2",
          patientCode: "P2",
          patientName: "Target",
          ward: "W1",
          bed: "B2",
          admittedAt: "2026-01-01T00:00:00.000Z",
          dischargedAt: "2026-01-05T00:00:00.000Z",
        },
      ],
      id,
    );
    assert.equal(picked?.patientName, "Target");
    assert.equal(picked?.status, "discharged");
  });

  it("detects discharged read-only state", () => {
    assert.equal(isPharmacyAdmissionDischarged("discharged"), true);
    assert.equal(isPharmacyAdmissionDischarged("admitted"), false);
  });

  it("handles missing optional text safely", () => {
    assert.equal(safeOptionalText(undefined), "—");
    assert.equal(safeOptionalText("  Rx  "), "Rx");
  });
});

describe("ip-pharmacy-desk balance display", () => {
  it("uses API balance fields without recomputing totals", () => {
    const balance: IpMedicineBalance = {
      totalChargePaise: 10_000,
      totalChargeRupees: 100,
      totalPaidPaise: 7_000,
      totalPaidRupees: 70,
      netPaidPaise: 6_500,
      netPaidRupees: 65,
      totalRefundedPaise: 500,
      totalRefundedRupees: 5,
      creditPaise: 0,
      creditRupees: 0,
      outstandingPaise: 3_500,
      outstandingRupees: 35,
      paymentStatus: "PARTIALLY_PAID",
      currency: "INR",
    };
    const rows = buildIpPharmacyBalanceDisplayRows(balance);
    const chargeRow = rows.find((r) => r.label.includes("Total medicine charges"));
    assert.equal(chargeRow?.paise, 10_000);
    assert.equal(chargeRow?.rupees, 100);
    const outstanding = rows.find((r) => r.label === "Outstanding");
    assert.equal(outstanding?.paise, 3_500);
    assert.notEqual(
      rows.reduce((s, r) => s + r.paise, 0),
      balance.totalChargePaise,
      "row sum must not replace authoritative totalChargePaise",
    );
  });

  it("returns empty balance rows when API balance is missing", () => {
    assert.deepEqual(buildIpPharmacyBalanceDisplayRows(null), []);
  });
});

describe("ip-pharmacy-desk orders and audit", () => {
  it("flattens order lines with remaining quantities", () => {
    const orders: IpMedicineOrder[] = [
      {
        id: "o1",
        organizationId: "org",
        patientId: "p1",
        encounterId: "e1",
        prescriptionId: "rx1",
        sourceSessionId: "s1",
        roundScheduleId: null,
        status: "open",
        lines: [
          {
            id: "l1",
            prescriptionLineId: "pl1",
            medicineNameSnapshot: "Tab A",
            strengthSnapshot: "500mg",
            authorizedQuantity: 10,
            dispensedQuantity: 4,
            remainingQuantity: 6,
            unitOfMeasure: "unit",
            unitPricePaise: 1000,
            unitPriceRupees: 10,
            instructions: "After food",
          },
        ],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    const rows = flattenIpPharmacyOrderLines(orders);
    assert.equal(rows.length, 1);
    assert.match(rows[0].medicineLabel, /Tab A/);
    assert.equal(rows[0].remainingQuantity, 6);
    assert.equal(rows[0].prescriptionLineId, "pl1");
    assert.equal(rows[0].instructions, "After food");
  });

  it("builds chronological audit timeline newest first", () => {
    const timeline = buildIpPharmacyAuditTimeline({
      orders: [],
      dispenses: [
        {
          id: "d1",
          orderId: "o1",
          prescriptionLineId: "l1",
          quantity: 2,
          unitPricePaise: 100,
          chargeAmountPaise: 200,
          clientReferenceId: "disp-1",
          dispensedAt: "2026-01-02T12:00:00.000Z",
        },
      ],
      charges: [
        {
          id: "c1",
          chargeType: "dispense",
          amountPaise: 200,
          amountRupees: 2,
          quantity: 2,
          unitPricePaise: 100,
          dispenseId: "d1",
          relatedChargeId: null,
          allocatedPaise: 0,
          outstandingPaise: 200,
          paymentStatus: "UNPAID",
          createdAt: "2026-01-02T12:01:00.000Z",
        },
      ],
      payments: [],
      refunds: [],
    });
    assert.equal(timeline.length, 2);
    assert.equal(timeline[0].kind, "charge");
    assert.equal(timeline[1].kind, "dispense");
  });
});

describe("ip-pharmacy-desk permissions", () => {
  it("allows pharmacy desk with IP_MEDICINE_VIEW only", () => {
    assert.equal(canAccessIpPharmacyDesk([IP_MEDICINE_VIEW], false), true);
    assert.equal(canAccessIpPharmacyDesk([IP_ADMISSION_VIEW], false), false);
  });

  it("route access matches pharmacy vs billing permissions", () => {
    const pharmacy = resolveRouteAccess("/ip-pharmacy/encounters/abc", {
      permissions: [IP_MEDICINE_VIEW],
    } as never);
    assert.equal(pharmacy.allowed, true);

    const billingOnly = resolveRouteAccess("/ip-pharmacy/encounters/abc", {
      permissions: [IP_ADMISSION_VIEW],
    } as never);
    assert.equal(billingOnly.allowed, false);
  });
});

describe("ip-pharmacy-desk loading and error helpers", () => {
  it("treats missing orders as empty order lines", () => {
    assert.deepEqual(flattenIpPharmacyOrderLines(undefined), []);
  });

  it("treats missing audit payload as empty timeline", () => {
    assert.deepEqual(buildIpPharmacyAuditTimeline(undefined), []);
  });
});
