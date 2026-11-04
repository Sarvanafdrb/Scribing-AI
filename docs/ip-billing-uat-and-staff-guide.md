# IP admission billing — staff guide & UAT notes

Developer-maintained guide for billing/reception staff using the **IP Admission Billing Desk** in Scribing AI. Test in **staging** with synthetic patients only — never production PHI or real payment data.

## Key concepts

### Live invoice vs finalized snapshot

| | **Live consolidated invoice** | **Finalized discharge snapshot** |
|---|------------------------------|----------------------------------|
| **What it is** | Current financial ledger for the admission | Immutable historical record at finalization time |
| **Updates when** | Every payment, charge, correction, refund | **Never** (by design) |
| **Use for** | Collecting payments, balance due today | Audit, discharge paperwork, legal/finance archive |
| **Where in UI** | “Live consolidated invoice” section | “Finalized discharge snapshot (historical)” |

If the amber **Live invoice differs from finalized snapshot** banner appears, trust **live balance due** for collections. The snapshot is still valid history but outdated relative to the ledger.

**Requires management approval (typical):** Creating an official **statement revision** after finalization (API exists; room rent corrections may auto-create revisions when a snapshot already exists). Escalate to finance/admin if unsure.

### Ledger refunds vs cash payout

- **Refund** rows in the payments activity list adjust **encounter credit / ledger** — they do **not** prove cash was returned to the patient.
- **Treasury** handles physical refunds (cash, UPI reversal, etc.) outside this desk.
- This release does **not** include recording admission refunds from the billing desk UI.

---

## Required permissions

| Action | Permission | Notes |
|--------|------------|--------|
| Search admissions, view desk, invoice, snapshot | `IP_ADMISSION_VIEW` | Also needs `IP_MEDICINE_VIEW` for invoice/finalize API |
| Generate room rent, other charges, cancel charges, finalize snapshot | `IP_ADMISSION_EDIT` | Active admission required for most writes |
| Record admission payments | `IP_ADMISSION_CREATE` | Active admission required |
| View patient name on desk | `PATIENT_VIEW` (typical admin role) | |

API enforces permissions; hiding buttons in the UI is not sufficient for security.

---

## Workflow

### 1. Find an admission

1. Open **IP admission billing** (`/ip-billing`).
2. Search by patient name, patient code, encounter ID, or encounter code.
3. Confirm the row shows the correct **organization** (you only see your org’s data).
4. Click **Open billing**.

### 2. Billing desk overview

- **Admission summary** — patient, encounter, bed allocation, statement status, finalization date, latest revision date (if any).
- **Live invoice** — use **live balance due** and **live credit** for today’s work.
- **Room rent** — generate daily charges; correct errors with reason + client reference.
- **Other charges** — add lines; cancel only with mandatory reason (not if payments allocated).
- **Payments** — split one receipt across multiple charge lines; totals must match payment amount.
- **Discharge statement** — preview (live), then finalize snapshot when finance is ready.

### 3. Room rent

1. Ensure bed allocation exists (clinical admission + catalog bed when used).
2. Click **Generate rent** (idempotent — safe to retry).
3. To correct: **Correct** → reason, client reference (≥8 chars), optional partial amount.
4. Review **Correction audit history**.

### 4. Other charges

1. **Add charge** — description, category, quantity, unit price.
2. **Cancel** — dialog requires reason; cannot cancel if payments already allocated to the line.

### 5. Payments (multiple allocations)

1. **Record payment** — enter amount, method, client reference.
2. Add **allocation lines** — each line picks a charge and amount; sum must equal payment.
3. After success, confirm **live balance due** updated in the header and toast.
4. Re-use the same client reference only for idempotent retry (same payment), not a new payment.

### 6. Discharge statement

1. **Preview statement** — text reflects **current live** ledger.
2. **Finalize snapshot** — creates immutable snapshot; note **finalized** timestamp.
3. After later activity, snapshot text and snapshot balances **stay frozen**; live invoice may change.
4. **Financial revisions** list shows audit revisions (e.g. after room rent correction post-finalize).

### 7. If snapshot and live invoice differ

1. Use **live balance due** for patient collections and internal balance checks.
2. Do not re-finalize expecting the old snapshot to update — it will not.
3. For an updated official statement: follow org policy for **statement revisions** (**management approval**).
4. Document the reason (late payment, correction, etc.) for audit.

---

## Staging UAT role setup

Grant a dedicated test role:

- `IP_ADMISSION_VIEW`, `IP_ADMISSION_EDIT`, `IP_ADMISSION_CREATE`
- `IP_MEDICINE_VIEW` (required for consolidated invoice / finalize)
- `PATIENT_VIEW`, `SESSION_VIEW` as needed

Do not enable production refund test hooks or payout features.

---

## Related docs

- Manual test cases: [ip-billing-uat-checklist.md](./ip-billing-uat-checklist.md)
