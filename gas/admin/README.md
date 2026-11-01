# Admin UI scaffold — DEV only

Status: source files created, **not installed or deployed in GAS**.

- `AdminUi.gs` contains server-side authorization and a **DEV-workbook guard**.
- `Admin.html` is a simple new-event form with four numeric house inputs. It calls server-side `adminCreateEventFromUi` through `google.script.run`.
- No Admin password or spreadsheet ID in the HTML. The server uses private Script Properties from the existing Admin GAS project.

## Deployment gating

The existing `gas/Code.gs` has `doGet` JSON handler. The new `adminDashboardPage` is **not reachable as a web page** until the Admin GAS routing is deliberately changed and the deployment identity/access settings verified. **Do not deploy the current Admin project to Anyone.** Test whether `Session.getActiveUser().getEmail()` identifies actual visitors when using 'Execute as user accessing the web app'; every Admin must have necessary access to the sheet.

Do not paste these files into PUBLIC READ GAS.

Before exposing any interface, test unauthorised account denial, recovery fault cases, and ensure no LIVE workbook is bound to DEV endpoint.
