# KEVITU Security V9-B — Integration Hardening (QA ONLY)

**Branch:** `security/v9-transaction-integrity-qa`. **Production:** V8 LIVE remains untouched.  
**Baseline V9-A:** `4234353c947f7c5f8a1527618345b5e16bdfe7f6`; 331 mock PASS, no independent real-service verification.

## Scope

1. **Admin frontend `admin-auth.js`:** adopt V9 contract for `apiSaveKevituEvent` and `apiCancelKevituEvent`:
   - Generate unique `request_id` once per logical submission; preserve immutable payload and ID across uncertain response/retry.
   - Send `expected_revision` from last verified list for edit/cancel.
   - Cancel accepts a payload object, not positional ID.
   - Explicit stale conflict, recovery-required, unknown outcome UX; NEVER silently create a new ID on retry.
   - Clear pending submission only after confirmed matching result; prevent changes to its immutable request while unresolved.
   - Do not persist OAuth access tokens or secrets; only nonsecret operation metadata if needed. Authorisation stays backend enforced.
   - Respect mobile/desktop and current UI; no dashboard redesign.

2. **Public Reader `gas/public/Code.gs`:**
   - Fail closed on duplicate event ID including `BATAL`.
   - Make fractional summation/tie behaviour identical to backend V9.
   - Prevent public publication of physical intermediate writes from V9 `PREPARED` transactions. An independent GAS project cannot share ScriptLock with Admin Bridge. Design an evidence-backed coherent publication protocol; do not pretend independent locks guarantee consistency.
   - Strictly read-only; no personal records; cache and last-known-good policy require explicit integrity/freshness semantics.
   - If robust consistency requires a new snapshot/publish tab, declare schema, migration, read/write ownership and QA plan; never auto-create in LIVE.

3. **QA:** use mock/isolated QA only. Test end-to-end login-denied, list/revision, save/create, retry after lost response, cancel, conflict, recovery, public stale/partial transaction isolation, duplicate `BATAL`, decimal ties, smartphone UI errors. Simulate network failure and reload.
4. **Independent review:** separate reviewer reads exact new files, checks spec and runs suite. Mark NOT VERIFIED if not possible.
5. **Release documentation:** reconcile legacy LIVE data; explicit `V9_JOURNAL` creation and protection, `BRIDGE_V9_ENABLED` gate, publication mechanism, coordinated frontend/reader/backend cutover, rollback and failure stop criteria.

## Safety LOCK
- Changes only on this QA branch. No `main` changes, PR, merge, deployments, production GAS/Sheets writes, OAuth sharing edits or live mutative tests.
- Reuse existing 331 mocks; no false claim that passing mocks certifies production.
- Account for standalone Public Reader's independent locking and unauthorised direct spreadsheet editors.
- Publish report `SECURITY_V9B_QA_REPORT.md` with PASS/FAIL/NOT VERIFIED and actual evidence; do not declare 9/10.
- Stop after QA patch/report; await owner release approval.
