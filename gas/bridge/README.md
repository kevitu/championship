# KEVITU Admin Bridge — DEV deployment (2026-11-01)

## Status
- PWA Admin form at `admin.html` is wired to `admin-auth.js` for event listing, saving and cancelling.
- `admin-config.js` intentionally contains **an empty URL**. No write is enabled yet.
- Standalone backend source: `gas/bridge/Code.gs`; it does **not** alter legacy GAS Admin or GAS PUBLIC READ.
- Read-only syntax inspection PASS; **Google deployment and end-to-end auth/POST response not tested**.

## Deploy in DEV, once
1. Create a **new standalone Apps Script project**, e.g. `KEVITU Admin Bridge - DEV`, using the same Google account with edit access to the DEV QA spreadsheet.
2. Paste contents of `gas/bridge/Code.gs` into its `Code.gs`. Do **not** paste into PUBLIC READ or existing Admin.
3. In Project Settings > Script Properties configure:
   - `SPREADSHEET_ID`: existing DEV QA spreadsheet ID.
   - `ADMIN_EMAILS`: explicit comma-separated approved Admin email addresses (currently primary account only).
   - `OAUTH_CLIENT_ID`: the public Web OAuth client ID created in Google Cloud.
4. Deploy > New deployment > Web app, Execute as **Me**, Access **Anyone**, because ID token is independently verified for **every** list/write request. These options would be unsafe with a backend that failed to check tokens.
5. Copy Web app `/exec` URL, not `/dev`; update `window.KEVITU_ADMIN_BRIDGE_URL` in `admin-config.js`. The URL is not a secret. Do not put secrets in GitHub.
6. Refresh GitHub Pages PWA and sign in. Confirm that a server-approved account loads DEV events and that unauthorised credentials are refused. Perform one limited DEV save if login works.

## Security
- Backend independently validates Google signed token through Google's tokeninfo endpoint (for this small DEV integration) and checks token `aud`, `iss`, expiration, verified email and private allowlist. Does not trust browser-selected email.
- Browser makes a normal cross-origin form POST to a hidden iframe. This avoids `fetch()` CORS preflight; server returns `postMessage` restricted to `https://kevitu.github.io` and client also matches frame and request ID. Actual browser behavior for Apps Script HTML sandbox must be checked in DEV before treating the integration as working.
- Never use JSONP for authenticated private responses.
- Existing PUBLIC READ remains publicly readable and read-only, with 60-second cache.
- Backend **hard-locks DEV workbook title**. LIVE cutover requires separate reviewed change.
- The bridge is not an atomic Google Sheets transaction. Mid-write exceptions still require manual inspection/repair. Do not automatically retry unknown writes.
- Client-ID can be public; OAuth client secret must remain private, and is unused by this flow.

## Known limitations
- This is a new bridge, not an invisible deployment; it needs operator configuration.
- Account authorisation and eventual PWA submission have not been verified with a non-Admin account yet.
- No protection guarantees against DDoS or Google quota exhaustion; token verification adds request cost.
- Web app access `Anyone` and `Execute as Me` must **not** be used for the old Admin GAS.
- Do not promote DEV test scores to official results. Dashboard still points to DEV PUBLIC READ.
