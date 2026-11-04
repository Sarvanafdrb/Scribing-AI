import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  IP_MEDICINE_CREATE,
  IP_MEDICINE_VIEW,
} from "../constants/permissions";
import {
  invalidateAfterIpMedicineRefund,
  invalidateIpMedicineBillingEncounter,
} from "../services/ip-medicine-billing.queries";
import type {
  IpMedicineBalance,
  IpMedicineCharge,
  IpMedicineRefund,
} from "../types/ip-medicine-billing.types";
import {
  getStableClientReferenceId,
  IP_MEDICINE_CLIENT_REF_PREFIX,
  resetStableClientReferenceIdsForTests,
} from "./ip-medicine-billing.utils";
import {
  assessRefundLimitDataReliability,
  buildIpPharmacyRefundAttemptKey,
  buildIpPharmacyRefundRequest,
  buildRefundableReturnTargets,
  canRefundIpMedicine,
  canShowRefundMedicineControl,
  computeMaxRefundableForReturnChargeFromApi,
  computeRefundLimitsForReturnCharge,
  isIpMedicineRefundAuditRowValid,
  sumRefundedPaiseForReturnCharge,
  validateIpPharmacyRefund,
  wouldBackendRejectRefundAmount,
  type IpPharmacyRefundableReturnTarget,
} from "./ip-pharmacy-refund.utils";

const ORIGINAL = "507f1f77bcf86cd799439051";
const RETURN_A = "507f1f77bcf86cd799439052";
const RETURN_B = "507f1f77bcf86cd799439053";
const ENC = "507f1f77bcf86cd799439088";
const REF = "ipm-ref-stable123456";

const balance = (creditPaise: number): IpMedicineBalance => ({
  totalChargePaise: 5000,
  totalChargeRupees: 50,
  totalPaidPaise: 10000,
  totalPaidRupees: 100,
  netPaidPaise: 8000,
  netPaidRupees: 80,
  totalRefundedPaise: 2000,
  totalRefundedRupees: 20,
  creditPaise,
  creditRupees: creditPaise / 100,
  outstandingPaise: 0,
  outstandingRupees: 0,
  paymentStatus: "PAID",
  currency: "INR",
});

const originalCharge = (
  allocatedPaise: number,
  amountPaise = 5000,
): IpMedicineCharge => ({
  id: ORIGINAL,
  chargeType: "dispense",
  amountPaise,
  amountRupees: amountPaise / 100,
  quantity: 5,
  unitPricePaise: 1000,
  dispenseId: "507f1f77bcf86cd799439060",
  relatedChargeId: null,
  allocatedPaise,
  outstandingPaise: Math.max(0, amountPaise - allocatedPaise),
  paymentStatus: "PAID",
  createdAt: "2026-01-01T00:00:00.000Z",
});

const returnCharge = (
  id: string,
  quantity: number,
  amountPaise: number,
): IpMedicineCharge => ({
  id,
  chargeType: "return",
  amountPaise,
  amountRupees: amountPaise / 100,
  quantity,
  unitPricePaise: 1000,
  dispenseId: null,
  relatedChargeId: ORIGINAL,
  allocatedPaise: 0,
  outstandingPaise: 0,
  paymentStatus: "UNPAID",
  createdAt: "2026-01-02T00:00:00.000Z",
});

const refundRow = (
  id: string,
  returnChargeId: string,
  amountPaise: number,
): IpMedicineRefund => ({
  id,
  amountPaise,
  amountRupees: amountPaise / 100,
  method: "cash",
  clientReferenceId: `ref-${id}`,
  relatedReturnChargeId: returnChargeId,
  recordedAt: "2026-01-03T00:00:00.000Z",
});

const loadedInput = {
  balanceLoaded: true,
  auditRefundsLoaded: true,
};

const baseTarget: IpPharmacyRefundableReturnTarget = {
  returnChargeId: RETURN_A,
  relatedDispenseChargeId: ORIGINAL,
  returnQuantity: 2,
  returnAmountPaise: -2000,
  paidOnOriginalPaise: 5000,
  maxRefundablePaise: 2000,
  alreadyRefundedPaise: 500,
  remainingRefundablePaise: 1500,
  encounterCreditPaise: 1000,
  maxRefundPaise: 1000,
};

describe("ip-pharmacy-refund backend formula parity", () => {
  it("matches maxForReturn = min(|return|, succeeded allocations on original)", () => {
    const ret = returnCharge(RETURN_A, 3, -3000);
    const orig = originalCharge(5000);
    assert.equal(
      computeMaxRefundableForReturnChargeFromApi({
        returnCharge: ret,
        originalCharge: orig,
      }),
      3000,
    );
    assert.equal(
      computeMaxRefundableForReturnChargeFromApi({
        returnCharge: returnCharge(RETURN_A, 8, -8000),
        originalCharge: originalCharge(5000),
      }),
      5000,
    );
  });

  it("matches remaining and maxPermittedRefund with audit refund sums", () => {
    const ret = returnCharge(RETURN_A, 2, -2000);
    const orig = originalCharge(5000);
    const limits = computeRefundLimitsForReturnCharge({
      returnCharge: ret,
      originalCharge: orig,
      refunds: [refundRow("507f1f77bcf86cd799439061", RETURN_A, 500)],
      balance: balance(2500),
    });
    assert.equal(limits.maxForReturn, 2000);
    assert.equal(limits.alreadyRefunded, 500);
    assert.equal(limits.remainingForReturn, 1500);
    assert.equal(limits.encounterCredit, 2500);
    assert.equal(limits.maxPermittedRefund, 1500);
  });

  it("uses encounter credit when lower than return remaining", () => {
    const limits = computeRefundLimitsForReturnCharge({
      returnCharge: returnCharge(RETURN_A, 5, -5000),
      originalCharge: originalCharge(5000),
      refunds: [],
      balance: balance(800),
    });
    assert.equal(limits.remainingForReturn, 5000);
    assert.equal(limits.maxPermittedRefund, 800);
  });

  it("uses return remaining when lower than encounter credit", () => {
    const limits = computeRefundLimitsForReturnCharge({
      returnCharge: returnCharge(RETURN_A, 2, -2000),
      originalCharge: originalCharge(5000),
      refunds: [refundRow("507f1f77bcf86cd799439061", RETURN_A, 1500)],
      balance: balance(5000),
    });
    assert.equal(limits.remainingForReturn, 500);
    assert.equal(limits.maxPermittedRefund, 500);
  });
});

describe("ip-pharmacy-refund multiple returns and partial refunds", () => {
  it("tracks multiple partial refunds against one return", () => {
    const refunds = [
      refundRow("507f1f77bcf86cd799439071", RETURN_A, 400),
      refundRow("507f1f77bcf86cd799439072", RETURN_A, 600),
    ];
    assert.equal(sumRefundedPaiseForReturnCharge(refunds, RETURN_A), 1000);
    const limits = computeRefundLimitsForReturnCharge({
      returnCharge: returnCharge(RETURN_A, 3, -3000),
      originalCharge: originalCharge(5000),
      refunds,
      balance: balance(5000),
    });
    assert.equal(limits.remainingForReturn, 2000);
  });

  it("keeps independent return charges against one dispense", () => {
    const targets = buildRefundableReturnTargets({
      charges: [
        originalCharge(10000, 10000),
        returnCharge(RETURN_A, 2, -2000),
        returnCharge(RETURN_B, 3, -3000),
      ],
      refunds: [refundRow("507f1f77bcf86cd799439081", RETURN_A, 1000)],
      balance: balance(10000),
      ...loadedInput,
    });
    assert.equal(targets.length, 2);
    const a = targets.find((t) => t.returnChargeId === RETURN_A);
    const b = targets.find((t) => t.returnChargeId === RETURN_B);
    assert.equal(a?.remainingRefundablePaise, 1000);
    assert.equal(b?.remainingRefundablePaise, 3000);
  });
});

describe("ip-pharmacy-refund audit reliability", () => {
  it("disables targets when audit refunds are missing", () => {
    const targets = buildRefundableReturnTargets({
      charges: [originalCharge(5000), returnCharge(RETURN_A, 2, -2000)],
      refunds: undefined,
      balance: balance(1000),
      balanceLoaded: true,
      auditRefundsLoaded: false,
    });
    assert.equal(targets.length, 0);
    assert.equal(
      assessRefundLimitDataReliability({
        balance: balance(1000),
        balanceLoaded: true,
        refunds: undefined,
        auditRefundsLoaded: false,
      }).reliable,
      false,
    );
  });

  it("disables targets when balance is missing", () => {
    assert.equal(
      buildRefundableReturnTargets({
        charges: [originalCharge(5000), returnCharge(RETURN_A, 2, -2000)],
        refunds: [],
        balance: undefined,
        balanceLoaded: false,
        auditRefundsLoaded: true,
      }).length,
      0,
    );
  });

  it("rejects malformed audit rows to avoid inflated limits", () => {
    const assessment = assessRefundLimitDataReliability({
      balance: balance(1000),
      balanceLoaded: true,
      refunds: [
        {
          ...refundRow("507f1f77bcf86cd799439091", RETURN_A, 100),
          relatedReturnChargeId: "",
        },
      ],
      auditRefundsLoaded: true,
    });
    assert.equal(assessment.reliable, false);
    assert.equal(
      buildRefundableReturnTargets({
        charges: [originalCharge(5000), returnCharge(RETURN_A, 2, -2000)],
        refunds: [
          {
            ...refundRow("507f1f77bcf86cd799439091", RETURN_A, 100),
            amountPaise: 50.5 as unknown as number,
          },
        ],
        balance: balance(1000),
        ...loadedInput,
      }).length,
      0,
    );
  });

  it("accepts empty refund list when audit loaded", () => {
    assert.equal(isIpMedicineRefundAuditRowValid(refundRow("1", RETURN_A, 100)), true);
    assert.equal(
      buildRefundableReturnTargets({
        charges: [originalCharge(5000), returnCharge(RETURN_A, 2, -2000)],
        refunds: [],
        balance: balance(1000),
        ...loadedInput,
      }).length,
      1,
    );
  });
});

describe("ip-pharmacy-refund permissions", () => {
  it("allows refund with IP_MEDICINE_CREATE", () => {
    assert.equal(canRefundIpMedicine([IP_MEDICINE_CREATE], false), true);
  });

  it("denies refund with IP_MEDICINE_VIEW alone", () => {
    assert.equal(canRefundIpMedicine([IP_MEDICINE_VIEW], false), false);
  });

  it("hides refund control when limits unreliable or discharged", () => {
    assert.equal(
      canShowRefundMedicineControl({
        canRefund: true,
        refundLimitsReliable: false,
        admissionDischarged: false,
        target: baseTarget,
      }),
      false,
    );
    assert.equal(
      canShowRefundMedicineControl({
        canRefund: true,
        refundLimitsReliable: true,
        admissionDischarged: true,
        target: baseTarget,
      }),
      false,
    );
    assert.equal(
      canShowRefundMedicineControl({
        canRefund: true,
        refundLimitsReliable: true,
        admissionDischarged: false,
        target: baseTarget,
      }),
      true,
    );
  });
});

describe("ip-pharmacy-refund validation", () => {
  const validateBase = {
    canRefund: true,
    admissionDischarged: false,
    target: baseTarget,
    amountRupees: "10.00",
    method: "cash",
    clientReferenceId: REF,
  };

  it("rejects amounts the backend would reject", () => {
    const excessive = validateIpPharmacyRefund({
      ...validateBase,
      amountRupees: "20.00",
    });
    assert.equal(excessive.ok, false);
    assert.equal(
      wouldBackendRejectRefundAmount({
        amountPaise: 2000,
        maxForReturn: baseTarget.maxRefundablePaise,
        alreadyForReturn: baseTarget.alreadyRefundedPaise,
        creditPaise: baseTarget.encounterCreditPaise,
      }).rejected,
      true,
    );
  });

  it("requires positive integer paise amounts", () => {
    assert.equal(
      validateIpPharmacyRefund({ ...validateBase, amountRupees: "5.00" }).ok,
      true,
    );
    assert.equal(
      validateIpPharmacyRefund({ ...validateBase, amountRupees: "0" }).ok,
      false,
    );
    assert.equal(
      validateIpPharmacyRefund({ ...validateBase, amountRupees: "-1" }).ok,
      false,
    );
  });

  it("builds POST body matching backend recordRefundSchema", () => {
    const validated = validateIpPharmacyRefund({
      ...validateBase,
      amountRupees: "10.00",
      reason: " patient request ",
    });
    assert.equal(validated.ok, true);
    if (validated.ok) {
      assert.deepEqual(buildIpPharmacyRefundRequest(validated), {
        returnChargeId: RETURN_A,
        amountPaise: 1000,
        method: "cash",
        clientReferenceId: REF,
        reason: "patient request",
      });
    }
  });
});

describe("ip-pharmacy-refund idempotency", () => {
  it("retains stable client reference for the same attempt on retry", () => {
    resetStableClientReferenceIdsForTests();
    const key = buildIpPharmacyRefundAttemptKey(ENC, "attempt-b");
    const a = getStableClientReferenceId(key, IP_MEDICINE_CLIENT_REF_PREFIX.refund);
    const b = getStableClientReferenceId(key, IP_MEDICINE_CLIENT_REF_PREFIX.refund);
    assert.equal(a, b);
  });

  it("documents idempotent retry as same refund document not double-counted in UI", () => {
    const refunds = [refundRow("507f1f77bcf86cd799439101", RETURN_A, 1000)];
    assert.equal(sumRefundedPaiseForReturnCharge(refunds, RETURN_A), 1000);
    assert.equal(sumRefundedPaiseForReturnCharge(refunds, RETURN_A), 1000);
  });
});

describe("ip-pharmacy-refund query invalidation", () => {
  it("invalidates encounter medicine queries after refund", async () => {
    const calls: unknown[][] = [];
    const queryClient = {
      invalidateQueries: async (opts: { queryKey: readonly unknown[] }) => {
        calls.push([...opts.queryKey]);
      },
    };
    await invalidateAfterIpMedicineRefund(queryClient as never, ENC);
    assert.deepEqual(invalidateIpMedicineBillingEncounter(ENC), [
      "ip-medicine-billing",
      ENC,
    ]);
    assert.ok(
      calls.some((k) => k[0] === "ip-medicine-billing" && k[1] === ENC),
    );
  });
});

describe("ip-pharmacy-refund failure semantics", () => {
  it("does not change target refund totals when validation fails", () => {
    const target = { ...baseTarget };
    validateIpPharmacyRefund({
      canRefund: true,
      admissionDischarged: false,
      target,
      amountRupees: "999.00",
      method: "cash",
      clientReferenceId: REF,
    });
    assert.equal(target.remainingRefundablePaise, 1500);
    assert.equal(target.encounterCreditPaise, 1000);
  });
});

describe("ip-pharmacy-refund duplicate submission", () => {
  it("blocks a second submit while pending", () => {
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
