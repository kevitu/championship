# Security Review — 2026-11-01 — KEVITU Championship
**Status: FAIL FOR LIVE / DEV ONLY.** Static code inspection + limited pure JS check; no penetration test, no credential tests, no network flooding or live mutations performed.

## Scope
- `index.html`, `app.js`, `public-config.js`
- `gas/public/Code.gs`
- `gas/Code.gs`
- `gas/admin/AdminUi.gs` and `gas/admin/Admin.html`
- Deployment configuration for Admin is **reported from user screenshot**: Execute as user accessing; Only myself. Public Reader is public and read-only per source/user testing.
- Does not verify current GAS editor bytes, permissions of deployed versions, Google account security, trigger list, or deployment logs.

## Findings

### HIGH — GitHub source and running GAS code may differ; faulty ID regex in repository
In `gas/Code.gs`, regular expression literals include `/^EVT\\\\d{3,}$/` and `/^EVT(\\\\d+)$/` (two literal backslashes before d). A JS syntax/runtime spot-check demonstrates `/^EVT\\\\d{3,}$/` does **not** match `EVT002`. This affects pending journal validation, save/edit/cancel ID handling and event ID extraction. The successful manual UI edit suggests the deployed editor code might not match the current GitHub file. Reconcile exact code and tests before copying or deploying.

### HIGH — Recovery journal is unverified under failure conditions
`kevituExecute_` uses a script-property pending journal and `LockService`. This is not an atomic transaction across spreadsheet tabs. A mid-operation failure could leave partial writes/partially updated ranking; recovery must be tested in isolated DEV, including idempotency, journal validation, missing/duplicate rows and audit behavior. The faulty regex currently blocks pending recovery with ordinary IDs.

### HIGH — Public Reader availability/abuse risk
Public `doGet` re-reads all event and scoring rows from Google Sheets each request. Any caller can repeat requests; this may exhaust Apps Script quotas or affect public availability, though it cannot modify scores through the dedicated source. Cache the aggregate snapshot, bound read sizes, and apply platform-level monitoring/protective measures. Rate limiting in Apps Script alone cannot reliably identify spoof-resistant client IP.

### MEDIUM — Public JSONP
`gas/public/Code.gs` emits JavaScript in `ContentService.MimeType.JAVASCRIPT` with fixed callback `kevituPublicCallback`. It must never return private data. Google explicitly warns JSONP is executable and can be embedded from external origins. The current code returns public aggregate and event fields only. Avoid broadening output and consider a proxy/JSON alternative if requirements grow.

### MEDIUM — Admin callable surface and authentication
Apps Script HTML `google.script.run` can call top-level server functions without an underscore suffix. Main mutating functions end in underscore, and public handlers `adminCreateEventFromUi`, `adminEditEventDev`, `adminCancelEventDev` call `kevituAdmin_`. Good. However `recoverKevituPendingDev`, `testKevituAdminAccess`, and `testKevituSavePreflight` are also exposed by name; restrict non-UI helpers to private suffix and test non-admin denial. The Admin deployment is restricted to Only myself according to screenshot; changing to Anyone without redesign is prohibited.

### MEDIUM — Input integrity and replay
Names/notes have length checks, formula-leading-character guard; dashboard renders textContent, reducing XSS risk. Edit endpoint has no explicit optimistic version check; concurrent clients are serialised under script lock but stale Admin forms can overwrite recent edits. Add version/last-updated compare or make overwrites explicit. Empty and zero handling needs regression tests.

### LOW — Public repo exposure and UI accuracy
`public-config.js` contains the public read-only Web App URL (not inherently secret); previous Git history included a Restricted workbook URL, which remains in history. Restrict access remains essential. Dashboard text still says 'API rasmi' in footer despite DEV mode. No credentials should be committed. Five publicly uploaded logos are expected public assets.

## Must-fix gates before LIVE
1. Reconcile **exact** deployed GAS editor contents with GitHub; correct regex and verify with automated positive/negative ID tests.
2. Confirm that no Admin deployed version allows Anyone or Execute-as-owner while accepting writes. Verify negative permission test with a non-Admin account.
3. Test interrupted-write recovery and rollback/reconciliation in DEV; do not promise atomicity.
4. Add caching/load limits for public reader and operational monitoring (errors, quotas).
5. Restrict callable public server functions, monitor logging, minimise OAuth scopes.
6. Run regression tests: create/edit/cancel, ties, blank vs zero, duplicate ID, formula injection, logs, replay/recovery.
7. Require explicit release approval before switching Public Reader from DEV to LIVE.

## Bottom line
Brute-force password guessing **is not the main threat** because no custom password/PIN login currently exists in this architecture. Account access, misuse/availability, source drift and recovery consistency are the more important risks. No application can be guaranteed 'no mistakes' from a static review alone.

## Primary platform references
- https://developers.google.com/apps-script/guides/html/communication
- https://developers.google.com/apps-script/guides/web
- https://developers.google.com/apps-script/guides/content

## Hardening progress — same day
- GitHub commit `42f7051`: corrected 4 faulty event-ID regular-expression literals in `gas/Code.gs`; included a read-only regression check `testKevituIdRegex_`.
- JavaScript syntax checked. **Not yet installed in running GAS DEV**. Because the running script already has customised routing and test code, do not wholesale overwrite its `Code.gs` from GitHub.
- First gate now: reconcile current GAS editor code against the repository (especially `doGet`, `doPost`, journal, event regex and Admin handlers), then deploy a tested aligned version.
- Outstanding: user identity denial test, recovery fault test, public-reader caching/quotas, stale edit controls.
