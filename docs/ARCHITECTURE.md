# KEVITU Championship — Architecture V1

## Status
Design baseline, not yet deployed.

## Components
- Public responsive PWA / GitHub Pages: four house standings, event listing, visual identities.
- Admin frontend: enter an event and scores for MERAH, BIRU, HIJAU, KUNING. Access must be enforced server-side.
- Google Apps Script backend: validate input, authenticate Admin, save/edit/cancel event, aggregate standings, append audit log.
- Restricted Google Sheets workbook: existing registration tab (never modified by MVP) plus ACARA, MATA_ACARA, KEDUDUKAN, LOG_MATA.

## Data flow
Admin -> authenticated backend -> ACARA + MATA_ACARA -> recalculate KEDUDUKAN -> dashboard public read.
On score changes: append LOG_MATA (old/new points and editor identity).
Score changes replace previous values; no approval workflow. Oral AJK consent is an operational rule, not an app approval step.

## Security and deployment
- Spreadsheet remains Restricted; never commit its URL/ID or credential to public GitHub.
- Verify Admin identity at backend. The current GAS draft has a known deployment-authentication blocker: do not expose admin writes through public execute-as-owner.
- Google Sheets writes across tabs are not atomic. Add failure recovery/reconciliation before production.
- Development and integration tests must use a separate restricted QA spreadsheet.
- The public dashboard must not expose participant registration data, PINs, admin credentials, or raw audit logs.

## Deployment boundary
Source code in GitHub is not a deployed Apps Script. /dev refers to a GAS test deployment accessible to authorised editors; /exec is a deployed version. Nothing deployed yet.
