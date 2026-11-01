/**
 * KEVITU Sports Championship — GAS MVP 1B (STAGING SOURCE ONLY)
 * IMPORTANT: Not deployed. Admin writes require non-empty verified Google email
 * in Script Properties ADMIN_EMAILS, and a deployment with end-user identity.
 */
'use strict';

const KEVITU_HOUSES = Object.freeze(['MERAH','BIRU','HIJAU','KUNING']);
const KEVITU_SHEETS = Object.freeze({
  acara: 'ACARA', mata: 'MATA_ACARA', ranking: 'KEDUDUKAN', audit: 'LOG_MATA'
});
const KEVITU_HEADERS = Object.freeze({
  ACARA: ['ID_ACARA','NAMA_ACARA','TARIKH_ACARA','STATUS','CATATAN','DICIPTA_PADA','DIKEMASKINI_PADA'],
  MATA_ACARA: ['ID_ACARA','RUMAH_SUKAN','MATA','DIKEMASKINI_PADA','DIKEMASKINI_OLEH'],
  KEDUDUKAN: ['RUMAH_SUKAN','JUMLAH_MATA','KEDUDUKAN','JUMLAH_ACARA','DIKEMASKINI_PADA'],
  LOG_MATA: ['ID_LOG','TIMESTAMP','ID_ACARA','RUMAH_SUKAN','MATA_LAMA','MATA_BAHARU','TINDAKAN','ADMIN_ID']
});

function kevituBook_() {
  // Standalone GAS: source workbook ID stays in private Script Properties.
  const id = String(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || '').trim();
  if (!id) throw new Error('SPREADSHEET_ID belum dikonfigurasi.');
  return SpreadsheetApp.openById(id);
}

function kevituTable_(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('Tab sistem tiada: ' + name);
  const expected = KEVITU_HEADERS[name];
  const actual = sheet.getRange(1, 1, 1, expected.length).getDisplayValues()[0].map(v => String(v).trim());
  if (actual.some((v, i) => v !== expected[i])) throw new Error('Header tidak sepadan: ' + name);
  return sheet;
}

function kevituRows_(sheet, width) {
  const count = sheet.getLastRow() - 1;
  return count > 0 ? sheet.getRange(2, 1, count, width).getValues() : [];
}

function kevituAdmin_() {
  const email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  const configured = String(PropertiesService.getScriptProperties().getProperty('ADMIN_EMAILS') || '');
  const permitted = configured.split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
  // Empty/unknown identities always fail closed: never trust user-supplied emails.
  if (!email || !permitted.length || !permitted.includes(email)) {
    throw new Error('Akses Admin tidak dibenarkan.');
  }
  return email;
}

function kevituError_(message) {
  return ContentService.createTextOutput(JSON.stringify({ok:false,error:message}))
    .setMimeType(ContentService.MimeType.JSON);
}

function kevituJson_(data) {
  return ContentService.createTextOutput(JSON.stringify({ok:true,data:data}))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    // Public response contains house totals and event summaries only, no participant data.
    return kevituJson_(kevituDashboard_());
  } catch (err) {
    return kevituError_('Dashboard belum tersedia.');
  }
}

function doPost(e) {
  try {
    // Authorisation BEFORE reading payload or modifying any data.
    const admin = kevituAdmin_();
    if (!e || !e.postData || typeof e.postData.contents !== 'string' ||
        e.postData.contents.length > 20000) throw new Error('Request tidak sah.');
    const payload = JSON.parse(e.postData.contents);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Payload tidak sah.');
    const action = String(payload.action || '');
    if (action === 'save_event') return kevituJson_(kevituSaveEvent_(payload, admin));
    if (action === 'cancel_event') return kevituJson_(kevituCancelEvent_(payload, admin));
    throw new Error('Action tidak sah.');
  } catch (err) {
    return kevituError_('Operasi ditolak: ' + String(err.message || err));
  }
}

function kevituSafeText_(value, label, maxLength) {
  const text = String(value == null ? '' : value).trim().replace(/\s+/g, ' ');
  if (text.length > maxLength || /^[=+@\-]/.test(text) || /[\x00-\x1f]/.test(text)) {
    throw new Error(label + ' tidak selamat atau terlalu panjang.');
  }
  return text;
}

function kevituEventInput_(payload) {
  const name = kevituSafeText_(payload.nama_acara, 'Nama acara', 120);
  if (!name || /[<>]/.test(name)) throw new Error('Nama acara tidak sah.');
  const date = String(payload.tarikh_acara || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      isNaN(new Date(date + 'T00:00:00Z').getTime()) ||
      new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) !== date) throw new Error('Tarikh acara tidak sah.');
  const status = String(payload.status || 'SELESAI').trim().toUpperCase();
  if (!['AKTIF','SELESAI'].includes(status)) throw new Error('Status tidak sah.');
  const notes = kevituSafeText_(payload.catatan, 'Catatan', 500);
  const scores = payload.mata;
  if (!scores || typeof scores !== 'object' || Array.isArray(scores) ||
      Object.keys(scores).length !== KEVITU_HOUSES.length ||
      KEVITU_HOUSES.some(x => !Object.prototype.hasOwnProperty.call(scores, x))) throw new Error('Mata empat rumah diperlukan.');
  const normalized = {};
  KEVITU_HOUSES.forEach(h => {
    const value = scores[h];
    if (value === '' || value === null || value === undefined) {
      normalized[h] = ''; // Unentered is different from official zero.
    } else if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1000000) {
      throw new Error('Mata tidak sah bagi ' + h);
    } else {
      normalized[h] = value;
    }
  });
  return {name, date, status, notes, scores: normalized};
}


/**
 * One pending operation at a time, stored before any sheet writes.
 * Replay is idempotent; audit row keys are stable per operation + house.
 * This is a DEV recovery strategy, not a transactional Google Sheets commit.
 */
const KEVITU_PENDING_KEY = 'PENDING_SCORE_OPERATION';

function kevituApplyPending_(ss, op) {
  const acara = kevituTable_(ss,'ACARA');
  const mata = kevituTable_(ss,'MATA_ACARA');
  const ranking = kevituTable_(ss,'KEDUDUKAN');
  const audit = kevituTable_(ss,'LOG_MATA');
  const eventRows = kevituRows_(acara,7);
  const matches = eventRows.map((r,i)=>({r,row:i+2})).filter(x=>String(x.r[0]).trim()===op.id);
  if(matches.length>1) throw new Error('ID acara pendua; recovery dihentikan.');
  if(op.type==='SAVE') {
    const rec=[op.id,op.name,op.date,op.status,op.notes,new Date(op.created),new Date(op.timestamp)];
    if(matches.length) acara.getRange(matches[0].row,1,1,7).setValues([rec]);
    else acara.appendRow(rec);
  } else {
    if(!matches.length) throw new Error('Acara hendak dibatalkan tidak wujud.');
    acara.getRange(matches[0].row,4).setValue('BATAL');
    acara.getRange(matches[0].row,7).setValue(new Date(op.timestamp));
  }
  const currentScores = kevituRows_(mata,5);
  const seen = new Map();
  currentScores.forEach((r,i)=>{
    const key=String(r[0]).trim()+':'+String(r[1]).trim();
    if(seen.has(key)) throw new Error('Mata pendua; recovery dihentikan.');
    seen.set(key,i+2);
  });
  if(op.type==='SAVE') {
    op.changes.forEach(c=>{
      const key=op.id+':'+c.house;
      const newRow=[op.id,c.house,c.after,new Date(op.timestamp),op.admin];
      if(seen.has(key)) mata.getRange(seen.get(key),1,1,5).setValues([newRow]);
      else mata.appendRow(newRow);
    });
  }
  const existingLogIds=new Set(kevituRows_(audit,8).map(r=>String(r[0])));
  op.changes.forEach(c=>{
    const logId=op.uid+':'+c.house;
    if(!existingLogIds.has(logId)) {
      audit.appendRow([logId,new Date(op.timestamp),op.id,c.house,c.before,c.after,
        op.type==='CANCEL'?'BATAL_ACARA':c.action,op.admin]);
    }
  });
  kevituRecalculate_(acara,mata,ranking,new Date(op.timestamp));
  SpreadsheetApp.flush();
}

function kevituPending_(props) {
  const raw=props.getProperty(KEVITU_PENDING_KEY);
  if(!raw)return null;
  const op=JSON.parse(raw);
  if(!op||!['SAVE','CANCEL'].includes(op.type)||!/^EVT\\d{3,}$/.test(op.id)) {
    throw new Error('Journal rosak; jangan teruskan.');
  }
  return op;
}

/** Manual operator recovery, only after inspecting last failed DEV operation. */
function recoverKevituPendingDev() {
  const admin=kevituAdmin_();
  const lock=LockService.getScriptLock();lock.waitLock(20000);
  try {
    const props=PropertiesService.getScriptProperties();
    const pending=kevituPending_(props);
    if(!pending) {Logger.log('PASS: no pending operation.');return;}
    if(pending.admin!==admin)throw new Error('Journal owned by another Admin.');
    const ss=kevituBook_();
    kevituApplyPending_(ss,pending);
    props.deleteProperty(KEVITU_PENDING_KEY);
    Logger.log('RECOVERED operation '+pending.uid+' on '+ss.getName());
  } finally {lock.releaseLock();}
}

function kevituExecute_(build) {
  const lock=LockService.getScriptLock();lock.waitLock(20000);
  try {
    const props=PropertiesService.getScriptProperties();
    if(kevituPending_(props))throw new Error('Ada operasi belum selesai. Jalankan recoverKevituPendingDev dahulu.');
    const ss=kevituBook_();
    const sheets=['ACARA','MATA_ACARA','KEDUDUKAN','LOG_MATA'].map(n=>kevituTable_(ss,n));
    const events=kevituRows_(sheets[0],7);
    const points=kevituRows_(sheets[1],5);
    kevituAggregate_(events,points);
    const op=build(events,points);
    props.setProperty(KEVITU_PENDING_KEY,JSON.stringify(op));
    kevituApplyPending_(ss,op);
    props.deleteProperty(KEVITU_PENDING_KEY);
    return {id_acara:op.id,changed_houses:op.changes.length,status:op.status||'BATAL'};
  } finally {lock.releaseLock();}
}

function kevituSaveEvent_(payload,admin) {
  const input=kevituEventInput_(payload);
  const requestedId=String(payload.id_acara||'').trim().toUpperCase();
  if(requestedId&&!/^EVT\\d{3,}$/.test(requestedId))throw new Error('ID acara tidak sah.');
  return kevituExecute_((events,points)=>{
    const existing=events.filter(r=>String(r[0]).trim()===requestedId);
    if(existing.length>1)throw new Error('ID acara pendua.');
    if(requestedId&&!existing.length)throw new Error('Acara tidak dijumpai.');
    if(existing.length&&String(existing[0][3]).trim()==='BATAL')throw new Error('Acara batal tidak boleh diedit.');
    const nums=events.map(r=>/^EVT(\\d+)$/.exec(String(r[0]))).filter(Boolean).map(m=>Number(m[1]));
    const id=requestedId||'EVT'+String(Math.max(0,...nums)+1).padStart(3,'0');
    const current=new Map();
    points.filter(r=>String(r[0])===id).forEach(r=>{
      const h=String(r[1]).trim();
      if(current.has(h))throw new Error('Mata pendua bagi '+h);
      current.set(h,r[2]);
    });
    const changes=KEVITU_HOUSES.map(h=>{
      const before=current.has(h)?current.get(h):'';
      const after=input.scores[h];
      const oldVal=before===''||before===null?'':Number(before);
      if(oldVal===after)return null;
      return {house:h,before:before===null?'':before,after,
        action:current.has(h)?'EDIT':'CIPTA'};
    }).filter(Boolean);
    const now=new Date().toISOString();
    return {uid:Utilities.getUuid(),type:'SAVE',id,admin,timestamp:now,
      created:existing.length&&existing[0][5] instanceof Date?
        existing[0][5].toISOString():now,
      name:input.name,date:input.date,status:input.status,notes:input.notes,changes};
  });
}

function kevituCancelEvent_(payload,admin) {
  const id=String(payload.id_acara||'').trim().toUpperCase();
  if(!/^EVT\\d{3,}$/.test(id))throw new Error('ID acara tidak sah.');
  return kevituExecute_((events)=>{
    const matches=events.filter(r=>String(r[0]).trim()===id);
    if(matches.length!==1)throw new Error('ID acara tiada atau pendua.');
    if(String(matches[0][3])==='BATAL')throw new Error('Acara telah dibatalkan.');
    return {uid:Utilities.getUuid(),type:'CANCEL',id,admin,
      timestamp:new Date().toISOString(),
      changes:[{house:'',before:'',after:'',action:'BATAL_ACARA'}]};
  });
}

function kevituAggregate_(events, scores) {
  const valid = new Set();
  events.forEach(row => {
    const id = String(row[0]).trim().toUpperCase();
    const status = String(row[3]).trim().toUpperCase();
    if (id && (status === 'AKTIF' || status === 'SELESAI')) valid.add(id);
  });
  const sums = new Map(KEVITU_HOUSES.map(h=>[h,{house:h,total:0,events:new Set()}]));
  const seen = new Set();
  scores.forEach(row => {
    const id = String(row[0]).trim().toUpperCase();
    const house = String(row[1]).trim().toUpperCase();
    const key = id + ':' + house;
    if (seen.has(key)) throw new Error('Mata pendua: ' + key);
    seen.add(key);
    if (!valid.has(id) || !sums.has(house) || row[2] === '' || row[2] === null) return;
    const n = Number(row[2]);
    if (!Number.isFinite(n) || n < 0) throw new Error('Mata tidak sah.');
    const item = sums.get(house); item.total += n; item.events.add(id);
  });
  const ordered = Array.from(sums.values()).sort((a,b)=>b.total-a.total || a.house.localeCompare(b.house));
  return ordered.map((v,i,all) => ({
    rumah_sukan:v.house, jumlah_mata:v.total,
    kedudukan:1 + all.filter(x=>x.total>v.total).length,
    jumlah_acara:v.events.size
  }));
}

function kevituRecalculate_(acara,mata,ranking,now) {
  const result = kevituAggregate_(kevituRows_(acara,7),kevituRows_(mata,5));
  // Exactly four materialised rows, no extra stale values.
  const existing = ranking.getLastRow() - 1;
  if (existing > 0) ranking.getRange(2,1,existing,5).clearContent();
  ranking.getRange(2,1,4,5).setValues(result.map(r=>[
    r.rumah_sukan,r.jumlah_mata,r.kedudukan,r.jumlah_acara,now
  ]));
  return result;
}

function kevituDashboard_() {
  const ss = kevituBook_();
  const acara = kevituTable_(ss,'ACARA');
  const mata = kevituTable_(ss,'MATA_ACARA');
  const events = kevituRows_(acara,7);
  const rankings = kevituAggregate_(events,kevituRows_(mata,5));
  return {
    kedudukan:rankings,
    acara: events.filter(r=>String(r[3]).trim().toUpperCase()!=='BATAL').map(r=>({
      id_acara:String(r[0]),nama_acara:String(r[1]),tarikh_acara:String(r[2]),status:String(r[3])
    }))
  };
}

/** Run with Script Editor only. No writes. */
function testKevituAggregate_() {
  const events=[['EVT001','','','SELESAI'],['EVT002','','','BATAL']];
  const points=[['EVT001','BIRU',100],['EVT001','MERAH',100],['EVT001','HIJAU',0],['EVT002','KUNING',900]];
  const result=kevituAggregate_(events,points);
  if (result.find(x=>x.rumah_sukan==='BIRU').kedudukan!==1 ||
      result.find(x=>x.rumah_sukan==='MERAH').kedudukan!==1 ||
      result.find(x=>x.rumah_sukan==='KUNING').jumlah_mata!==0 ||
      result.find(x=>x.rumah_sukan==='HIJAU').jumlah_acara!==1) throw new Error('Aggregate FAIL');
  Logger.log('PASS: tied scores, zero scores, cancelled event excluded.');
}

/** Safe configuration check: reads headers only; does not write data. */
function testKevituConnection_() {
  const ss = kevituBook_();
  ['ACARA','MATA_ACARA','KEDUDUKAN','LOG_MATA'].forEach(name => kevituTable_(ss,name));
  Logger.log('PASS: connection to ' + ss.getName() + ' and 4 system headers.');
}

/** DEV only: verify configured Admin without writing any sheet. */
function testKevituAdminAccess() {
  const admin = kevituAdmin_();
  Logger.log('PASS: authorised Admin identity confirmed (' + admin + ').');
}

/** Read-only dry run of the first event. Never saves points. */
function testKevituSavePreflight() {
  const ss = kevituBook_();
  const eventsSheet = kevituTable_(ss,'ACARA');
  const pointsSheet = kevituTable_(ss,'MATA_ACARA');
  kevituTable_(ss,'KEDUDUKAN');
  kevituTable_(ss,'LOG_MATA');
  const events = kevituRows_(eventsSheet,7);
  const points = kevituRows_(pointsSheet,5);
  const input = kevituEventInput_({
    nama_acara:'STRAVA STRIKE 2026 - UJIAN DEV',
    tarikh_acara:'2026-10-31', status:'SELESAI',
    catatan:'DATA UJIAN SAHAJA',
    mata:{MERAH:10,BIRU:20,HIJAU:0,KUNING:15}
  });
  kevituAggregate_(events,points);
  Logger.log('PASS: preflight validated. Events currently: ' + events.length +
    ', score records: ' + points.length + ', test event: ' + input.name + '. NO WRITES.');
}
