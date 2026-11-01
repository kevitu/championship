# KEVITU Public Reader — standalone, read-only

**Not deployed.** This separate Apps Script project must contain **only** `Code.gs` in this folder. Never include Admin `doPost` or score mutation helpers.

1. Create a separate standalone Apps Script project (e.g. `KEVITU Championship - PUBLIC READ`).
2. Copy this file into it. Configure Script Property `SPREADSHEET_ID` for the workbook intended for public scoreboard publication.
3. The script's Google account requires read access; the spreadsheet itself stays Restricted.
4. Audit outputs: public score totals and safe event summaries only. No participant records, Editor identities, or audit logs.
5. Review the security and privacy boundary before deploying as a web app (execute as deployer, access Anyone only for this reader). Do not use DEV QA dummy points as official results.
6. After authorised deployment, configure `public-config.js` in the static site with the reader's `/exec` URL and verify on desktop/mobile.

The dashboard uses a fixed JSONP callback solely because Apps Script ContentService cross-origin fetches may be restricted. This endpoint **must contain public data only**.
