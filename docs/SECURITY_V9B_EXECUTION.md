# V9-B execution decisions and ledger
Spec: docs/SECURITY_V9B_INTEGRATION_PLAN.md at 4093aaf33a2317359079a0e72f0709d1d7ee783a.
Workspace is an isolated QA snapshot tied to security/v9-transaction-integrity-qa. Only that ref may be updated with an expected-head lease. No LIVE calls or credentials.

Baseline read and rerun: V9-A 331/331 PASS (325 regression +6 worker scenarios); old historical55 reproduced41PASS/14FAIL.

## Engineering decisions
- Immutable V9_PUBLIC_SNAPSHOTS rows (SNAPSHOT_JSON) and singleton V9_PUBLIC_POINTER (POINTER_JSON); operator provisions headers/rows, never auto-create.
- Signed descriptor HMAC-SHA256 binds schema, pinned workbook scope, row, SHA256, committed generation, publication/expiry timestamps. Shared private PUBLIC_SNAPSHOT_HMAC_KEY must be installed later by owner; all fixture keys are synthetic. This changes no OAuth config.
- Generation counts COMMITTED records, excludes PREPARED and terminal CLOSED tombstones. Publish only with no PREPARED. New business writes/list block on unpublished committed generation; matching retry/recovery completes publication.
- Candidate JSON is deterministic per committed state. Exact immutable row reused on retry. Pointer applied-then-error is recognised via readback; successful matching pointer is not refreshed during retry. Explicit authenticated publish may refresh an expired heartbeat.
- Reader never reads ACARA/MATA_ACARA/KEDUDUKAN/LOG_MATA/journal and never uses Bridge's lock. It authenticates both exact pointer reads and the snapshot, validates uniqueness including BATAL and recomputes backend-identical decimal totals. It returns prior signed coherent snapshot during physical writes.
- Cache60s, enforce signed24h expiry on every cache hit. No fallback to live tables, invalid signature or expired cache. Valid older signed snapshot within expiry is bounded stale, not latest-state proof. Signing-key compromise or authorised script editors remain outside checksum guarantees.
- Frontend Web Locks (nonwaiting) + durable localStorage metadata scoped by backend actor/scope hashes, no tokens persisted. Unsupported/failed storage/locks fails closed. Immutable pending survives logout/reload; user must authenticate again.
- Safe explicit abandonment uses a backend CLOSED tombstone with original actor/command fingerprint. If original already started, close finishes/returns it instead. A late original request then returns the same terminal result and cannot create another event. Never clear an uncertain request merely on NOT_FOUND.
- Existing 331 assertions retained; mock provisioning adds snapshot fixtures and synthetic HMAC. Dynamic all-boundary fault loops expand naturally after new publication boundaries.
- Independent reviewer read actual spec/source, reviewed b5f3949 and final a65d552; 13 initial plus14 final-delta checks PASS. Full independent suite and real services NOT VERIFIED.

## Tasks
[x] Publication + closure backend tests RED, implement, GREEN.
[x] Read-only signed Reader, duplicate/BATAL/decimal/expiry/tamper/physical-isolation tests.
[x] Frontend persistent identity/revision/retry/close/logout/storage failure/mobile DOM integration tests.
[x] Whole baseline/concurrency/recovery suite, exact-file independent review, docs/report.
[x] QA-only commit, remote byte/hash verification and unchanged main.

Implemented: signed persistent journal plans, signed publication source-state commitment, deterministic publication after COMMITTED; terminal CLOSED excludes generation; Counts are recorded in machine evidence. Actual local Chromium390/1280 retry/reload tested with synthetic OAuth; server stopped and browser overrides/tabs cleaned.
Minimal app.js change: publication provenance/freshness required, actual snapshot timestamp shown and fractional final counter preserved; no dashboard redesign.

Final hardening: functions ending underscore are not treated as an Execution API security boundary. All helpers (including key/config/signing) are lexical closure locals; only explicit API wrappers and safe Reader handlers are global. Source-level RED at b5f3949 reproduced, then closure fix GREEN. Native browser390/1280 network-drop/reload/retry repeated on closure-protected source; one event/four audit records remain.

Reconnect completion: QA HEAD a65d552 and main5babbe2 verified. No completed suite rerun. Evidence counts/coverage/source hashes/remote blobs checked PASS;31 test/evidence files and five core files matched. Independent evidence persisted; final report and migration/deployment/rollback runbook completed. Final documentation commit and unchanged-main verification are identified in delivery receipt. No source change after reviewed code candidate.
QA branch advanced concurrently to9d71707 (four PNG logos only). Documentation rebuilt on that exact head; image additions preserved, no force push or merge. Code candidate/test hashes unchanged.
