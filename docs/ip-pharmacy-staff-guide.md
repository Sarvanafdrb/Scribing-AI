# IP Pharmacy — staff guide

Guide for pharmacy staff using the **IP Pharmacy Desk** in Scribing AI web app. Use **staging** for training; use production only after your organization completes the [IP Pharmacy UAT checklist](./ip-pharmacy-uat-checklist.md).

## What this desk is

- **Inpatient medicine ledger** for one admission at a time: orders, dispensing, charges, payments, returns, refunds, balance, and audit.
- **Not** OP pharmacy, **not** full admission billing (room rent, discharge statement) — those stay on **IP admission billing** (`/ip-billing`).
- **Accounting authority** is always the server. The desk displays GET `/balance` and related APIs; it does not recalculate authoritative totals in the browser.

## Return vs refund (important)

| Action | What it does | Permission | Cash to patient? |
|--------|----------------|------------|------------------|
| **Return** | Creates a **return adjustment** (negative medicine charge) | `IP_MEDICINE_EDIT` | No |
| **Refund** | Records a **ledger refund** linked to a return adjustment | `IP_MEDICINE_CREATE` | Records payout method in ledger; **treasury** still handles real money movement |

After a return, the system may suggest how much *could* be refunded based on what was paid — you must still use **Refund** separately if policy requires paying credit out.

## Permissions

| Action | Permission |
|--------|------------|
| Search admissions, open desk, view all sections | `IP_MEDICINE_VIEW` |
| Dispense, record returns | `IP_MEDICINE_EDIT` |
| Record medicine payments and refunds | `IP_MEDICINE_CREATE` |

You **do not** need `IP_ADMISSION_VIEW` for the pharmacy desk. Users with only admission billing access cannot open `/ip-pharmacy` without `IP_MEDICINE_VIEW`.

## Workflow summary

### Find patient

1. Open **IP Pharmacy** (`/ip-pharmacy`).
2. Search by patient name, patient code, or encounter ID.
3. Open the correct admission (including **discharged** for read-only history).

### Dispense

1. On **Medicine orders**, click **Dispense** on a line with remaining quantity.
2. Enter whole-number quantity ≤ remaining.
3. Confirm — a **confirmed dispense** creates a **dispense charge** (partial qty allowed).
4. If the network fails after submit, **retry with the same attempt** (same client reference is kept until success).

### Pay

1. When unpaid **dispense** charges exist, use **Record payment** (payments section or dialog).
2. Allocate amounts to one or more dispense charges; total must match payment amount.
3. Methods: cash, UPI, card, other (per backend contract).

### Return

1. On **Medicine charges**, **Return** on a dispense charge row (active admission only).
2. Enter return quantity ≤ returnable; optional notes.
3. Creates a **return adjustment** row (separate from dispense charge).

### Refund

1. On a **return adjustment** row, **Refund** when enabled.
2. Requires loaded **balance** and **audit** refund history (limits come from server data).
3. Enter amount ≤ shown maximum (return cap and encounter credit).
4. Choose method; optional reason.

### Verify

- **Medicine balance** — authoritative totals from API.
- **Audit history** — combined timeline.
- For **whole-admission** totals (medicine + room rent + other), finance uses **IP admission billing** consolidated invoice.

## Discharged admissions

- You can **view** orders, charges, payments, returns, refunds, balance, and audit.
- **Dispense, return, payment, and refund** are disabled (backend also rejects writes).

## Idempotency and duplicate clicks

- Each dialog keeps a stable **client reference** for one logical attempt until success.
- Do not start a **new** payment/return/refund for the same receipt until the previous attempt succeeded or you intentionally cancelled and reopened the dialog.
- Double-click protection: buttons disable while a request is in flight.

## API reference (for support / IT)

Base path: `/api/ip-medicine/encounters/:encounterId/ip-medicine/…`

| Operation | Method | Path |
|-----------|--------|------|
| Pharmacy search | GET | `/api/ip-medicine/encounters` |
| Orders | GET | `…/orders` |
| Dispense | POST | `…/dispenses` |
| Charges | GET | `…/charges` |
| Balance | GET | `…/balance` |
| Payments | GET/POST | `…/payments` |
| Return | POST | `…/returns` |
| Refund | POST | `…/refunds` |
| Audit | GET | `…/audit` |

## Known limitations

- **Fail payment** HTTP route: `markIpMedicinePaymentFailed` exists in the service layer but there is **no** public `POST …/payments/fail` route in this release. Pending payment recovery is an operational/backend concern; not exposed in pharmacy UI.
- **Mobile app**: no IP Pharmacy desk in mobile; web only.
- **HTTP integration tests**: medicine billing is covered by **service-level** integration tests in the API repo, not supertest route tests.
- **Production readiness** requires completing staging UAT — automated tests alone are insufficient.

## Related documents

- [IP Pharmacy UAT checklist](./ip-pharmacy-uat-checklist.md)
- [IP admission billing staff guide](./ip-billing-uat-and-staff-guide.md) (consolidated invoice cross-check)
