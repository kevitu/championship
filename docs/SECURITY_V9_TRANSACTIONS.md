# Security V9-A — Transaction journal, API migration and operational runbook

**QA branch only. Not deployed.** This document is a proposal for a later controlled release, not release approval.

## Storage and invariants

Existing ACARA, MATA_ACARA, KEDUDUKAN and LOG_MATA headers remain unchanged. Provision V9_JOURNAL separately with exactly:

| Column | Meaning |
|---|---|
| REQUEST_ID | Global client-generated ID, 16–80 ASCII alphanumeric/underscore/hyphen; first character alphanumeric. |
| FINGERPRINT | SHA-256 of JSON [authenticated actor, canonical command]. |
| STATE | PREPARED or COMMITTED. |
| PLAN_JSON | Immutable versioned plan: actor, command, row before/after images, unaffected-row digests, stored result. |
| CHECKSUM | SHA-256 of the exact PLAN_JSON string. Detection of corruption; not an authentication signature. |
| RESULT_JSON | Exact JSON result bound inside PLAN_JSON; retained for retry. |

Use a dedicated private journal with the same restricted editors as the authoritative workbook. It contains authenticated actor identifiers and before/after marks; never publish it through Public Reader. Provision at least 2,001 grid rows on each table and six columns on the journal. Source refuses more than 2,000 data rows per table or journal, and a plan over 40,000 characters. It never auto-creates sheets, headers, shares, properties or migrations. Capacity exhaustion fails before mutation.

Journal rows are never expired, pruned or recycled automatically. Do not delete them to bypass limits: permanent request deduplication relies on retention. A future capacity/archive design needs its own review and a persistent global request registry.

## State machine and replay

1. Authenticate via Google Session/private allowlist, verify existing workbook pin, verify BRIDGE_V9_ENABLED=true for mutations/recovery.
2. Canonicalise input and take ScriptLock. Read and validate all four table headers and formula-free data plus the journal.
3. Reusing a request_id with another actor, action, expected revision or canonical payload raises IDEMPOTENCY_CONFLICT. Numerically equivalent input such as 10 and "10" intentionally has the same fingerprint.
4. A different pending request blocks new operations with RECOVERY_REQUIRED. A matching pending request resumes its exact saved plan.
5. For a new request, validate uniqueness, references, ranking, previous committed audit rows, latest committed event revision and expected_revision before any write.
6. Build the complete intended after-state and validate it. Persist PREPARED with stable audit IDs, flush and read it back before writing business data.
7. For every target row, require exact before OR exact after. Hash all unaffected rows and reject additional/missing/changed data. Validate all targets before the first replay write.
8. Skip exact after-images. Write exact before-images to the stored after-image, flush and read back each row. Audit IDs are request_id:HOUSE, request_id:CANCEL or request_id:EVENT. Never generate a new audit identity on recovery.
9. Re-read all four tables, verify final images, uniqueness, ranking and result revision. Persist COMMITTED, flush, re-read the journal, then acknowledge.
10. A lost response after COMMITTED returns the original stored result with no writes. Later legitimate edits do not invalidate a historical retry result; latest state comes from list.

No clearContent is used for ranking: exactly four planned rows are replaced. A save creates four house rows even for unentered marks; blank differs from official zero. Existing event notes and creation timestamp are preserved on edit. A metadata-only save has one SIMPAN_ACARA audit record. A repeated cancellation with a new request and current revision is a journalled no-op without a second cancellation audit.

**This is deterministic forward recovery, not an atomic transaction.** A failure may leave physical business rows partly changed while PREPARED exists. The journal blocks Admin list/new writes until reconciliation. The independent Public Reader is unchanged and can observe an intermediate multi-tab state. Direct spreadsheet editors and other scripts do not share this protocol/lock. These remain release risks.

## Version and input rules

revision is SHA-256 of the canonical event row and four house score rows, including their metadata. Missing legacy score rows are represented explicitly in the hash. Edits and cancellations compare expected_revision under the same lock; one of two concurrent edits based on the same revision loses with STALE_REVISION.

Name must be a string, non-empty after trimming, max 120 characters; control characters, < > and formula-leading = + @ - are rejected before writing. Dates must be valid round-trip YYYY-MM-DD. Marks accept finite numbers 0–1,000,000 or decimal strings of digits with optional fractional digits. Boolean, array, object, NaN, Infinity, hexadecimal and scientific-notation strings are rejected. Empty/null/omitted marks mean unentered, retaining the old optional mark semantics. Negative values are rejected.

All table formula cells are rejected. Journal replay additionally rejects formula-leading after-images before any write, even if someone recomputes a checksum. The checksum cannot protect against an authorised editor rewriting both journal and business data; editor permissions and backups remain essential.

Legacy records pre-dating V9 have no retrospective proof of audit completeness. The validator checks existing uniqueness, references, input safety and ranking, but cannot reconstruct an unknown original operation. The owner must reconcile legacy data before migration. V9 committed transactions additionally enforce all their stored audit after-images and latest event revisions.

## API migration — mandatory future client work

No UI, OAuth, PWA or Public Reader file is changed by this patch. **Do not deploy this backend behind the current V8 frontend.** Old writes deliberately fail closed rather than inventing request IDs on the server.

### apiListKevituEvents()

Same event array and fields, with additive revision:string. Requires the journal to exist; pending operations return RECOVERY_REQUIRED. The call is read-only and takes the lock for a consistent Admin snapshot.

### apiSaveKevituEvent(payload)

Existing fields remain id_acara, nama_acara, tarikh_acara, status, mata_MERAH, mata_BIRU, mata_HIJAU, mata_KUNING.

New required fields:
- request_id: generate once before a logical operation; persist it with that exact payload until the outcome is resolved.
- expected_revision: required for an existing id_acara; from the latest list result. Omit for a new event.

Result: {id_acara, status, revision, request_id}.

### apiCancelKevituEvent(payload)

**Breaking positional change:** apiCancelKevituEvent("EVT001") becomes:
~~~js
apiCancelKevituEvent({
  request_id: "client-generated-unique-id",
  id_acara: "EVT001",
  expected_revision: "64-character-revision-from-list"
});
~~~

Result uses the same four fields. A retry must reuse the same request ID and original expected revision, even if an earlier attempt already changed status. Refresh only after resolving the original result. An intentional later operation uses a new request ID and current revision.

### Recovery and inspection

- apiInspectKevituTransactions(): allowlisted, read-only list of {request_id,state,id_acara}. Does not expose raw plans, actor lists or private spreadsheet configuration.
- apiRecoverKevituTransaction(requestId): allowlisted, gated, locked, bounded to the named immutable plan. Another approved Admin may recover it; original actor/time remain in the audit. This endpoint cannot supply replacement marks or choose a new plan.
- Existing legacy doPost always returns Endpoint disabled. All new helper functions end in underscore.

### Client failure handling

- IDEMPOTENCY_CONFLICT: do not change payload and retry under the same ID. Investigate the original request.
- STALE_REVISION: reload state, show conflict, then create a new logical request if the Admin confirms an edit.
- RECOVERY_REQUIRED: stop new writes; inspect and reconcile pending request.
- JOURNAL_CORRUPT / CONSISTENCY_BLOCKED: stop; preserve evidence. Never auto-retry with a different ID or overwrite unknown state.
- Transport error/unknown response: preserve original ID, payload and revision; retry the same operation or ask an approved operator to inspect it.
- MIGRATION_REQUIRED: client/schema/gate is not ready. Do not fall back to legacy endpoint.

## Operator recovery procedure (future QA first)

1. Pause other writers. Do not edit business rows or journal manually to make an error disappear.
2. Keep a versioned backup of all five tabs together and the deployed source/version mapping. Do not record real tokens or secrets in repository reports.
3. Inspect the named journal record with an approved identity. Preserve source, request ID, state and safe error metadata.
4. If PREPARED and every row matches before/after with unchanged unaffected data, run named recovery. It is safe to repeat the same recovery after another interruption.
5. Confirm COMMITTED, one event ID, one row per house, exact stable audit IDs and four correct ranking rows. Confirm a duplicate retry returns the original response without additional writes.
6. If row data is neither before nor after, there is a partially written row, malformed journal, unexpected formula, duplicate ID or foreign edit: the backend intentionally refuses repair. Restore a coherent verified backup in isolated QA or design a reviewed manual reconciliation. It must not guess which marks are official.
7. Re-enable clients only after a fresh consistency check and owner review.

No rollback API is provided. Forward recovery preserves the audit. For a committed mistake, use a new authorised corrective transaction with current revision; do not rewrite history.

## Rollback / backout

- Before release: keep production untouched; discard/revise this QA branch as needed.
- During future QA: disable BRIDGE_V9_ENABLED to stop writes, keep the journal and all four tabs, inspect/forward-recover pending work before changing source.
- Do not deploy V8 over an unresolved V9 journal: V8 ignores that journal and could duplicate or overwrite data.
- If disaster restoration is necessary, restore all five tabs and the matching source/client protocol together while writers remain disabled. Restoring only a business tab or only the journal invalidates replay/idempotency assumptions.
- A backup restored to an earlier time cannot retain requests committed after that backup by magic. Preserve/reconcile the post-backup request registry and outcomes, or keep writes disabled. Do not claim permanent idempotency across destructive restore without this.
- Any production restoration, code reversion or deployment requires a separate approved operation. None occurred in this task.

## Controlled future deployment checklist — review only

1. Review the QA commit, report, known Public Reader failure and read-isolation limitation.
2. Complete a separately reviewed client migration for request ID persistence, expected revisions and positional cancel change.
3. Prepare a standalone GAS QA project and QA workbook with all five exact headers and adequate grid sizes. The source retains its existing exact workbook pin: a QA build must use an explicitly reviewed QA-only pin; never point testing at the official workbook.
4. Owner verifies deployment identity, private whitelist, authorised scopes, journal access, direct editors and every competing legacy writer. OAuth configuration was not changed here.
5. Deploy only to approved QA after separate authorisation, and test actual Google service behaviour, dates/formats, readback, flush, runtime/row limits and quota failures. Mock results do not verify those.
6. Test all authenticated negative cases with approved synthetic QA identities. No real credentials or tokens are needed in test fixtures or reports.
7. Reconcile/backup official legacy data before any later release decision. Plan a maintenance window and Public Reader consistency strategy; this backend patch does not isolate public reads.
8. Record source hash → immutable GAS version → deployment → client version, then obtain production release approval. Do not copy the patch into LIVE as part of this work.

## Official platform references consulted

- [Properties Service](https://developers.google.com/apps-script/guides/properties): persistent script-wide properties differ from cache; this design uses a sheet journal for retained operation data.
- [Apps Script quotas](https://developers.google.com/apps-script/guides/services/quotas): quotas/limits can raise exceptions; Google runtime and quota profiling remain unverified.
- [Lock](https://developers.google.com/apps-script/reference/lock/lock): mutual exclusion controls cooperating executions.
- [SpreadsheetApp.flush](https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet-app#flush()): flush applies pending spreadsheet changes; it is not used as a claim of multi-tab atomic commit.

## Compatibility notes from final regression
Legacy ACARA Date cells are normalised with Asia/Kuala_Lumpur to preserve their calendar date. Backend totals add canonical decimal representations before one Number conversion, preventing 0.1+0.2 from outranking 0.3. This adds no decimal-precision input restriction. The unchanged Public Reader still sums with ordinary binary Number arithmetic, so fractional-score ranking agreement needs a separate Reader review before release.
