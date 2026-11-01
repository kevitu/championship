# KEVITU Championship — Architecture V1.1

## Environment

| Komponen | DEV | LIVE |
|---|---|---|
| Workbook | KEVITU Championship - DEV QA | Daftar Rumah Sukan Kevitu (Restricted) |
| GAS Admin backend | standalone, tested by editor functions | not deployed |
| GAS Public Reader | separate, public read-only Web App, points to DEV QA | not configured |
| Static dashboard | GitHub Pages showing **MOD UJIAN DEV** | official data not yet enabled |

## Flow

```text
Google Sheets DEV QA (ACARA + MATA_ACARA)
         |
  GAS Public Reader (doGet only)
         |
    GitHub Pages (JSONP callback)
         |
  Leaderboard 4 houses + events
```

For **score writes**, a different GAS Admin backend validates inputs/identity, writes event+house scores, logs changes, recalculates standings and maintains a recovery journal.

## Security boundaries

- Only a dedicated **read-only** GAS project may be public. Do not merge Admin `doPost` into that public deployment.
- Google Sheets remains Restricted; Public Reader executes under a Google account authorised to read, returns aggregate scores and safe event summaries only.
- Public frontend never ships credentials, spreadsheet ID, participant records or log identities.
- `public-config.js` points to **DEV Public Reader**; it must not be mistaken for official data.
- GAS Admin currently has auth design that needs deployment-specific review; editor-based Admin PASS is insufficient for public network use.
- JSONP callback is fixed; public endpoint may execute JavaScript in browser, so it is only appropriate for public non-sensitive data and must be operated with care.
- Google Sheets multi-tab writes are not atomic; journal recovery has not been fault-injection tested.
- No LIVE spreadsheet writes or LIVE GAS deployment have been carried out during Championship development.

## Locked data model

`ACARA`, `MATA_ACARA`, `KEDUDUKAN`, `LOG_MATA`; legacy `Form Responses 1` belongs to registration, not the scoring backend.

## Next step: Admin UI

Build Admin functionality within an identity-aware Google Apps Script experience. Do not use a public GitHub Pages form to POST to execute-as-owner Admin Web App. Test rejection for non-Admin before enabling writes outside the Editor.
