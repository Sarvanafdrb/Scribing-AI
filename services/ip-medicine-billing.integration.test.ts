import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildIpMedicineBillingBasePath,
  ipMedicineBillingService,
} from "../services/ip-medicine-billing.service";
import {
  ipMedicineBillingKeys,
  invalidateAfterIpMedicineFinancialMutation,
} from "../services/ip-medicine-billing.queries";
import {
  buildIpMedicineDispenseOperationKey,
  buildIpMedicinePaymentOperationKey,
  getStableClientReferenceId,
  IP_MEDICINE_CLIENT_REF_PREFIX,
  isValidEncounterIdParam,
  resetStableClientReferenceIdsForTests,
} from "../utils/ip-medicine-billing.utils";
import { MIN_CLIENT_REFERENCE_LENGTH } from "../utils/ip-admission-billing.utils";

const ENC_A = "507f1f77bcf86cd799439011";
const ENC_B = "507f1f77bcf86cd799439012";

describe("ip-medicine-billing.service paths", () => {
  it("builds encoded base path per encounter", () => {
    assert.equal(
      buildIpMedicineBillingBasePath(ENC_A),
      `/ip-medicine/encounters/${ENC_A}/ip-medicine`,
    );
  });

  it("defines GET/POST relative paths under the encounter base", () => {
    const base = buildIpMedicineBillingBasePath(ENC_A);
    assert.equal(`${base}/orders`, `${base}/orders`);
    assert.equal(`${base}/dispenses`, `${base}/dispenses`);
    assert.equal(`${base}/charges`, `${base}/charges`);
    assert.equal(`${base}/balance`, `${base}/balance`);
    assert.equal(`${base}/payments`, `${base}/payments`);
    assert.equal(`${base}/returns`, `${base}/returns`);
    assert.equal(`${base}/refunds`, `${base}/refunds`);
    assert.equal(`${base}/audit`, `${base}/audit`);
  });

  it("exposes typed service methods for each backend endpoint", () => {
    assert.equal(typeof ipMedicineBillingService.searchEncounters, "function");
    assert.equal(typeof ipMedicineBillingService.listOrders, "function");
    assert.equal(typeof ipMedicineBillingService.listDispenses, "function");
    assert.equal(typeof ipMedicineBillingService.confirmDispense, "function");
    assert.equal(typeof ipMedicineBillingService.listCharges, "function");
    assert.equal(typeof ipMedicineBillingService.getBalance, "function");
    assert.equal(typeof ipMedicineBillingService.listPayments, "function");
    assert.equal(typeof ipMedicineBillingService.recordPayment, "function");
    assert.equal(typeof ipMedicineBillingService.recordReturn, "function");
    assert.equal(typeof ipMedicineBillingService.recordRefund, "function");
    assert.equal(typeof ipMedicineBillingService.getAuditTrail, "function");
  });
});

describe("ip-medicine-billing request payload shapes", () => {
  it("matches backend confirmDispenseSchema fields", () => {
    const payload = {
      orderId: ENC_A,
      prescriptionLineId: ENC_B,
      quantity: 2.5,
      clientReferenceId: "dispense-ref-1",
      dispensedAt: "2026-01-15T10:00:00.000Z",
    };
    assert.ok(payload.clientReferenceId.length >= MIN_CLIENT_REFERENCE_LENGTH);
    assert.ok(payload.quantity > 0);
  });

  it("matches backend recordPaymentSchema fields", () => {
    const payload = {
      amountPaise: 5000,
      method: "cash" as const,
      clientReferenceId: "ipm-pay-abcdef12",
      allocations: [{ chargeId: ENC_A, amountPaise: 5000 }],
    };
    assert.equal(
      payload.allocations.reduce((s, a) => s + a.amountPaise, 0),
      payload.amountPaise,
    );
  });
});

describe("ip-medicine-billing query keys", () => {
  it("isolates encounters in the key hierarchy", () => {
    assert.notDeepEqual(
      ipMedicineBillingKeys.search("ina", 1),
      ipMedicineBillingKeys.search("ina", 2),
    );
    assert.notDeepEqual(
      ipMedicineBillingKeys.orders(ENC_A),
      ipMedicineBillingKeys.orders(ENC_B),
    );
    assert.deepEqual(ipMedicineBillingKeys.orders(ENC_A), [
      "ip-medicine-billing",
      ENC_A,
      "orders",
    ]);
  });

  it("uses separate keys for each resource slice", () => {
    const slices = [
      ipMedicineBillingKeys.orders(ENC_A),
      ipMedicineBillingKeys.dispenses(ENC_A),
      ipMedicineBillingKeys.charges(ENC_A),
      ipMedicineBillingKeys.balance(ENC_A),
      ipMedicineBillingKeys.payments(ENC_A),
      ipMedicineBillingKeys.audit(ENC_A),
    ];
    const serialized = slices.map((k) => k.join("|"));
    assert.equal(new Set(serialized).size, slices.length);
  });

  it("disables queries when encounter id is missing or invalid", () => {
    assert.equal(isValidEncounterIdParam(undefined), false);
    assert.equal(isValidEncounterIdParam(""), false);
    assert.equal(isValidEncounterIdParam("not-an-object-id"), false);
    assert.equal(isValidEncounterIdParam(ENC_A), true);
  });
});

describe("ip-medicine-billing mutation invalidation", () => {
  it("invalidates medicine encounter scope and admission invoice/payments", async () => {
    const calls: unknown[][] = [];
    const queryClient = {
      invalidateQueries: async (opts: { queryKey: readonly unknown[] }) => {
        calls.push([...opts.queryKey]);
      },
    };

    await invalidateAfterIpMedicineFinancialMutation(
      queryClient as never,
      ENC_A,
    );

    assert.ok(
      calls.some(
        (key) =>
          key[0] === "ip-medicine-billing" &&
          key[1] === ENC_A,
      ),
    );
    assert.ok(
      calls.some(
        (key) =>
          key[0] === "ip-admission-billing" &&
          key[1] === ENC_A &&
          key[2] === "invoice",
      ),
    );
    assert.ok(
      calls.some(
        (key) =>
          key[0] === "ip-admission-billing" &&
          key[1] === ENC_A &&
          key[2] === "payments",
      ),
    );
  });
});

describe("ip-medicine-billing stable client references", () => {
  it("reuses the same id for the same operation key until reset", () => {
    resetStableClientReferenceIdsForTests();
    const opKey = buildIpMedicineDispenseOperationKey({
      encounterId: ENC_A,
      orderId: ENC_B,
      prescriptionLineId: ENC_A,
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
    assert.ok(first.length >= MIN_CLIENT_REFERENCE_LENGTH);
    assert.ok(first.startsWith("ipm-disp-"));
  });

  it("uses distinct keys per payment client reference", () => {
    resetStableClientReferenceIdsForTests();
    const payRef = "ipm-pay-stable01";
    const keyA = buildIpMedicinePaymentOperationKey({
      encounterId: ENC_A,
      clientReferenceId: payRef,
    });
    const keyB = buildIpMedicinePaymentOperationKey({
      encounterId: ENC_B,
      clientReferenceId: payRef,
    });
    assert.notEqual(keyA, keyB);
  });
});
