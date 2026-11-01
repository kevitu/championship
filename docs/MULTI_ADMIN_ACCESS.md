# KEVITU Multi-Admin — locked design (2026-11-01)

## User requirement
- One GitHub Pages PWA contains leaderboard and `admin.html`.
- Current primary Admin account: `kelabveterinaritu@gmail.com`.
- Allow additional explicitly approved Gmail or `@dvs.gov.my` accounts in the future.
- **Never automatically authorise all `@dvs.gov.my` accounts.**
- No PIN-only authentication, no secrets or Admin whitelist in public frontend source.
- Public scoreboard stays read-only.

## Existing backend
`gas/Code.gs` already checks `ADMIN_EMAILS` Script Property as a comma-separated, case-normalised allowlist via `kevituAdmin_()`. Server-side Admin handler functions call this helper. This applies to Apps Script's Google session identity, not automatically to identity tokens posted from a GitHub Pages origin.

## GitHub Pages integration — NOT YET IMPLEMENTED
1. Configure a Google OAuth web client for the GitHub Pages origin and identity provider. Authenticate the person in `admin.html`.
2. On each write request, the **backend** verifies Google's signed ID token: signature, issuer, audience, expiry and email verification; match the verified email to the private allowlist. Never trust a client-supplied email, domain, flag, or browser session alone.
3. Only then permit create/edit/cancel with validations, lock and audit. Design the cross-origin call/bridge specifically for Google Apps Script restrictions before enabling writes; direct POST remains disabled until a verified and tested endpoint is ready.
4. Keep `ADMIN_EMAILS` in private Script Properties, add/remove addresses using administrative configuration and record changes. Existing owner-only GAS Web App settings may need changing for multi-user use after access testing, not prematurely.
5. AJK users may see Admin link, but unauthorised users cannot access Admin operations.

## Release status
UI route is present at `admin.html`, but controls are intentionally disabled. Multi-Admin *policy* is documented, not yet a functioning Google Sign-In flow. Do not claim production-ready or enable writes before backend token validation and an unauthorised-user check.
