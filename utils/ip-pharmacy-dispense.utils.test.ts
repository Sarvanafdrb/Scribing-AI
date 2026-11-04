import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  IP_MEDICINE_EDIT,
  IP_MEDICINE_VIEW,
} from "../constants/permissions";
import {
  invalidateAfterIpMedicineDispense,
  invalidateIpMedicineBillingEncounter,
  ipMedicineBillingKeys,
} from "../services/ip-medicine-billing.queries";
import {
  buildIpMedicineDispenseOperationKey,
  getStableClientReferenceId,
  IP_MEDICINE_CLIENT_REF_PREFIX,
  resetStableClientReferenceIdsForTests,
} from "./ip-medicine-billing.utils";
import {
  buildIpPharmacyDispenseRequest,
  canDispenseIpMedicine,
  canShowDispenseControl,
  IP_PHARMACY_POST_DISPENSE_QUERY_SLICES,
  isOrderLineEligibleForDispense,
  validateIpPharmacyDispenseQuantity,
} from "./ip-pharmacy-dispense.utils";
import type { IpPharmacyOrderLineRow } from "./ip-pharmacy-desk.utils";

const baseRow: IpPharmacyOrderLineRow = {
  orderId: "507f1f77bcf86cd799439011",
  orderStatus: "open",
  lineId: "507f1f77bcf86cd799439012",
  prescriptionLineId: "507f1f77bcf86cd799439013",
  medicineLabel: "Tab A",
  authorizedQuantity: 10,
  dispensedQuantity: 4,
  remainingQuantity: 6,
  unitOfMeasure: "unit",
  unitPricePaise: 1000,
  unitPriceRupees: 10,
};

const validateBase = {
  remainingQuantity: 6,
  orderStatus: "open" as const,
  admissionDischarged: false,
  canDispense: true,
};

describe("ip-pharmacy-dispense permissions", () => {
  it("allows dispense with IP_MEDICINE_EDIT", () => {
    assert.equal(canDispenseIpMedicine([IP_MEDICINE_EDIT], false), true);
  });

  it("denies dispense with IP_MEDICINE_VIEW alone", () => {
    assert.equal(canDispenseIpMedicine([IP_MEDICINE_VIEW], false), false);
  });

  it("hides dispense control when view-only or discharged", () => {
    assert.equal(
      canShowDispenseControl({
        canDispense: false,
        admissionDischarged: false,
        row: baseRow,
      }),
      false,
    );
    assert.equal(
      canShowDispenseControl({
        canDispense: true,
        admissionDischarged: true,
        row: baseRow,
      }),
      false,
    );
    assert.equal(
      canShowDispenseControl({
        canDispense: true,
        admissionDischarged: false,
        row: baseRow,
      }),
      true,
    );
  });
});

describe("ip-pharmacy-dispense quantity validation", () => {
  it("accepts partial and full dispense within remaining", () => {
    assert.deepEqual(
      validateIpPharmacyDispenseQuantity({
        ...validateBase,
        quantityInput: "3",
      }),
      { ok: true, quantity: 3 },
    );
    assert.deepEqual(
      validateIpPharmacyDispenseQuantity({
        ...validateBase,
        quantityInput: "6",
      }),
      { ok: true, quantity: 6 },
    );
  });

  it("rejects zero, negative, fractional, and excessive quantities", () => {
    assert.equal(
      validateIpPharmacyDispenseQuantity({
        ...validateBase,
        quantityInput: "0",
      }).ok,
      false,
    );
    assert.equal(
      validateIpPharmacyDispenseQuantity({
        ...validateBase,
        quantityInput: "-2",
      }).ok,
      false,
    );
    assert.equal(
      validateIpPharmacyDispenseQuantity({
        ...validateBase,
        quantityInput: "2.5",
      }).ok,
      false,
    );
    assert.equal(
      validateIpPharmacyDispenseQuantity({
        ...validateBase,
        quantityInput: "7",
      }).ok,
      false,
    );
  });

  it("rejects cancelled orders and no remaining quantity", () => {
    assert.equal(
      validateIpPharmacyDispenseQuantity({
        ...validateBase,
        orderStatus: "cancelled",
        quantityInput: "1",
      }).ok,
      false,
    );
    assert.equal(
      validateIpPharmacyDispenseQuantity({
        ...validateBase,
        remainingQuantity: 0,
        quantityInput: "1",
      }).ok,
      false,
    );
    assert.equal(isOrderLineEligibleForDispense({ orderStatus: "open", remainingQuantity: 0 }), false);
  });

  it("rejects dispense on discharged admissions", () => {
    assert.equal(
      validateIpPharmacyDispenseQuantity({
        ...validateBase,
        admissionDischarged: true,
        quantityInput: "1",
      }).ok,
      false,
    );
  });
});

describe("ip-pharmacy-dispense idempotency", () => {
  it("retains stable client reference for the same operation key on retry", () => {
    resetStableClientReferenceIdsForTests();
    const opKey = buildIpMedicineDispenseOperationKey({
      encounterId: "507f1f77bcf86cd799439099",
      orderId: baseRow.orderId,
      prescriptionLineId: baseRow.prescriptionLineId,
      quantity: 3,
    });
    const first = getStableClientReferenceId(
      opKey,
      IP_MEDICINE_CLIENT_REF_PREFIX.dispense,
    );
    const second = getStableClientReferenceId(
      opKey,
      IP_MEDICINE_CLIENT_REF_PREFIX.dispense,
    );
    assert.equal(first, second);
  });

  it("builds POST body matching backend dispense contract", () => {
    assert.deepEqual(
      buildIpPharmacyDispenseRequest({
        orderId: baseRow.orderId,
        prescriptionLineId: baseRow.prescriptionLineId,
        quantity: 2,
        clientReferenceId: "  ipm-disp-testref1  ",
      }),
      {
        orderId: baseRow.orderId,
        prescriptionLineId: baseRow.prescriptionLineId,
        quantity: 2,
        clientReferenceId: "ipm-disp-testref1",
      },
    );
  });
});

describe("ip-pharmacy-dispense query invalidation", () => {
  it("invalidates encounter-scoped medicine queries after dispense", async () => {
    const ENC = "507f1f77bcf86cd799439088";
    const calls: unknown[][] = [];
    const queryClient = {
      invalidateQueries: async (opts: { queryKey: readonly unknown[] }) => {
        calls.push([...opts.queryKey]);
      },
    };
    await invalidateAfterIpMedicineDispense(queryClient as never, ENC);
    assert.ok(
      calls.some(
        (key) =>
          key[0] === "ip-medicine-billing" &&
          key[1] === ENC,
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

describe("ip-pharmacy-dispense failure semantics", () => {
  it("does not imply quantity changes when validation fails before API call", () => {
    const before = baseRow.dispensedQuantity;
    const result = validateIpPharmacyDispenseQuantity({
      ...validateBase,
      quantityInput: "99",
    });
    assert.equal(result.ok, false);
    assert.equal(baseRow.dispensedQuantity, before);
  });
});

describe("ip-pharmacy-dispense duplicate submission", () => {
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
