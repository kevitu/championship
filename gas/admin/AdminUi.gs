/**
 * DEV ADMIN UI — server handlers (paste alongside gas/Code.gs in ADMIN DEV ONLY).
 * Do not deploy to Anyone, and do not add this to the Public Reader project.
 * Script file: AdminUi.gs; template file: Admin.html.
 */
function adminCreateEventFromUi(payload) {
  const admin = kevituAdmin_(); // verify real Google identity on server
  const ss = kevituBook_();
  if (ss.getName() !== 'KEVITU Championship - DEV QA') {
    throw new Error('STOP: Admin UI is locked to DEV workbook');
  }
  if (payload && Object.prototype.hasOwnProperty.call(payload,'id_acara'))
    throw new Error('Event editing not enabled by this UI.');
  return kevituSaveEvent_(payload, admin);
}
function adminDashboardPage() {
  kevituAdmin_();
  const ss=kevituBook_();
  if (ss.getName() !== 'KEVITU Championship - DEV QA') throw new Error('DEV only.');
  return HtmlService.createHtmlOutputFromFile('Admin').setTitle('KEVITU Championship - Admin DEV');
}
