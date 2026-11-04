import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildRoomRentCorrectionPayload,
  buildChargeAllocationTargets,
  canViewIpAdmissionBillingRoute,
  sumCorrectionsForCharge,
  validateConsolidatedInvoiceTotals,
  validatePaymentAllocations,
  validateRoomRentCorrectionForm,
  extractSnapshotStoredInvoice,
  snapshotFinancialsDifferFromLive,
  pickLatestStatementRevision,
} from "./ip-admission-billing.utils";
import { formatPaiseAsInr, rupeesInputToPaise } from "./ip-money.utils";
import {
  canEditIpAdmissionBilling,
  canRecordIpAdmissionPayment,
  canViewIpAdmissionBilling,
  hasPermissionCode,
  IP_ADMISSION_VIEW,
} from "../constants/permissions";
import { resolveRouteAccess } from "./routePermissions";

describe("ip-money.utils", () => {
  it("formats paise as INR", () => {
    assert.equal(formatPaiseAsInr(100_000), "₹1000.00");
    assert.equal(formatPaiseAsInr(null), "—");
  });

  it("converts rupee input to paise", () => {
    assert.equal(rupeesInputToPaise("10.5"), 1050);
    assert.equal(rupeesInputToPaise(""), null);
  });
});

describe("ip-admission-billing.utils", () => {
  it("validates room rent correction form", () => {
    assert.equal(
      validateRoomRentCorrectionForm({
        reason: "",
        clientReferenceId: "short",
        partialAmountPaise: null,
        usePartial: false,
      }),
      "Correction reason is required.",
    );
    assert.equal(
      validateRoomRentCorrectionForm({
        reason: "Wrong rate",
        clientReferenceId: "rrc-valid-ref-1",
        partialAmountPaise: null,
        usePartial: false,
      }),
      null,
    );
  });

  it("builds partial and full correction payloads", () => {
    assert.deepEqual(
      buildRoomRentCorrectionPayload({
        reason: "Fix",
        clientReferenceId: "rrc-valid-ref-2",
        partialAmountPaise: 2500,
        usePartial: true,
      }),
      {
        reason: "Fix",
        clientReferenceId: "rrc-valid-ref-2",
        amountPaise: 2500,
      },
    );
    assert.deepEqual(
      buildRoomRentCorrectionPayload({
        reason: "Full",
        clientReferenceId: "rrc-valid-ref-3",
        partialAmountPaise: null,
        usePartial: false,
      }),
      {
        reason: "Full",
        clientReferenceId: "rrc-valid-ref-3",
      },
    );
  });

  it("sums corrections per charge", () => {
    assert.equal(
      sumCorrectionsForCharge(
        [
          { originalChargeId: "a1", amountPaise: 100 },
          { originalChargeId: "a2", amountPaise: 50 },
          { originalChargeId: "a1", amountPaise: 25 },
        ],
        "a1",
      ),
      125,
    );
  });

  it("validates multi-line payment allocations", () => {
    const targets = buildChargeAllocationTargets({
      roomRent: [{ _id: "r1", amountPaise: 100_000, allocatedPaise: 0 }],
      otherCharges: [
        { _id: "o1", status: "active", amountPaise: 50_000, allocatedPaise: 0 },
      ],
    });
    assert.equal(
      validatePaymentAllocations(
        120_000,
        [
          { chargeKind: "room_rent", chargeId: "r1", amountPaise: 100_000 },
          { chargeKind: "other", chargeId: "o1", amountPaise: 20_000 },
        ],
        targets,
      ),
      null,
    );
    assert.match(
      validatePaymentAllocations(
        120_000,
        [{ chargeKind: "room_rent", chargeId: "r1", amountPaise: 100_000 }],
        targets,
      ) ?? "",
      /equal the payment amount/,
    );
    assert.match(
      validatePaymentAllocations(
        110_000,
        [{ chargeKind: "room_rent", chargeId: "r1", amountPaise: 110_000 }],
        targets,
      ) ?? "",
      /exceeds outstanding/,
    );
  });

  it("validates consolidated invoice totals match backend accounting rules", () => {
    const invoice = {
      lineItems: {
        roomRentPaise: 100_000,
        medicineNetPaise: 50_000,
        otherChargesPaise: 20_000,
      },
      grossTotalPaise: 170_000,
      successfulPaymentsPaise: 200_000,
      successfulRefundsPaise: 10_000,
      netPaidPaise: 190_000,
      balanceDuePaise: 0,
      creditPaise: 20_000,
    };
    assert.equal(validateConsolidatedInvoiceTotals(invoice), null);
    assert.match(
      validateConsolidatedInvoiceTotals({
        ...invoice,
        grossTotalPaise: 160_000,
      }) ?? "",
      /Gross total/,
    );
  });

  it("detects snapshot vs live invoice drift from stored snapshot payload", () => {
    const snap = extractSnapshotStoredInvoice({
      invoice: { balanceDuePaise: 10_000, grossTotalPaise: 100_000 },
    });
    assert.ok(snap);
    assert.equal(
      snapshotFinancialsDifferFromLive(snap, {
        balanceDuePaise: 10_000,
        grossTotalPaise: 100_000,
      }),
      false,
    );
    assert.equal(
      snapshotFinancialsDifferFromLive(snap, {
        balanceDuePaise: 5_000,
        grossTotalPaise: 100_000,
      }),
      true,
    );
  });

  it("picks latest statement revision by revision number", () => {
    const latest = pickLatestStatementRevision([
      { revisionNumber: 1, createdAt: "2026-01-01" },
      { revisionNumber: 3, createdAt: "2026-03-01" },
      { revisionNumber: 2, createdAt: "2026-02-01" },
    ]);
    assert.equal(latest?.revisionNumber, 3);
  });

  it("gates billing desk route by IP_ADMISSION_VIEW", () => {
    assert.equal(canViewIpAdmissionBillingRoute([], false), false);
    assert.equal(
      canViewIpAdmissionBillingRoute([IP_ADMISSION_VIEW], false),
      true,
    );
  });
});

describe("IP admission billing permissions", () => {
  it("does not grant billing view to default session-only grants", () => {
    assert.equal(
      canViewIpAdmissionBilling(["SESSION_VIEW", "SESSION_EDIT"], false),
      false,
    );
  });

  it("maps IP admission permission helpers", () => {
    assert.equal(canViewIpAdmissionBilling([IP_ADMISSION_VIEW], false), true);
    assert.equal(canEditIpAdmissionBilling([IP_ADMISSION_VIEW], false), false);
    assert.equal(
      canRecordIpAdmissionPayment(["IP_ADMISSION_CREATE"], false),
      true,
    );
  });

  it("includes ip_admission in permission alias map", () => {
    assert.equal(
      hasPermissionCode(["ip_admission:read"], IP_ADMISSION_VIEW),
      true,
    );
  });
});

describe("routePermissions IP billing", () => {
  it("allows IP billing route with IP_ADMISSION_VIEW", () => {
    const access = resolveRouteAccess("/ip-billing/encounters/abc", {
      permissions: [IP_ADMISSION_VIEW],
    } as never);
    assert.equal(access.allowed, true);
  });

  it("denies IP billing route without permission", () => {
    const access = resolveRouteAccess("/ip-billing/encounters/abc", {
      permissions: ["PATIENT_VIEW"],
    } as never);
    assert.equal(access.allowed, false);
  });
});

describe("routePermissions IP pharmacy", () => {
  it("allows IP pharmacy route with IP_MEDICINE_VIEW only", () => {
    const access = resolveRouteAccess("/ip-pharmacy", {
      permissions: ["IP_MEDICINE_VIEW"],
    } as never);
    assert.equal(access.allowed, true);
  });

  it("denies IP pharmacy route without IP_MEDICINE_VIEW", () => {
    const access = resolveRouteAccess("/ip-pharmacy/encounters/abc", {
      permissions: [IP_ADMISSION_VIEW],
    } as never);
    assert.equal(access.allowed, false);
  });
});

describe("OP regression guard", () => {
  it("prescription price utils unchanged for OP billing display", () => {
    assert.equal(formatPaiseAsInr(19999), "₹199.99");
  });
});
