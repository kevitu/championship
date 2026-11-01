# KEVITU Public Reader — read-only GAS

## Current status (1 November 2026)
- Separate standalone Apps Script project deployed as a Web App, pointing to **KEVITU Championship - DEV QA** via private Script Property `SPREADSHEET_ID`.
- Editor test passed (four houses, zero points, zero eligible events after EVT001 cancellation).
- GitHub Pages DEV dashboard successfully displayed returned values and tie ranking.
- This deployment is **DEV testing only**, even though its read-only output is publicly accessible.

## Contract
- `doGet` supports fixed `callback=kevituPublicCallback`.
- Output contains `kedudukan` (house total, rank, event count) and `acara` (event id, name, date, status); not participant data, editor identities or logs.
- No `doPost` or mutation functions in this dedicated project.

## Safeguards
- Do NOT paste `gas/Code.gs` Admin backend into the Public Reader project.
- Source workbook sharing stays Restricted; Web App execution identity must have read permission.
- Never publish sensitive rows or raw audit logs.
- The GitHub Pages config references a DEV Reader endpoint; switching to LIVE is a separate approved release.

## LIVE cutover preparation — 2026-11-01
- Original LIVE workbook inspected directly: ACARA, MATA_ACARA, KEDUDUKAN and LOG_MATA have expected headers and no score/event records.
- Current GitHub source `gas/public/Code.gs` now verifies exact approved LIVE workbook ID before reads (commit `c421d1f`).
- **NOT deployed yet.** The deployed Reader still reads DEV until operator changes Script Properties, pastes this source and deploys new version.
- Once BOTH Admin and Public Reader reference LIVE, remove DEV labels in GitHub Pages and keep public scores empty/zero until official input.
- Never migrate EVT001/EVT002 test records to official workbook.
