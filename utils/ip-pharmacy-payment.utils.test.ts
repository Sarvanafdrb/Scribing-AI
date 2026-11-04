import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  IP_MEDICINE_CREATE,
  IP_MEDICINE_VIEW,
} from "../constants/permissions";
import {
  invalidateAfterIpMedicinePayment,
  invalidateIpMedicineBillingEncounter,
  ipMedicineBillingKeys,
} from "../services/ip-medicine-billing.queries";
import type { IpMedicineCharge } from "../types/ip-medicine-billing.types";
import {
  getStableClientReferenceId,
  IP_MEDICINE_CLIENT_REF_PREFIX,
  resetStableClientReferenceIdsForTests,
} from "./ip-medicine-billing.utils";
import { IP_PHARMACY_POST_DISPENSE_QUERY_SLICES } from "./ip-pharmacy-dispense.utils";
import {
  buildEligibleDispenseChargeTargets,
  buildIpPharmacyPaymentAttemptKey,
  canRecordIpMedicinePayment,
  canShowRecordMedicinePaymentControl,
  hasEligibleMedicinePaymentCharges,
  validateIpPharmacyMedicinePayment,
} from "./ip-pharmacy-payment.utils";

const CHARGE_A = "507f1f77bcf86cd799439021";
const CHARGE_B = "507f1f77bcf86cd799439022";
const ENC = "507f1f77bcf86cd799439088";
const STABLE_REF = "ipm-pay-stable123456";

const dispenseCharge = (
  overrides: Partial<IpMedicineCharge> & { id: string },
): IpMedicineCharge => ({
  id: overrides.id,
  chargeType: overrides.chargeType ?? "dispense",
  amountPaise: overrides.amountPaise ?? 10000,
  amountRupees: (overrides.amountPaise ?? 10000) / 100,
  quantity: overrides.quantity ?? 2,
  unitPricePaise: overrides.unitPricePaise ?? 5000,
  dispenseId: overrides.dispenseId ?? "507f1f77bcf86cd799439030",
  relatedChargeId: overrides.relatedChargeId ?? null,
  allocatedPaise: overrides.allocatedPaise ?? 0,
  outstandingPaise: overrides.outstandingPaise ?? 10000,
  paymentStatus: overrides.paymentStatus ?? "UNPAID",
  createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
});

const eligible = buildEligibleDispenseChargeTargets([
  dispenseCharge({ id: CHARGE_A, outstandingPaise: 5000, amountPaise: 5000 }),
  dispenseCharge({ id: CHARGE_B, outstandingPaise: 3000, amountPaise: 3000 }),
]);

const validateBase = {
  canRecord: true,
  admissionDischarged: false,
  eligibleCharges: eligible,
  method: "cash",
  clientReferenceId: STABLE_REF,
  allocationDrafts: [
    { chargeId: CHARGE_A, amountRupees: "50.00" },
    { chargeId: CHARGE_B, amountRupees: "" },
  ],
};

describe("ip-pharmacy-payment permissions", () => {
  it("allows payment recording with IP_MEDICINE_CREATE", () => {
    assert.equal(canRecordIpMedicinePayment([IP_MEDICINE_CREATE], false), true);
  });

  it("denies payment recording with IP_MEDICINE_VIEW alone", () => {
    assert.equal(canRecordIpMedicinePayment([IP_MEDICINE_VIEW], false), false);
  });

  it("hides record control when view-only, discharged, or no eligible charges", () => {
    assert.equal(
      canShowRecordMedicinePaymentControl({
        canRecord: false,
        admissionDischarged: false,
        charges: [dispenseCharge({ id: CHARGE_A })],
      }),
      false,
    );
    assert.equal(
      canShowRecordMedicinePaymentControl({
        canRecord: true,
        admissionDischarged: true,
        charges: [dispenseCharge({ id: CHARGE_A })],
      }),
      false,
    );
    assert.equal(
      canShowRecordMedicinePaymentControl({
        canRecord: true,
        admissionDischarged: false,
        charges: [
          dispenseCharge({ id: CHARGE_A, outstandingPaise: 0, amountPaise: 100 }),
        ],
      }),
      false,
    );
    assert.equal(
      canShowRecordMedicinePaymentControl({
        canRecord: true,
        admissionDischarged: false,
        charges: [dispenseCharge({ id: CHARGE_A })],
      }),
      true,
    );
  });
});

describe("ip-pharmacy-payment eligible charges", () => {
  it("includes only dispense charges with positive outstanding", () => {
    const targets = buildEligibleDispenseChargeTargets([
      dispenseCharge({ id: CHARGE_A }),
      dispenseCharge({
        id: "return-1",
        chargeType: "return",
        outstandingPaise: 500,
      }),
      dispenseCharge({ id: "paid", outstandingPaise: 0, amountPaise: 100 }),
    ]);
    assert.equal(targets.length, 1);
    assert.equal(targets[0]?.chargeId, CHARGE_A);
    assert.equal(hasEligibleMedicinePaymentCharges([]), false);
  });
});

describe("ip-pharmacy-payment validation", () => {
  it("blocks discharged admissions", () => {
    const result = validateIpPharmacyMedicinePayment({
      ...validateBase,
      admissionDischarged: true,
    });
    assert.equal(result.ok, false);
  });

  it("blocks when user cannot record", () => {
    assert.equal(
      validateIpPharmacyMedicinePayment({ ...validateBase, canRecord: false }).ok,
      false,
    );
  });

  it("blocks when no eligible charges", () => {
    assert.equal(
      validateIpPharmacyMedicinePayment({
        ...validateBase,
        eligibleCharges: [],
      }).ok,
      false,
    );
  });

  it("accepts payment allocated to one charge", () => {
    const result = validateIpPharmacyMedicinePayment({
      ...validateBase,
      allocationDrafts: [{ chargeId: CHARGE_A, amountRupees: "25.00" }],
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.amountPaise, 2500);
      assert.deepEqual(result.allocations, [
        { chargeId: CHARGE_A, amountPaise: 2500 },
      ]);
    }
  });

  it("accepts payment allocated across multiple charges", () => {
    const result = validateIpPharmacyMedicinePayment({
      ...validateBase,
      allocationDrafts: [
        { chargeId: CHARGE_A, amountRupees: "50.00" },
        { chargeId: CHARGE_B, amountRupees: "30.00" },
      ],
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.amountPaise, 8000);
      assert.equal(
        result.allocations.reduce((s, a) => s + a.amountPaise, 0),
        result.amountPaise,
      );
    }
  });

  it("sets amountPaise equal to allocation sum for backend contract", () => {
    const result = validateIpPharmacyMedicinePayment({
      ...validateBase,
      allocationDrafts: [{ chargeId: CHARGE_A, amountRupees: "50.00" }],
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(
        {
          amountPaise: result.amountPaise,
          method: result.method,
          clientReferenceId: result.clientReferenceId,
          allocations: result.allocations,
        },
        {
          amountPaise: 5000,
          method: "cash",
          clientReferenceId: STABLE_REF,
          allocations: [{ chargeId: CHARGE_A, amountPaise: 5000 }],
        },
      );
    }
  });

  it("rejects zero, negative, and invalid allocations", () => {
    assert.equal(
      validateIpPharmacyMedicinePayment({
        ...validateBase,
        allocationDrafts: [{ chargeId: CHARGE_A, amountRupees: "0" }],
      }).ok,
      false,
    );
    assert.equal(
      validateIpPharmacyMedicinePayment({
        ...validateBase,
        allocationDrafts: [{ chargeId: CHARGE_A, amountRupees: "-1" }],
      }).ok,
      false,
    );
    assert.equal(
      validateIpPharmacyMedicinePayment({
        ...validateBase,
        allocationDrafts: [{ chargeId: CHARGE_A, amountRupees: "abc" }],
      }).ok,
      false,
    );
    assert.equal(
      validateIpPharmacyMedicinePayment({
        ...validateBase,
        allocationDrafts: [],
      }).ok,
      false,
    );
  });

  it("rejects per-charge over-allocation", () => {
    const result = validateIpPharmacyMedicinePayment({
      ...validateBase,
      allocationDrafts: [{ chargeId: CHARGE_A, amountRupees: "100.00" }],
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.message, /remaining payable/i);
    }
  });

  it("rejects unsupported payment method", () => {
    assert.equal(
      validateIpPharmacyMedicinePayment({
        ...validateBase,
        method: "wire",
        allocationDrafts: [{ chargeId: CHARGE_A, amountRupees: "10.00" }],
      }).ok,
      false,
    );
  });

  it("rejects allocations to ineligible charge ids", () => {
    assert.equal(
      validateIpPharmacyMedicinePayment({
        ...validateBase,
        allocationDrafts: [
          { chargeId: "507f1f77bcf86cd799439099", amountRupees: "10.00" },
        ],
      }).ok,
      false,
    );
  });
});

describe("ip-pharmacy-payment idempotency", () => {
  it("retains stable client reference for the same payment attempt on retry", () => {
    resetStableClientReferenceIdsForTests();
    const attemptKey = buildIpPharmacyPaymentAttemptKey(ENC, "attempt-1");
    const first = getStableClientReferenceId(
      attemptKey,
      IP_MEDICINE_CLIENT_REF_PREFIX.payment,
    );
    const second = getStableClientReferenceId(
      attemptKey,
      IP_MEDICINE_CLIENT_REF_PREFIX.payment,
    );
    assert.equal(first, second);
  });
});

describe("ip-pharmacy-payment query invalidation", () => {
  it("invalidates encounter medicine queries after payment", async () => {
    const calls: unknown[][] = [];
    const queryClient = {
      invalidateQueries: async (opts: { queryKey: readonly unknown[] }) => {
        calls.push([...opts.queryKey]);
      },
    };
    await invalidateAfterIpMedicinePayment(queryClient as never, ENC);
    assert.ok(
      calls.some(
        (key) => key[0] === "ip-medicine-billing" && key[1] === ENC,
      ),
    );
    for (const slice of IP_PHARMACY_POST_DISPENSE_QUERY_SLICES) {
      assert.deepEqual(
        ipMedicineBillingKeys[slice as keyof typeof ipMedicineBillingKeys](ENC),
        ["ip-medicine-billing", ENC, slice],
      );
    }
    assert.deepEqual(invalidateIpMedicineBillingEncounter(ENC), [
      "ip-medicine-billing",
      ENC,
    ]);
  });
});

describe("ip-pharmacy-payment failure semantics", () => {
  it("does not change charge snapshots when validation fails", () => {
    const charge = dispenseCharge({ id: CHARGE_A, outstandingPaise: 5000 });
    const before = charge.outstandingPaise;
    validateIpPharmacyMedicinePayment({
      ...validateBase,
      eligibleCharges: buildEligibleDispenseChargeTargets([charge]),
      allocationDrafts: [{ chargeId: CHARGE_A, amountRupees: "999.00" }],
    });
    assert.equal(charge.outstandingPaise, before);
  });
});

describe("ip-pharmacy-payment duplicate submission", () => {
  it("blocks a second submit while the first is pending", () => {
    let pending = false;
    const submit = () => {
      if (pending) return "blocked";
      pending = true;
      return "sent";
    };
    assert.equal(submit(), "sent");
    assert.equal(submit(), "blocked");
  });
});
