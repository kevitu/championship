/**
 * KEVITU Admin Bridge — LIVE API Executable, allowlisted Google identities.
 * STANDALONE Apps Script project. Not the Public Reader or the legacy Admin GAS.
 *
 * Script Properties:
 * SPREADSHEET_ID = approved LIVE workbook; fail-closed exact ID check
 * ADMIN_EMAILS = comma-separated explicit whitelist (private)
 * OAUTH_CLIENT_ID = Google web OAuth client ID (not a secret)
 *
 * API Executable invokes api* functions with caller OAuth identity.
 * Legacy Web App doPost explicitly disabled (no writes via Web App).
 */
'use strict';
const KEVITU_BRIDGE_ORIGIN='https://kevitu.github.io';
const KEVITU_BRIDGE_LIVE_ID='1j8xz7G2CksaZt_LOVvSSk8fVsC78LXMVDgioF2tqQ-E';
const KEVITU_BRIDGE_HOUSES=['MERAH','BIRU','HIJAU','KUNING'];
function bridgeProperties_(){
  const props=PropertiesService.getScriptProperties();
  const id=props.getProperty('SPREADSHEET_ID');
  const client=props.getProperty('OAUTH_CLIENT_ID');
  const admins=String(props.getProperty('ADMIN_EMAILS')||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
  if(!id||!client||!admins.length)throw Error('Bridge configuration missing');
  return {id,client,admins};
}
function bridgeBook_(config){
  if(String(config.id||'').trim()!==KEVITU_BRIDGE_LIVE_ID)throw Error('STOP: SPREADSHEET_ID tidak sepadan dengan LIVE yang diluluskan');
  const book=SpreadsheetApp.openById(KEVITU_BRIDGE_LIVE_ID);
  return book;
}
function bridgeTable_(book,name,headers){
  const sheet=book.getSheetByName(name);
  if(!sheet)throw Error('Missing '+name);
  const actual=sheet.getRange(1,1,1,headers.length).getDisplayValues()[0];
  if(actual.some((x,i)=>String(x).trim()!==headers[i]))throw Error('Invalid '+name+' header');
  if(sheet.getLastRow()>2001)throw Error('Too many records');
  return sheet;
}
function bridgeRows_(sheet,w){
  const n=sheet.getLastRow()-1;
  return n>0?sheet.getRange(2,1,n,w).getValues():[];
}
function bridgeData_(book){
  const acara=bridgeTable_(book,'ACARA',['ID_ACARA','NAMA_ACARA','TARIKH_ACARA','STATUS','CATATAN','DICIPTA_PADA','DIKEMASKINI_PADA']);
  const mata=bridgeTable_(book,'MATA_ACARA',['ID_ACARA','RUMAH_SUKAN','MATA','DIKEMASKINI_PADA','DIKEMASKINI_OLEH']);
  const scores=bridgeRows_(mata,5),seen=new Set();
  scores.forEach(row=>{const key=String(row[0])+':'+String(row[1]);if(seen.has(key))throw Error('Duplicate score record');seen.add(key)});
  return bridgeRows_(acara,7).map(row=>{
    const id=String(row[0]).trim();
    const date=row[2] instanceof Date?Utilities.formatDate(row[2],'Asia/Kuala_Lumpur','yyyy-MM-dd'):String(row[2]).slice(0,10);
    const points={MERAH:null,BIRU:null,HIJAU:null,KUNING:null};
    scores.filter(r=>String(r[0]).trim()===id).forEach(r=>{
      const house=String(r[1]).trim();if(Object.prototype.hasOwnProperty.call(points,house))points[house]=r[2]===''?null:Number(r[2]);
    });
    return {id_acara:id,nama_acara:String(row[1]),tarikh_acara:date,status:String(row[3]),catatan:String(row[4]||''),mata:points};
  });
}
function bridgeInput_(body){
  const name=String(body.nama_acara||'').trim().replace(/\s+/g,' ');
  const date=String(body.tarikh_acara||'');
  const status=String(body.status||'AKTIF');
  const id=String(body.id_acara||'').trim();
  if(!name||name.length>120||/^[=+@-]|[<>\x00-\x1f]/.test(name))throw Error('Invalid event name');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)throw Error('Invalid event date');
  if(!['AKTIF','SELESAI'].includes(status))throw Error('Invalid status');
  if(id&&!/^EVT\d{3,}$/.test(id))throw Error('Invalid event ID');
  const scores={};
  KEVITU_BRIDGE_HOUSES.forEach(h=>{
    const raw=body['mata_'+h];
    if(raw===undefined||raw===null||String(raw).trim()===''){scores[h]='';return}
    const n=Number(raw);
    if(!Number.isFinite(n)||n<0||n>1000000)throw Error('Invalid points: '+h);
    scores[h]=n;
  });
  return {id,name,date,status,scores};
}
function bridgeRecalculate_(book,now){
  const acara=bridgeTable_(book,'ACARA',['ID_ACARA','NAMA_ACARA','TARIKH_ACARA','STATUS','CATATAN','DICIPTA_PADA','DIKEMASKINI_PADA']);
  const mata=bridgeTable_(book,'MATA_ACARA',['ID_ACARA','RUMAH_SUKAN','MATA','DIKEMASKINI_PADA','DIKEMASKINI_OLEH']);
  const ranking=bridgeTable_(book,'KEDUDUKAN',['RUMAH_SUKAN','JUMLAH_MATA','KEDUDUKAN','JUMLAH_ACARA','DIKEMASKINI_PADA']);
  const events=bridgeRows_(acara,7),rows=bridgeRows_(mata,5);
  const active=new Set(events.filter(x=>['AKTIF','SELESAI'].includes(String(x[3]).trim())).map(x=>String(x[0])));
  const agg=KEVITU_BRIDGE_HOUSES.map(h=>({h,total:0,eventIds:new Set()})),seen=new Set();
  rows.forEach(r=>{
    const id=String(r[0]),h=String(r[1]),key=id+':'+h;
    if(seen.has(key))throw Error('Duplicate score');seen.add(key);
    if(!active.has(id))return;
    const entry=agg.find(x=>x.h===h);if(!entry)throw Error('Invalid house');
    if(r[2]===''||r[2]===null)return;
    const n=Number(r[2]);if(!Number.isFinite(n)||n<0||n>1000000)throw Error('Invalid points');
    entry.total+=n;entry.eventIds.add(id);
  });
  agg.sort((a,b)=>b.total-a.total||KEVITU_BRIDGE_HOUSES.indexOf(a.h)-KEVITU_BRIDGE_HOUSES.indexOf(b.h));
  if(ranking.getLastRow()>1)ranking.getRange(2,1,ranking.getLastRow()-1,5).clearContent();
  ranking.getRange(2,1,4,5).setValues(agg.map(x=>[x.h,x.total,1+agg.filter(y=>y.total>x.total).length,x.eventIds.size,now]));
}
function bridgeMutation_(book,action,body,email){
  const eventsSheet=bridgeTable_(book,'ACARA',['ID_ACARA','NAMA_ACARA','TARIKH_ACARA','STATUS','CATATAN','DICIPTA_PADA','DIKEMASKINI_PADA']);
  const pointsSheet=bridgeTable_(book,'MATA_ACARA',['ID_ACARA','RUMAH_SUKAN','MATA','DIKEMASKINI_PADA','DIKEMASKINI_OLEH']);
  const audit=bridgeTable_(book,'LOG_MATA',['ID_LOG','TIMESTAMP','ID_ACARA','RUMAH_SUKAN','MATA_LAMA','MATA_BAHARU','TINDAKAN','ADMIN_ID']);
  const events=bridgeRows_(eventsSheet,7),scores=bridgeRows_(pointsSheet,5);
  const input=action==='save'?bridgeInput_(body):{id:String(body.id_acara||'')};
  const now=new Date();
  if(action==='cancel'){
    if(!/^EVT\d{3,}$/.test(input.id))throw Error('Invalid event ID');
    const index=events.findIndex(r=>String(r[0])===input.id);
    if(index<0)throw Error('Event not found');
    if(String(events[index][3])==='BATAL')return {id_acara:input.id,status:'BATAL'};
    eventsSheet.getRange(index+2,4).setValue('BATAL');
    eventsSheet.getRange(index+2,7).setValue(now);
    audit.appendRow([Utilities.getUuid(),now,input.id,'','','','BATAL_ACARA',email]);
    bridgeRecalculate_(book,now);
    return {id_acara:input.id,status:'BATAL'};
  }
  const index=input.id?events.findIndex(r=>String(r[0])===input.id):-1;
  if(input.id&&index<0)throw Error('Event not found');
  if(index>=0&&String(events[index][3])==='BATAL')throw Error('Cancelled event cannot be edited');
  const next=events.map(r=>/^EVT(\d+)$/.exec(String(r[0]))).filter(Boolean).map(x=>Number(x[1]));
  const id=input.id||'EVT'+String(Math.max(0,...next)+1).padStart(3,'0');
  // Fail before writes if the selected ID already has duplicate score rows.
  const found=new Map();
  scores.forEach((r,i)=>{const key=String(r[0])+':'+String(r[1]);if(found.has(key))throw Error('Duplicate score row');found.set(key,{row:i+2,value:r[2]})});
  if(index>=0){eventsSheet.getRange(index+2,2,1,4).setValues([[input.name,input.date,input.status,'']]);eventsSheet.getRange(index+2,7).setValue(now)}
  else eventsSheet.appendRow([id,input.name,input.date,input.status,'',now,now]);
  const changes=[];
  KEVITU_BRIDGE_HOUSES.forEach(h=>{
    const prev=found.get(id+':'+h),old=prev?prev.value:'',value=input.scores[h];
    if((old===''?'':Number(old))===value)return;
    if(prev)pointsSheet.getRange(prev.row,3,1,3).setValues([[value,now,email]]);
    else pointsSheet.appendRow([id,h,value,now,email]);
    changes.push([Utilities.getUuid(),now,id,h,old,value,prev?'EDIT':'CIPTA',email]);
  });
  if(changes.length)audit.getRange(audit.getLastRow()+1,1,changes.length,8).setValues(changes);
  bridgeRecalculate_(book,now);
  return {id_acara:id,status:input.status};
}
/** Disabled legacy Web App mutation entry point.
 * Admin PWA uses scripts.run + kevituApiAdmin_() allowlist.
 * Keep a fail-closed response even if older Web App URLs remain accessible.
 */
function doPost() {
  return ContentService.createTextOutput(JSON.stringify({ok:false,error:'Endpoint disabled'}))
    .setMimeType(ContentService.MimeType.JSON);
}
function doGet(){return HtmlService.createHtmlOutput('KEVITU Admin Bridge — POST only');}

/**
 * API Executable entrypoints (called with user's OAuth ACCESS token).
 * All functions independently verify Google session identity + private allowlist.
 * AJK must also have Google Sheets access when executing via scripts.run.
 */
function kevituApiAdmin_() {
  const config=bridgeProperties_();
  const email=String(Session.getActiveUser().getEmail()||'').trim().toLowerCase();
  if(!email||!config.admins.includes(email))throw Error('Akses Admin tidak dibenarkan');
  return {email,book:bridgeBook_(config)};
}
function apiListKevituEvents() {
  const ctx=kevituApiAdmin_();
  return bridgeData_(ctx.book);
}
function apiSaveKevituEvent(payload) {
  const ctx=kevituApiAdmin_();
  if(!payload||typeof payload!=='object'||Array.isArray(payload))throw Error('Payload tidak sah');
  const lock=LockService.getScriptLock();lock.waitLock(20000);
  try {const result=bridgeMutation_(ctx.book,'save',payload,ctx.email);SpreadsheetApp.flush();return result}
  finally{lock.releaseLock()}
}
function apiCancelKevituEvent(id) {
  const ctx=kevituApiAdmin_();
  const lock=LockService.getScriptLock();lock.waitLock(20000);
  try {const result=bridgeMutation_(ctx.book,'cancel',{id_acara:id},ctx.email);SpreadsheetApp.flush();return result}
  finally{lock.releaseLock()}
}
