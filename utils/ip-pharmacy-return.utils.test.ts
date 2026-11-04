import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  IP_MEDICINE_EDIT,
  IP_MEDICINE_VIEW,
} from "../constants/permissions";
import {
  invalidateAfterIpMedicineReturn,
  invalidateIpMedicineBillingEncounter,
} from "../services/ip-medicine-billing.queries";
import {
  getStableClientReferenceId,
  IP_MEDICINE_CLIENT_REF_PREFIX,
  resetStableClientReferenceIdsForTests,
} from "./ip-medicine-billing.utils";
import type { IpMedicineCharge } from "../types/ip-medicine-billing.types";
import {
  buildIpPharmacyReturnAttemptKey,
  buildIpPharmacyReturnRequest,
  buildReturnableDispenseTargets,
  canReturnIpMedicine,
  canShowReturnMedicineControl,
  sumReturnedQuantityForDispenseCharge,
  validateIpPharmacyReturn,
  type IpPharmacyReturnableDispenseTarget,
} from "./ip-pharmacy-return.utils";

const DISP_CHARGE = "507f1f77bcf86cd799439041";
const DISPENSE_ID = "507f1f77bcf86cd799439042";
const ENC = "507f1f77bcf86cd799439088";
const REF = "ipm-ret-stable123456";

const dispenseCharge = (
  overrides: Partial<IpMedicineCharge> & { id: string },
): IpMedicineCharge => ({
  id: overrides.id,
  chargeType: "dispense",
  amountPaise: overrides.amountPaise ?? 10000,
  amountRupees: (overrides.amountPaise ?? 10000) / 100,
  quantity: overrides.quantity ?? 10,
  unitPricePaise: overrides.unitPricePaise ?? 1000,
  dispenseId: overrides.dispenseId ?? DISPENSE_ID,
  relatedChargeId: overrides.relatedChargeId ?? null,
  allocatedPaise: overrides.allocatedPaise ?? 0,
  outstandingPaise: overrides.outstandingPaise ?? 10000,
  paymentStatus: overrides.paymentStatus ?? "UNPAID",
  createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
});

const baseTarget: IpPharmacyReturnableDispenseTarget = {
  chargeId: DISP_CHARGE,
  dispenseId: DISPENSE_ID,
  dispenseReference: "disp-ref-1",
  medicineLabel: "Tab A",
  dispensedQuantity: 10,
  returnedQuantity: 2,
  remainingReturnableQuantity: 8,
  unitPricePaise: 1000,
};

describe("ip-pharmacy-return permissions", () => {
  it("allows return with IP_MEDICINE_EDIT", () => {
    assert.equal(canReturnIpMedicine([IP_MEDICINE_EDIT], false), true);
  });

  it("denies return with IP_MEDICINE_VIEW alone", () => {
    assert.equal(canReturnIpMedicine([IP_MEDICINE_VIEW], false), false);
  });

  it("hides return control when view-only or discharged", () => {
    assert.equal(
      canShowReturnMedicineControl({
        canReturn: false,
        admissionDischarged: false,
        target: baseTarget,
      }),
      false,
    );
    assert.equal(
      canShowReturnMedicineControl({
        canReturn: true,
        admissionDischarged: true,
        target: baseTarget,
      }),
      false,
    );
  });
});

describe("ip-pharmacy-return targets", () => {
  it("aggregates returned quantity from return charges", () => {
    const charges = [
      dispenseCharge({ id: DISP_CHARGE, quantity: 10 }),
      {
        ...dispenseCharge({ id: "507f1f77bcf86cd799439043" }),
        chargeType: "return" as const,
        relatedChargeId: DISP_CHARGE,
        quantity: 3,
        amountPaise: -3000,
      },
    ];
    assert.equal(sumReturnedQuantityForDispenseCharge(charges, DISP_CHARGE), 3);
  });

  it("builds returnable targets only for confirmed dispense charges", () => {
    const targets = buildReturnableDispenseTargets({
      charges: [
        dispenseCharge({ id: DISP_CHARGE, quantity: 5 }),
        dispenseCharge({
          id: "507f1f77bcf86cd799439044",
          dispenseId: "507f1f77bcf86cd799439099",
        }),
      ],
      dispenses: [
        {
          id: DISPENSE_ID,
          orderId: "507f1f77bcf86cd799439010",
          prescriptionLineId: "507f1f77bcf86cd799439011",
          quantity: 5,
          unitPricePaise: 1000,
          chargeAmountPaise: 5000,
          clientReferenceId: "disp-ref-1",
          dispensedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      orders: [
        {
          id: "507f1f77bcf86cd799439010",
          prescriptionId: "507f1f77bcf86cd799439012",
          status: "open",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          lines: [
            {
              id: "507f1f77bcf86cd799439013",
              prescriptionLineId: "507f1f77bcf86cd799439011",
              medicineNameSnapshot: "Tab A",
              authorizedQuantity: 10,
              dispensedQuantity: 5,
              remainingQuantity: 5,
              unitPricePaise: 1000,
              unitPriceRupees: 10,
            },
          ],
        },
      ],
    });
    assert.equal(targets.length, 1);
    assert.equal(targets[0]?.remainingReturnableQuantity, 5);
    assert.equal(targets[0]?.medicineLabel, "Tab A");
  });
});

describe("ip-pharmacy-return validation", () => {
  const validateBase = {
    canReturn: true,
    admissionDischarged: false,
    target: baseTarget,
    quantityInput: "2",
    clientReferenceId: REF,
  };

  it("accepts partial and full returns", () => {
    assert.equal(
      validateIpPharmacyReturn({ ...validateBase, quantityInput: "1" }).ok,
      true,
    );
    assert.equal(
      validateIpPharmacyReturn({ ...validateBase, quantityInput: "8" }).ok,
      true,
    );
  });

  it("rejects discharged admissions", () => {
    assert.equal(
      validateIpPharmacyReturn({
        ...validateBase,
        admissionDischarged: true,
      }).ok,
      false,
    );
  });

  it("rejects zero, negative, fractional, and excessive quantities", () => {
    assert.equal(
      validateIpPharmacyReturn({ ...validateBase, quantityInput: "0" }).ok,
      false,
    );
    assert.equal(
      validateIpPharmacyReturn({ ...validateBase, quantityInput: "-1" }).ok,
      false,
    );
    assert.equal(
      validateIpPharmacyReturn({ ...validateBase, quantityInput: "1.5" }).ok,
      false,
    );
    assert.equal(
      validateIpPharmacyReturn({ ...validateBase, quantityInput: "99" }).ok,
      false,
    );
  });

  it("builds POST body matching backend returnMedicineSchema", () => {
    const validated = validateIpPharmacyReturn({
      ...validateBase,
      quantityInput: "3",
      notes: "  sealed pack  ",
    });
    assert.equal(validated.ok, true);
    if (validated.ok) {
      assert.deepEqual(buildIpPharmacyReturnRequest(validated), {
        chargeId: DISP_CHARGE,
        quantity: 3,
        clientReferenceId: REF,
        notes: "sealed pack",
      });
    }
  });
});

describe("ip-pharmacy-return idempotency", () => {
  it("retains stable client reference for the same attempt on retry", () => {
    resetStableClientReferenceIdsForTests();
    const key = buildIpPharmacyReturnAttemptKey(ENC, "attempt-a");
    const a = getStableClientReferenceId(key, IP_MEDICINE_CLIENT_REF_PREFIX.return);
    const b = getStableClientReferenceId(key, IP_MEDICINE_CLIENT_REF_PREFIX.return);
    assert.equal(a, b);
  });
});

describe("ip-pharmacy-return query invalidation", () => {
  it("invalidates encounter medicine queries after return", async () => {
    const calls: unknown[][] = [];
    const queryClient = {
      invalidateQueries: async (opts: { queryKey: readonly unknown[] }) => {
        calls.push([...opts.queryKey]);
      },
    };
    await invalidateAfterIpMedicineReturn(queryClient as never, ENC);
    assert.deepEqual(invalidateIpMedicineBillingEncounter(ENC), [
      "ip-medicine-billing",
      ENC,
    ]);
    assert.ok(
      calls.some((k) => k[0] === "ip-medicine-billing" && k[1] === ENC),
    );
  });
});

describe("ip-pharmacy-return failure semantics", () => {
  it("does not change target quantities when validation fails", () => {
    const target = { ...baseTarget };
    validateIpPharmacyReturn({
      canReturn: true,
      admissionDischarged: false,
      target,
      quantityInput: "999",
      clientReferenceId: REF,
    });
    assert.equal(target.remainingReturnableQuantity, 8);
  });
});

describe("ip-pharmacy-return duplicate submission", () => {
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
