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

function adminListEventsDev() {
  kevituAdmin_();
  const ss=kevituBook_();
  if(ss.getName()!=='KEVITU Championship - DEV QA')throw new Error('DEV only.');
  const events=kevituRows_(kevituTable_(ss,'ACARA'),7);
  const scores=kevituRows_(kevituTable_(ss,'MATA_ACARA'),5);
  return events.map(r=>{
    const id=String(r[0]).trim();
    const mata={MERAH:null,BIRU:null,HIJAU:null,KUNING:null};
    scores.filter(p=>String(p[0]).trim()===id).forEach(p=>{
      if(Object.prototype.hasOwnProperty.call(mata,String(p[1]).trim()))
        mata[String(p[1]).trim()]=p[2]===''||p[2]===null?null:Number(p[2]);
    });
    const date=r[2] instanceof Date?Utilities.formatDate(r[2],'Asia/Kuala_Lumpur','yyyy-MM-dd'):String(r[2]).slice(0,10);
    return {id_acara:id,nama_acara:String(r[1]),tarikh_acara:date,status:String(r[3]),catatan:String(r[4]||''),mata};
  });
}

function adminEditEventDev(payload) {
  const admin=kevituAdmin_();
  const ss=kevituBook_();
  if(ss.getName()!=='KEVITU Championship - DEV QA')throw new Error('DEV only.');
  if(!payload||!/^EVT\d{3,}$/.test(String(payload.id_acara||'')))throw new Error('ID acara tidak sah.');
  return kevituSaveEvent_(payload,admin);
}

function adminCancelEventDev(id) {
  const admin=kevituAdmin_();
  const ss=kevituBook_();
  if(ss.getName()!=='KEVITU Championship - DEV QA')throw new Error('DEV only.');
  return kevituCancelEvent_({id_acara:String(id||'')},admin);
}
