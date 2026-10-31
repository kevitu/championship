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
  // No spreadsheet ID/URL stored in public repository.
  // Install this script as a bound project in the restricted master spreadsheet.
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Spreadsheet bound tidak tersedia.');
  return ss;
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

function kevituSaveEvent_(payload, admin) {
  const input = kevituEventInput_(payload);
  const requestedId = String(payload.id_acara || '').trim().toUpperCase();
  if (requestedId && !/^EVT\d{3,}$/.test(requestedId)) throw new Error('ID acara tidak sah.');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = kevituBook_();
    const acara = kevituTable_(ss, KEVITU_SHEETS.acara);
    const mata = kevituTable_(ss, KEVITU_SHEETS.mata);
    const ranking = kevituTable_(ss, KEVITU_SHEETS.ranking);
    const audit = kevituTable_(ss, KEVITU_SHEETS.audit);
    const events = kevituRows_(acara, 7);
    const scores = kevituRows_(mata, 5);
    const now = new Date();
    let id = requestedId;
    let rowIndex = events.findIndex(row => String(row[0]).trim().toUpperCase() === id);
    if (id && rowIndex < 0) throw new Error('Acara tidak dijumpai.');
    if (!id) {
      const numbers = events.map(row => /^EVT(\d+)$/.exec(String(row[0]).trim())).filter(Boolean).map(m => Number(m[1]));
      id = 'EVT' + String(Math.max(0, ...numbers) + 1).padStart(3,'0');
    }
    const stored = new Map();
    scores.forEach((row, i) => {
      const key = String(row[0]).trim().toUpperCase() + ':' + String(row[1]).trim().toUpperCase();
      if (stored.has(key)) throw new Error('Rekod mata pendua ditemui: ' + key);
      stored.set(key, {row: i + 2, value: row[2]});
    });
    // Validate target shape before any write.
    const updates = KEVITU_HOUSES.map(h => ({house:h, prior:stored.get(id + ':' + h), score:input.scores[h]}));
    if (rowIndex >= 0) {
      const existing = events[rowIndex];
      if (String(existing[3]).trim().toUpperCase() === 'BATAL') throw new Error('Acara BATAL tidak boleh diubah.');
      acara.getRange(rowIndex + 2, 2, 1, 4).setValues([[input.name,input.date,input.status,input.notes]]);
      acara.getRange(rowIndex + 2, 7).setValue(now);
    } else {
      acara.appendRow([id,input.name,input.date,input.status,input.notes,now,now]);
    }
    const changed = [];
    updates.forEach(u => {
      const old = u.prior ? u.prior.value : '';
      const equal = (old === '' || old === null ? '' : Number(old)) === u.score;
      if (equal) return;
      if (u.prior) mata.getRange(u.prior.row, 3, 1, 3).setValues([[u.score,now,admin]]);
      else mata.appendRow([id,u.house,u.score,now,admin]);
      changed.push([Utilities.getUuid(),now,id,u.house,old,u.score,u.prior ? 'EDIT' : 'CIPTA',admin]);
    });
    if (changed.length) audit.getRange(audit.getLastRow()+1,1,changed.length,8).setValues(changed);
    kevituRecalculate_(acara,mata,ranking,now);
    return {id_acara:id, changed_houses:changed.length};
  } finally {
    lock.releaseLock();
  }
}

function kevituCancelEvent_(payload, admin) {
  const id = String(payload.id_acara || '').trim().toUpperCase();
  if (!/^EVT\d{3,}$/.test(id)) throw new Error('ID acara tidak sah.');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = kevituBook_();
    const acara = kevituTable_(ss,'ACARA');
    const mata = kevituTable_(ss,'MATA_ACARA');
    const ranking = kevituTable_(ss,'KEDUDUKAN');
    const audit = kevituTable_(ss,'LOG_MATA');
    const events = kevituRows_(acara,7);
    const index = events.findIndex(row => String(row[0]).trim().toUpperCase() === id);
    if (index < 0) throw new Error('Acara tidak dijumpai.');
    if (String(events[index][3]).trim().toUpperCase() === 'BATAL') return {id_acara:id,status:'BATAL'};
    const now = new Date();
    acara.getRange(index+2,4).setValue('BATAL');
    acara.getRange(index+2,7).setValue(now);
    audit.appendRow([Utilities.getUuid(),now,id,'','','','BATAL_ACARA',admin]);
    kevituRecalculate_(acara,mata,ranking,now);
    return {id_acara:id,status:'BATAL'};
  } finally { lock.releaseLock(); }
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
