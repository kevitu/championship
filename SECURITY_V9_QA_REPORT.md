# SECURITY_V9_QA_REPORT

**Status: QA patch verified in mocks; NOT APPROVED FOR PRODUCTION.**  
Repository: kevitu/championship  
Working branch: security/v9-transaction-integrity-qa  
Base main/QA branch: 5babbe255a26beb330d5db9ca80b03d9dfaa6512  
Date: 1 November 2026 (Malaysia)  
Tested backend SHA-256: 3d239d25d583ba1a606cd3a3a94d2a2cbf3779ed7d1cda2c3ce6289f64e4cf61

## Outcome

| Area | Status | Evidence |
|---|---|---|
| Original 55-check baseline, unchanged harness and source | Reproduced | 41 PASS / 14 FAIL; original worker PASS. |
| V9 backend regression | PASS | 325/325 checks, zero failures. |
| V9 real Node worker concurrency against shared mock Sheets | PASS | 6/6 scenarios. |
| Persistent journal / idempotency / cancel recovery | PASS in mocks | PREPARED → deterministic replay → COMMITTED; retained request result; stable audit IDs. |
| Original Public Reader duplicate-BATAL defect | FAIL — deferred | Public Reader is explicitly locked out of this patch. |
| Actual Google services, deployment permissions, quotas | NOT VERIFIED | No GAS deployment, live calls, tokens or credentials. |
| Compatibility of current V8 frontend with V9 writes | NOT VERIFIED / known migration requirement | Client unchanged; request_id/revision/cancel migration is documented. Do not deploy backend alone. |
| Safety lock | PASS for actions in this task | Only backend, tests/evidence/docs changed on named QA branch; no PR, merge, deployment, production spreadsheet writes or main update. |

Total new V9 checks: **331 PASS, 0 FAIL**. This excludes the historical baseline and does not turn the deferred Public Reader defect into a pass. Tests are scenario assertions, not a numeric security score.

## Source and baseline provenance

SECURITY_QA_FINAL.md, results.json, parallel-results.json and original test code were read from the previous security-qa workspace. The three baseline GAS sources and original harness are preserved under tests/security-v9/baseline. Source fetched afresh from GitHub matches the audited Bridge bytes; both main and the existing QA branch initially pointed at the base SHA above. No AGENTS.md existed in the repository tree or current workspace root.

The original 54-assertion harness was rerun without changing source or assertions, and the original parallel worker test was rerun: 55 total, 41 PASS/14 FAIL. This validates the baseline; it is not represented as a run of the unchanged V8 contract against V9.

The new V9 suite uses the documented request_id/expected_revision contract and recovery invariants. Historical assertions requiring an unchanged spreadsheet immediately after a fault are deliberately not claimed to pass: V9 is forward recovery with a durable journal, not atomic rollback.

## Patch

Only production-path file changed: gas/bridge/Code.gs.

- Persistent V9_JOURNAL; immutable before/after plan and checksum; PREPARED readback before business writes; COMMITTED only after all state/readback checks.
- Recovery rejects malformed journal, foreign edits, partial rows and unexpected formulas rather than guessing.
- Same request/actor/canonical command returns the stored response after restart; conflicting payload, actor or action is refused.
- Revision conflict detection runs under lock. Two Admins cannot both save from the same stale revision.
- Cancel replay and explicit operator recovery finish ranking/audit work without duplicate audit.
- All four business headers and journal validated before prepare. Duplicate event IDs and score keys, orphans and invalid numeric types fail closed.
- No clearContent for ranking; no accumulation on score replacement.
- Committed audit rows and latest event revisions checked to detect deleted audit or later outside modification.
- Server helpers are private underscore-suffixed; five public API entrypoints each authenticate independently. Legacy doPost stays disabled.
- Existing Google Session authentication, whitelist, exact workbook pin and OAuth configuration retained.

Source of truth for schema, transitions, migration, recovery, rollback and future deployment: [SECURITY_V9_TRANSACTIONS.md](docs/SECURITY_V9_TRANSACTIONS.md).

## Original 14 failures — individual disposition

| Original failure | V9 disposition | Executed evidence |
|---|---|---|
| Duplicate active ACARA ID accepted | PASS | duplicate active or BATAL IDs rejected |
| KEDUDUKAN header rejected after writes | PASS | preflight bad header KEDUDUKAN; snapshot/no-write assertion |
| Boolean points accepted | PASS | true and false input tests |
| Array points accepted | PASS | [] and [7] input tests |
| Public Reader duplicate BATAL accepted | FAIL — DEFERRED | Original baseline case still fails; Public Reader unchanged |
| Duplicate create submit creates EVT002 | PASS under V9 request contract | create repeat after restart; duplicate worker create |
| Failure at MATA_ACARA leaves partial commit | PASS for recovery, not atomic rollback | Every create/edit/cancel boundary before/after; named recovery and final-state checks |
| Failure at LOG_MATA leaves marks without logs | PASS for recovery | Stable planned audit rows; interrupted/repeated recovery checks |
| Failure at KEDUDUKAN leaves partial commit | PASS for recovery | Replays stored ranking after-images; all rows checked |
| Retry cannot reconstruct missing audit | PASS | Retry/recovery fault cases and committed audit completeness tests |
| Ranking cleared before failed write | PASS | No ranking clearContent; four planned ranking after-images; recovery checked |
| Stale edit overwrites newer result | PASS | stale two Admins; two-worker stale race |
| Orphan/partly written new event not detected on list | PASS for V9 operations | Pending list/new writes denied; latest committed revision and audit checks |
| Cancel retry returns early with stale ranking | PASS | All cancel and recovery boundaries; duplicate concurrent cancel |

Legacy data predating V9 has no retrospective journal. Unknown old missing logs cannot be reconstructed from current marks. Owner reconciliation remains a release gate.

## Fault injection

The mock emits a boundary on every business/journal setValues/setValue/append/clear and on flush. For each operation and named recovery, the suite throws both before application and after application, reconstructs a fresh VM from persisted sheet state, then retries/reconciles and checks ACARA, MATA_ACARA, KEDUDUKAN, LOG_MATA and V9_JOURNAL.

| Path | Write/flush boundaries | Before + after fault cases |
|---|---:|---:|
| Create | 31 | 62 |
| Edit | 19 | 38 |
| Cancel | 17 | 34 |
| Recovery of create | 27 | 54 |
| Recovery of edit | 15 | 30 |
| Recovery of cancel | 13 | 26 |
| **Total** | **122** | **244** |

Final checks include one event identity, one score per event/house, unique stable log IDs, expected audit count, tied rankings, replacement totals, all journal records COMMITTED and a second replay producing no writes. Where no PREPARED record persisted, retry starts a new plan under the same request ID; no business write occurred before prepare.

Other negative cases: malformed/partial journal row, checksum/result mismatch, formula after-image even with recomputed checksum, ambiguous business row, foreign edits during pending, deleted committed log, outside event rename, duplicate event/score IDs, stale materialised ranking, unknown fields, request-ID conflict, authentication denial, wrong workbook, disabled gate, valid 2,000-record journal capacity, unsafe names/dates/marks and missing migration fields.

RED evidence was captured before implementation: 105 assertions, 49 PASS /56 FAIL on the old backend; fault-discovery paths differ because V8 lacks the V9 API. New checks added during implementation also showed RED for deleted committed audit, outside rename, result binding and unsafe replay before being fixed. This is not a claim of identical test-count comparison.

## Concurrency

Two actual Node workers share a persisted Sheets mock. An Atomics-backed mock LockService serialises source API calls; workers are released through the same start barrier.

| Scenario | Outcome |
|---|---|
| Duplicate create, same request across workers | Both return same result; one event, four points, four logs, one journal. |
| Two independent creates | Unique IDs; two events, eight points, eight logs; totals 20 for MERAH/BIRU. |
| Two Admins edit same revision | One succeeds; one STALE_REVISION; no lost update. |
| Cancel races edit at same revision | One succeeds; one STALE_REVISION. |
| Duplicate cancellation | Same stored response; one cancellation log; zero totals. |
| Client retry races explicit recovery | Both resolve same transaction; no duplicate marks or audit. |

Mock lock semantics are part of the test model. Actual Apps Script waiting, quotas, identity and cross-project coordination remain NOT VERIFIED.

## Severity and remaining risk

No unresolved Critical/High defect was demonstrated in the tested V9 backend paths at the time of final verification. This statement is scoped to mock evidence, not a production security certification.

Open release risks:
1. **High operational risk:** deploying backend alone would reject current V8 frontend writes. Mandatory migration and BRIDGE_V9_ENABLED gate are documented; client is deliberately unchanged.
2. **High integrity limitation:** unmodified independent Public Reader can observe physical intermediate rows during multi-tab work. Admin reads/new writes fail closed, but cross-script read isolation is not provided.
3. **Medium, deferred:** duplicate BATAL detection defect in Public Reader remains.
4. Real Google Sheets coercion/buffering, flush failures, timeouts, runtime limits, journal performance/capacity, deployment and permissions have not been tested. Partial rows that do not match either image intentionally block automatic recovery.
5. Direct editors or other scripts can bypass the protocol. Checksum is not a MAC; an editor able to replace journal and business data can defeat integrity checks. Review access/protected ranges and backups.
6. Journal never expires; 2,000 records/capacity are deliberate fail-closed limits. No unreviewed archive/prune operation exists.
7. Destructive restore to an earlier backup may lose retained request outcomes. Rollback requires coherent all-tab/source/client restore and request reconciliation.
8. Legacy data requires separate reconciliation. This patch does not invent missing historical audit entries.

**9/10 is not claimed.** The patch addresses in-scope transaction defects in mocks. Production rating remains gated by deferred risks, client migration and real-service verification.

## Files and reproducibility

Run with Node.js (built-in modules only; validated runtime recorded in JSON):
~~~powershell
node tests/security-v9/run.cjs
~~~

Runner reproduces the expected failing historical baseline, then runs the new regressions and worker suite. Exit failure means a new V9 failure or unexpected baseline change; historical 14 failures are expected and explicitly reported. Read evidence/summary.json for the separate counts.

Relevant files:
- gas/bridge/Code.gs
- docs/SECURITY_V9_DESIGN_PLAN.md
- docs/SECURITY_V9_PROGRESS.md
- docs/SECURITY_V9_TRANSACTIONS.md
- SECURITY_V9_QA_REPORT.md
- tests/security-v9/mock.cjs, regression.cjs, parallel.cjs, parallel-worker.cjs, run.cjs
- tests/security-v9/baseline/* — immutable original harness and source fixtures
- tests/security-v9/evidence/* — machine-readable baseline/RED/V9 results

The final QA commit SHA and exact changed-file list are recorded in the delivery receipt and GitHub branch. Evidence hashes bind the executed backend; no self-referential commit SHA is fabricated inside its own report.

## Stop condition

Patch, tests and report only. No PR, merge, GAS deploy, OAuth configuration change, UI/PWA/Public Reader change or production write. Further production action awaits a separate review.

## Final review and compatibility notes
Independent reviewer status: **NOT VERIFIED**. Two reviewer sessions failed to obtain local file contents (blocked read tools, subsequently aborted). No independent findings or certification are invented. Primary-agent source review and all executed regression evidence are available; independent review remains a release gate.

Additional RED→GREEN compatibility tests preserve Malaysia calendar dates for legacy Date cells and correct backend fractional ties such as 0.1+0.2 versus 0.3. Public Reader is unchanged and may still disagree on fractional totals because its existing arithmetic is unchanged. This is another explicit Reader release risk.
