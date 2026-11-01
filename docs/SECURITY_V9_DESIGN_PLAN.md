# Security V9-A design and implementation plan
User authorises implementation and push ONLY security/v9-transaction-integrity-qa. Base 5babbe255a26beb330d5db9ca80b03d9dfaa6512.
No deployment, PR, main change, real credentials or spreadsheet calls. Existing QA report and all 55 checks rerun: 41 pass /14 fail. Scope only Bridge backend, tests and docs. Public Reader duplicate-BATAL failure remains explicitly deferred by user lock.

## Design decisions (engineer's choices)
Persistent V9_JOURNAL sheet with exact header REQUEST_ID,FINGERPRINT,STATE,PLAN_JSON,CHECKSUM,RESULT_JSON. No expiry/pruning. Bounded 2000 transactions and plan 40000 characters; capacity exhaustion fails closed before any write. Before use operator must create empty journal in isolated QA; no auto migration writes.
PREPARED immutable plan persisted/flushed/re-read before business writes. Plan contains row-specific before/after for all ACARA/MATA_ACARA/LOG_MATA/KEDUDUKAN writes, original actor/time, stable log keys and response, checksums of unaffected rows. COMMITTED only after every after-image readback and flush. There are no cross-tab atomicity claims.
Recovery validates journal checksum/schema and entire current dataset: every affected row must equal exact before OR after, all unaffected data must match masked digest, and extra rows/duplicate IDs or formulas fail closed. Partial cell-level writes or unexpected edits are ambiguous -> operator investigation; never overwrite unknown data. Replay skips exact after-images and writes only exact before-images. All service write/flush outcomes can throw before or after apply; durable plan survives. New requests and list fail while pending; same request may resume, approved operator can explicitly recover.
request_id global across users; fingerprint binds actor, action, canonical payload and expected revision. Reuse with different actor/body rejected. Stored committed result returned forever, even after legitimate later edits. New request_id required for intentional new operation.
expected_revision is SHA256 of canonical event + score rows, not timestamp alone. Required for edit/cancel, returned by list/save/cancel. Stale writes refused under same ScriptLock. Cancel with new request ID and current revision is a journalled no-op if already BATAL; no duplicate audit. All entrypoints authenticate first.
V9 mutation gate Script Property BRIDGE_V9_ENABLED=true. Old positional cancel and no-request writes rejected with MIGRATION_REQUIRED; UI unchanged. Standalone backend must not be deployed until future coordinated client migration approved.
All four headers, uniqueness, orphans, types, safe text/date, formulas and ranking consistency checked before journal. Ranking written as four rows without clearContent; score replacement updates rows, no addition. Workbook hard pin and auth retained.
Known limitation: unmodified independent Public Reader/direct editor can observe in-flight multi-tab writes; no isolation across scripts and no protection against editor tampering with both journal and data. Journal/checksum is integrity detection, not authentication. Google service semantics and real quotas NOT VERIFIED.

## Tasks (inline; TDD; one final review)
- [ ] 1: Build mock with durable sheet snapshots, restart, before/after injection on all writes & flush, formulas, lock; write V9 regression tests and observe baseline RED. Archive original harness/source/evidence locally; rerun originals unmodified.
- [ ] 2: Implement strict validation/revisions, journal state machine, recovery endpoints and migration gate in gas/bridge/Code.gs. Tests prove 13 in-scope old failures via adapted V9 contract; original Public Reader case remains deferred.
- [ ] 3: Iterate all write boundaries on create/edit/cancel/recovery with process restart, unknown outcomes, corrupt journal, foreign edits, committed retries, actor binding and revision conflicts. Assert all four sheets+journal. Run real Node worker mock concurrency.
- [ ] 4: Documentation for schema, transitions, API migration, recovery, rollback and controlled future deployment. Persist machine-readable results; fresh whole-branch security review; fix findings with tests.
- [ ] 5: Verify allowed-file diff and unchanged main, one QA branch commit via GitHub Git data API with lease; verify remote bytes. No PR or deployment.

## Review focus
Journal corruption and partial row writes; committed marker lost response; stale replay after later commits; quota/capacity fail before writes; recovery after foreign manual data changes. All covered by task 3.
