/**
 * KEVITU Bridge V9-B — QA branch only; NOT DEPLOYED.
 * See docs/SECURITY_V9_TRANSACTIONS.md before any future migration.
 * Existing workbook pin, Google Session allowlist and disabled doPost retained.
 * V9 requires V9_JOURNAL, BRIDGE_V9_ENABLED=true and a migrated caller.
 */
'use strict';
const KEVITU_BRIDGE_LIVE_ID='1j8xz7G2CksaZt_LOVvSSk8fVsC78LXMVDgioF2tqQ-E';
const KEVITU_BRIDGE_HOUSES=['MERAH','BIRU','HIJAU','KUNING'];
const V9_HEADERS={
 ACARA:['ID_ACARA','NAMA_ACARA','TARIKH_ACARA','STATUS','CATATAN','DICIPTA_PADA','DIKEMASKINI_PADA'],
 MATA_ACARA:['ID_ACARA','RUMAH_SUKAN','MATA','DIKEMASKINI_PADA','DIKEMASKINI_OLEH'],
 KEDUDUKAN:['RUMAH_SUKAN','JUMLAH_MATA','KEDUDUKAN','JUMLAH_ACARA','DIKEMASKINI_PADA'],
 LOG_MATA:['ID_LOG','TIMESTAMP','ID_ACARA','RUMAH_SUKAN','MATA_LAMA','MATA_BAHARU','TINDAKAN','ADMIN_ID'],
 V9_JOURNAL:['REQUEST_ID','FINGERPRINT','STATE','PLAN_JSON','CHECKSUM','RESULT_JSON']
};
const V9_TABLES=['ACARA','MATA_ACARA','KEDUDUKAN','LOG_MATA'];
const V9_LIMIT=2000;
function bridgeProperties_(){
 const props=PropertiesService.getScriptProperties();
 const id=props.getProperty('SPREADSHEET_ID'),client=props.getProperty('OAUTH_CLIENT_ID');
 const admins=String(props.getProperty('ADMIN_EMAILS')||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
 if(!id||!client||!admins.length)throw Error('Bridge configuration missing');
 return {id,client,admins};
}
function bridgeBook_(config){
 if(String(config.id||'').trim()!==KEVITU_BRIDGE_LIVE_ID)throw Error('STOP: unapproved workbook');
 return SpreadsheetApp.openById(KEVITU_BRIDGE_LIVE_ID);
}
function kevituApiAdmin_(){
 const config=bridgeProperties_(),email=String(Session.getActiveUser().getEmail()||'').trim().toLowerCase();
 if(!email||!config.admins.includes(email))throw Error('Akses Admin tidak dibenarkan');
 // Also prevents formula-leading identity cells in the immutable audit plan.
 if(!/^[a-z0-9][a-z0-9._+-]*@[a-z0-9.-]+\.[a-z]{2,}$/.test(email))throw Error('Invalid Admin identity');
 return {email,book:bridgeBook_(config)};
}
function v9Gate_(){
 if(PropertiesService.getScriptProperties().getProperty('BRIDGE_V9_ENABLED')!=='true')throw Error('MIGRATION_REQUIRED: V9 writes disabled');
}
function v9Lock_(fn){
 const lock=LockService.getScriptLock();lock.waitLock(20000);
 try{return fn()}finally{lock.releaseLock()}
}
function v9Hash_(text){
 return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,text,Utilities.Charset.UTF_8)
  .map(x=>(x&255).toString(16).padStart(2,'0')).join('');
}
function v9Cell_(x){return x instanceof Date?x.toISOString():x===null||x===undefined?'':x}
function v9Equal_(a,b){return JSON.stringify(a)===JSON.stringify(b)}
function v9Row_(row,width){return Array.from({length:width},(_,i)=>v9Cell_(row[i]))}
function bridgeTable_(book,name,headers){
 const sh=book.getSheetByName(name);if(!sh)throw Error('Missing '+name+'; V9 migration required');
 const h=headers||V9_HEADERS[name],last=sh.getLastRow();
 if(last<1||last-1>V9_LIMIT)throw Error('Table capacity exceeded: '+name);
 if(sh.getRange(1,1,1,h.length).getFormulas().some(r=>r.some(Boolean)))throw Error('Formula in '+name+' header');
 const actual=sh.getRange(1,1,1,h.length).getDisplayValues()[0];
 if(actual.some((x,i)=>String(x)!==h[i]))throw Error('Invalid '+name+' header');
 return sh;
}
function v9TableRow_(name,row){
 const out=v9Row_(row,V9_HEADERS[name].length);
 if(name==='ACARA'&&row[2] instanceof Date)out[2]=Utilities.formatDate(row[2],'Asia/Kuala_Lumpur','yyyy-MM-dd');
 return out;
}
function v9Read_(book,name){
 const sh=bridgeTable_(book,name),n=sh.getLastRow()-1,w=V9_HEADERS[name].length;
 if(!n)return [];
 const range=sh.getRange(2,1,n,w);
 if(range.getFormulas().some(r=>r.some(Boolean)))throw Error('Formula found in '+name);
 return range.getValues().map(r=>v9TableRow_(name,r));
}
function v9Data_(book){const data={};V9_TABLES.forEach(n=>{data[n]=v9Read_(book,n)});return data}
function v9Text_(x,label,max,empty){
 if(typeof x!=='string'||/[\x00-\x1f\x7f]/.test(x))throw Error('Invalid '+label);
 const s=x.trim().replace(/ +/g,' ');
 if((!empty&&!s)||s.length>max||/^[=+@-]|[<>]/.test(s))throw Error('Invalid '+label);
 return s;
}
function v9Date_(x){
 if(typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x)||!Number.isFinite(Date.parse(x+'T00:00:00Z'))||
 new Date(x+'T00:00:00Z').toISOString().slice(0,10)!==x)throw Error('Invalid event date');
 return x;
}
function v9Points_(raw){
 if(raw===undefined||raw===null||raw==='')return '';
 if(typeof raw==='string'){raw=raw.trim();if(raw==='')return '';if(!/^(?:\d+)(?:\.\d+)?$/.test(raw))throw Error('Invalid points')}
 else if(typeof raw!=='number')throw Error('Invalid points');
 const n=Number(raw);
 if(!Number.isFinite(n)||n<0||n>1000000)throw Error('Invalid points');
 return n===0?0:n;
}
function v9Id_(id){if(typeof id!=='string'||!/^EVT\d{3,}$/.test(id))throw Error('Invalid event ID');return id}
function v9Request_(id){
 if(typeof id!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_-]{15,79}$/.test(id))throw Error('MIGRATION_REQUIRED: invalid request_id');
 return id;
}
function v9RevisionInput_(x){if(typeof x!=='string'||!/^[0-9a-f]{64}$/.test(x))throw Error('MIGRATION_REQUIRED: expected_revision required');return x}
function v9Command_(action,body){
 if(!body||typeof body!=='object'||Array.isArray(body))throw Error('MIGRATION_REQUIRED: Invalid payload');
 const allowed=action==='save'?['request_id','id_acara','expected_revision','nama_acara','tarikh_acara','status',...KEVITU_BRIDGE_HOUSES.map(h=>'mata_'+h)]:['request_id','id_acara','expected_revision'];
 if(Object.keys(body).some(k=>!allowed.includes(k)))throw Error('Invalid payload field');
 const request=v9Request_(body.request_id);
 const id=body.id_acara===undefined||body.id_acara===''?'':v9Id_(body.id_acara);
 if(action==='cancel'&&!id)throw Error('Invalid event ID');
 const revision=id?v9RevisionInput_(body.expected_revision):'';
 if(!id&&body.expected_revision!==undefined&&body.expected_revision!=='')throw Error('Invalid expected_revision for create');
 if(action==='cancel')return {request,action,id,revision};
 const name=v9Text_(body.nama_acara,'event name',120,false),date=v9Date_(body.tarikh_acara),status=body.status===undefined?'AKTIF':body.status;
 if(!['AKTIF','SELESAI'].includes(status))throw Error('Invalid status');
 const scores={};KEVITU_BRIDGE_HOUSES.forEach(h=>{scores[h]=v9Points_(body['mata_'+h])});
 return {request,action,id,revision,name,date,status,scores};
}
// Add canonical decimal representations exactly before converting once to Number.
// Avoids 0.1 + 0.2 outranking 0.3; no new precision restriction on input.
function v9DecimalSum_(values){
 const parts=values.map(n=>{
  const bits=String(n).split('e'),mantissa=bits[0].split('.');
  let digits=(mantissa[0]+(mantissa[1]||'')).replace(/^0+/,'')||'0';
  let scale=(mantissa[1]||'').length-Number(bits[1]||0);
  if(scale<0){digits+='0'.repeat(-scale);scale=0}
  return {digits,scale};
 });
 const scale=Math.max(0,...parts.map(p=>p.scale));let sum='0';
 parts.forEach(p=>{
  const digits=p.digits+'0'.repeat(scale-p.scale);let carry=0,out='',i=sum.length-1,j=digits.length-1;
  while(i>=0||j>=0||carry){const x=(i>=0?Number(sum[i--]):0)+(j>=0?Number(digits[j--]):0)+carry;out=String(x%10)+out;carry=Math.floor(x/10)}
  sum=out.replace(/^0+/,'')||'0';
 });
 if(!scale)return Number(sum);
 sum=sum.padStart(scale+1,'0');
 return Number(sum.slice(0,-scale)+'.'+sum.slice(-scale));
}
function v9Aggregate_(data){
 const valid=new Set(data.ACARA.filter(r=>r[3]!=='BATAL').map(r=>r[0]));
 const agg=KEVITU_BRIDGE_HOUSES.map(h=>({h,total:0,count:0,values:[]}));
 data.MATA_ACARA.forEach(r=>{if(valid.has(r[0])&&r[2]!==''){const item=agg.find(x=>x.h===r[1]);if(!item)throw Error('Invalid house');const value=v9Points_(r[2]);if(value==='')return;item.values.push(value);item.count++}});
 agg.forEach(x=>{x.total=v9DecimalSum_(x.values)});
 if(agg.some(x=>!Number.isFinite(x.total)||x.total>V9_LIMIT*1000000))throw Error('Invalid total');
 agg.sort((a,b)=>b.total-a.total||KEVITU_BRIDGE_HOUSES.indexOf(a.h)-KEVITU_BRIDGE_HOUSES.indexOf(b.h));
 return agg.map(x=>[x.h,x.total,1+agg.filter(y=>y.total>x.total).length,x.count]);
}
function v9Validate_(data){
 const ids=new Set(),scores=new Set(),logs=new Set();
 data.ACARA.forEach(r=>{
  v9Id_(r[0]);if(ids.has(r[0]))throw Error('Duplicate event ID');ids.add(r[0]);
  v9Text_(r[1],'event name',120,false);
  // Legacy Date cells use the Malaysia calendar date (normalised by v9TableRow_).
  v9Date_(String(r[2]).slice(0,10));
  if(!['AKTIF','SELESAI','BATAL'].includes(r[3]))throw Error('Invalid event status');
  v9Text_(String(r[4]),'notes',500,true);
 });
 data.MATA_ACARA.forEach(r=>{
  if(!ids.has(r[0]))throw Error('Orphan score');
  if(!KEVITU_BRIDGE_HOUSES.includes(r[1]))throw Error('Invalid house');
  const key=r[0]+':'+r[1];if(scores.has(key))throw Error('Duplicate score');scores.add(key);v9Points_(r[2]);
 });
 data.LOG_MATA.forEach(r=>{
  if(typeof r[0]!=='string'||!r[0]||logs.has(r[0]))throw Error('Duplicate or invalid log ID');logs.add(r[0]);
  if(!ids.has(r[2]))throw Error('Orphan audit');
 });
 const expected=v9Aggregate_(data);
 if(data.KEDUDUKAN.length===0&&data.ACARA.length===0&&data.MATA_ACARA.length===0)return;
 if(data.KEDUDUKAN.length!==4||data.KEDUDUKAN.some((r,i)=>!v9Equal_(r.slice(0,4),expected[i])))throw Error('CONSISTENCY_BLOCKED: ranking mismatch');
}
function v9Revision_(data,id){
 const event=data.ACARA.find(r=>r[0]===id);if(!event)throw Error('Event not found');
 const points=KEVITU_BRIDGE_HOUSES.map(h=>data.MATA_ACARA.find(r=>r[0]===id&&r[1]===h)||null);
 return v9Hash_(JSON.stringify([event,points]));
}
function v9Journal_(book){
 const rows=v9Read_(book,'V9_JOURNAL'),seen=new Set();
 return rows.map((row,i)=>{
  try{
   if(row.some(x=>typeof x!=='string'))throw Error('types');
   v9Request_(row[0]);if(seen.has(row[0]))throw Error('duplicate request');seen.add(row[0]);
   if(!/^[0-9a-f]{64}$/.test(row[1])||!['PREPARED','COMMITTED','CLOSED'].includes(row[2])||row[3].length>40000||v9Hash_(row[3])!==row[4])throw Error('checksum/state');
   const plan=JSON.parse(row[3]),closed=row[2]==='CLOSED';
   if(typeof plan.plan_hmac!=='string'||!/^[a-f0-9]{64}$/.test(plan.plan_hmac)||!pubSame_(v9PlanMac_(plan),plan.plan_hmac))throw Error('journal authentication');
   if(plan.v!==9||plan.request!==row[0]||plan.fingerprint!==row[1]||!['save','cancel'].includes(plan.command.action)||
    plan.command.request!==plan.request||plan.result.request_id!==plan.request||v9Hash_(JSON.stringify([plan.actor,plan.command]))!==plan.fingerprint||
    JSON.stringify(plan.result)!==row[5]||!Array.isArray(plan.targets)||plan.targets.length>20)throw Error('schema/result');
   if(closed){if(plan.kind!=='CLOSED'||plan.targets.length||Object.keys(plan.result).sort().join(',')!=='outcome,request_id'||plan.result.outcome!=='CLOSED_UNAPPLIED')throw Error('closed schema')}
   else{if(plan.kind==='CLOSED'||!['AKTIF','SELESAI','BATAL'].includes(plan.result.status)||!/^[0-9a-f]{64}$/.test(plan.result.revision))throw Error('score schema');v9Id_(plan.result.id_acara)}
   const keys=new Set();
   plan.targets.forEach(t=>{
    if(!V9_TABLES.includes(t.table)||!Number.isInteger(t.row)||t.row<2||t.row>V9_LIMIT+1||
     !Array.isArray(t.before)||!Array.isArray(t.after)||t.before.length!==V9_HEADERS[t.table].length||t.after.length!==t.before.length||
     keys.has(t.table+':'+t.row))throw Error('target');
    keys.add(t.table+':'+t.row);
    if(t.after.some(x=>(typeof x!=='string'&&typeof x!=='number')||(typeof x==='number'&&!Number.isFinite(x))||(typeof x==='string'&&/^[\s]*[=+@-]/.test(x))))throw Error('unsafe cell');
    if(t.table==='LOG_MATA'&&(t.after[0].indexOf(plan.request+':')!==0||t.after[2]!==plan.result.id_acara||t.after[7]!==plan.actor))throw Error('audit binding');
   });
   V9_TABLES.forEach(n=>{const m=plan.masks[n];if(!m||!Number.isInteger(m.length)||m.length<0||m.length>V9_LIMIT||!/^[0-9a-f]{64}$/.test(m.hash))throw Error('mask')});
   return {row:i+2,request:row[0],fingerprint:row[1],state:row[2],plan};
  }catch(e){throw Error('JOURNAL_CORRUPT: row '+(i+2))}
 });
}
function v9CheckCommitted_(data,journal,pendingId){
 const latest=new Map();
 journal.filter(r=>r.state==='COMMITTED').forEach(record=>{
  record.plan.targets.filter(t=>t.table==='LOG_MATA').forEach(t=>{
   if(!v9Equal_(data.LOG_MATA[t.row-2],t.after))throw Error('CONSISTENCY_BLOCKED: committed audit missing or changed');
  });
  latest.set(record.plan.result.id_acara,record.plan.result.revision);
 });
 latest.forEach((revision,id)=>{
  if(id!==pendingId&&v9Revision_(data,id)!==revision)throw Error('CONSISTENCY_BLOCKED: committed event changed');
 });
 const committed=journal.filter(r=>r.state!=='PREPARED');
 if(!pendingId&&committed.length){const plan=committed[committed.length-1].plan;v9CheckPlan_(data,plan);if(plan.targets.some(t=>!v9Equal_(data[t.table][t.row-2],t.after)))throw Error('CONSISTENCY_BLOCKED: committed after-state differs')}
}
function v9Masked_(data,name,targets,length){
 const indices=new Set(targets.filter(t=>t.table===name).map(t=>t.row-2));
 return Array.from({length},(_,i)=>indices.has(i)?null:data[name][i]||Array(V9_HEADERS[name].length).fill(''));
}
function v9CheckPlan_(data,plan){
 V9_TABLES.forEach(n=>{
  const m=plan.masks[n];
  if(data[n].length>m.length||v9Hash_(JSON.stringify(v9Masked_(data,n,plan.targets,m.length)))!==m.hash)throw Error('CONSISTENCY_BLOCKED: unexpected '+n+' data');
 });
 plan.targets.forEach(t=>{
  const row=data[t.table][t.row-2]||Array(t.before.length).fill('');
  if(!v9Equal_(row,t.before)&&!v9Equal_(row,t.after))throw Error('CONSISTENCY_BLOCKED: ambiguous '+t.table+' row '+t.row);
 });
}
function v9Build_(data,command,actor){
 const existing=command.id?data.ACARA.find(r=>r[0]===command.id):null;
 if(command.id&&!existing)throw Error('Event not found');
 if(existing&&v9Revision_(data,command.id)!==command.revision)throw Error('STALE_REVISION: refresh before editing');
 if(command.action==='save'&&existing&&existing[3]==='BATAL')throw Error('Cancelled event cannot be edited');
 const next=Math.max(0,...data.ACARA.map(r=>Number(r[0].slice(3))))+1;
 if(!Number.isSafeInteger(next))throw Error('Event ID capacity exceeded');
 const id=command.id||'EVT'+String(next).padStart(3,'0'),now=new Date().toISOString();
 const after={};V9_TABLES.forEach(n=>{after[n]=data[n].map(r=>r.slice())});
 const targets=[];
 function set(table,index,row){
  const before=data[table][index]||Array(V9_HEADERS[table].length).fill('');
  after[table][index]=row;
  if(!v9Equal_(before,row))targets.push({table,row:index+2,before,after:row});
 }
 const eventIndex=existing?data.ACARA.indexOf(existing):data.ACARA.length;
 const noOp=command.action==='cancel'&&existing[3]==='BATAL';
 if(!noOp){
  if(command.action==='save'){
   set('ACARA',eventIndex,[id,command.name,command.date,command.status,existing?existing[4]:'',existing?existing[5]:now,now]);
   KEVITU_BRIDGE_HOUSES.forEach(h=>{
    const index=data.MATA_ACARA.findIndex(r=>r[0]===id&&r[1]===h),old=index<0?'':data.MATA_ACARA[index][2],value=command.scores[h];
    // Create even blank score rows: complete four-house invariant after a V9 save.
    if(index<0||old!==value){
     const rowIndex=index<0?after.MATA_ACARA.length:index;
     set('MATA_ACARA',rowIndex,[id,h,value,now,actor]);
     if(old!==value)set('LOG_MATA',after.LOG_MATA.length,[command.request+':'+h,now,id,h,old,value,index<0?'CIPTA':'EDIT',actor]);
    }
   });
   if(!targets.some(t=>t.table==='LOG_MATA'))set('LOG_MATA',after.LOG_MATA.length,[command.request+':EVENT',now,id,'','','','SIMPAN_ACARA',actor]);
  }else{
   const row=existing.slice();row[3]='BATAL';row[6]=now;set('ACARA',eventIndex,row);
   set('LOG_MATA',after.LOG_MATA.length,[command.request+':CANCEL',now,id,'','','','BATAL_ACARA',actor]);
  }
  v9Aggregate_(after).forEach((r,i)=>set('KEDUDUKAN',i,[...r,now]));
 }
 const fingerprint=v9Hash_(JSON.stringify([actor,command]));
 const result={id_acara:id,status:after.ACARA[eventIndex][3],revision:v9Revision_(after,id),request_id:command.request};
 const masks={};
 V9_TABLES.forEach(n=>{
  const length=after[n].length;if(length>V9_LIMIT)throw Error('Table capacity exceeded: '+n);
  masks[n]={length,hash:v9Hash_(JSON.stringify(v9Masked_(data,n,targets,length)))};
 });
 // Validate the complete intended state before the first persistent write.
 v9Validate_(after);v9PublicJson_(after,2000);
 const plan={v:9,request:command.request,fingerprint,actor,command,targets,masks,result};
 v9SealPlan_(plan);
 if(JSON.stringify(plan).length>40000)throw Error('Journal plan capacity exceeded');
 return plan;
}
function v9Replay_(book,record){
 const plan=record.plan,data=v9Data_(book);v9CheckPlan_(data,plan);
 // Validate every target first; never start repair if another target is ambiguous.
 for(const t of plan.targets){
  const row=data[t.table][t.row-2]||Array(t.before.length).fill('');
  if(v9Equal_(row,t.after))continue;
  bridgeTable_(book,t.table).getRange(t.row,1,1,t.after.length).setValues([t.after]);
  SpreadsheetApp.flush();
  // Strict per-row readback catches unexpected coercion and partial service writes.
  const got=v9TableRow_(t.table,bridgeTable_(book,t.table).getRange(t.row,1,1,t.after.length).getValues()[0]);
  if(!v9Equal_(got,t.after))throw Error('CONSISTENCY_BLOCKED: write readback');
 }
 SpreadsheetApp.flush();
 const finalData=v9Data_(book);v9CheckPlan_(finalData,plan);
 if(plan.targets.some(t=>!v9Equal_(finalData[t.table][t.row-2],t.after)))throw Error('CONSISTENCY_BLOCKED: incomplete replay');
 v9Validate_(finalData);
 if(v9Revision_(finalData,plan.result.id_acara)!==plan.result.revision)throw Error('CONSISTENCY_BLOCKED: revision mismatch');
 bridgeTable_(book,'V9_JOURNAL').getRange(record.row,3).setValue('COMMITTED');
 SpreadsheetApp.flush();
 const committed=v9Journal_(book).find(x=>x.request===record.request);
 if(!committed||committed.state!=='COMMITTED')throw Error('CONSISTENCY_BLOCKED: commit not confirmed');
 v9EnsurePublished_(book);return plan.result;
}
function v9Execute_(ctx,action,body){
 v9Gate_();const command=v9Command_(action,body);
 return v9Lock_(()=>{
  const data=v9Data_(ctx.book),journal=v9Journal_(ctx.book);
  const fingerprint=v9Hash_(JSON.stringify([ctx.email,command]));
  const old=journal.find(r=>r.request===command.request);
  if(old&&old.fingerprint!==fingerprint)throw Error('IDEMPOTENCY_CONFLICT: request_id already bound');
  const pending=journal.filter(r=>r.state==='PREPARED');
  if(pending.length>1||pending.some(r=>r.request!==command.request))throw Error('RECOVERY_REQUIRED: pending transaction');
  if(!pending.length)v9Validate_(data);
  v9CheckCommitted_(data,journal,pending.length?pending[0].plan.result.id_acara:null);
  if(old){
   if(old.state==='PREPARED')return v9Replay_(ctx.book,old);
   v9Validate_(data);v9EnsurePublished_(ctx.book);
   return old.plan.result;
  }
  v9Validate_(data);
  if(journal.length>=V9_LIMIT)throw Error('Journal capacity exceeded');
  const pub=v9PublicationReady_(ctx.book,data,journal);if(pub.rows.length>=2000)throw Error('Publication snapshot capacity exceeded');
  const plan=v9Build_(data,command,ctx.email),json=JSON.stringify(plan),row=journal.length+2;
  bridgeTable_(ctx.book,'V9_JOURNAL').getRange(row,1,1,6).setValues([[command.request,fingerprint,'PREPARED',json,v9Hash_(json),JSON.stringify(plan.result)]]);
  SpreadsheetApp.flush();
  const record=v9Journal_(ctx.book).find(r=>r.request===command.request);
  if(!record||record.state!=='PREPARED'||!v9Equal_(record.plan,plan))throw Error('JOURNAL_CORRUPT: prepare not confirmed');
  return v9Replay_(ctx.book,record);
 });
}
function apiListKevituEvents(){
 const ctx=kevituApiAdmin_();
 return v9Lock_(()=>{
  const data=v9Data_(ctx.book),journal=v9Journal_(ctx.book);
  if(journal.some(r=>r.state==='PREPARED'))throw Error('RECOVERY_REQUIRED: pending transaction');
  v9Validate_(data);v9CheckCommitted_(data,journal,null);v9PublicationReady_(ctx.book,data,journal);
  return data.ACARA.map(r=>{
   const points={};KEVITU_BRIDGE_HOUSES.forEach(h=>{const p=data.MATA_ACARA.find(x=>x[0]===r[0]&&x[1]===h);points[h]=!p||p[2]===''?null:Number(p[2])});
   return {id_acara:r[0],nama_acara:r[1],tarikh_acara:String(r[2]).slice(0,10),status:r[3],catatan:r[4],mata:points,revision:v9Revision_(data,r[0])};
  });
 });
}
function apiSaveKevituEvent(payload){const ctx=kevituApiAdmin_();return v9Execute_(ctx,'save',payload)}
function apiCancelKevituEvent(payload){const ctx=kevituApiAdmin_();return v9Execute_(ctx,'cancel',payload)}
function apiRecoverKevituTransaction(requestId){
 const ctx=kevituApiAdmin_();v9Gate_();v9Request_(requestId);
 return v9Lock_(()=>{
  const journal=v9Journal_(ctx.book),record=journal.find(r=>r.request===requestId);
  if(!record)throw Error('Transaction not found');
  if(journal.some(r=>r.state==='PREPARED'&&r.request!==requestId))throw Error('RECOVERY_REQUIRED: different pending transaction');
  const data=v9Data_(ctx.book);v9CheckCommitted_(data,journal,record.state==='PREPARED'?record.plan.result.id_acara:null);
  if(record.state!=='PREPARED'){v9Validate_(data);v9EnsurePublished_(ctx.book);return record.plan.result}
  return v9Replay_(ctx.book,record);
 });
}
function apiInspectKevituTransactions(){
 const ctx=kevituApiAdmin_();
 return v9Lock_(()=>v9Journal_(ctx.book).map(r=>({request_id:r.request,state:r.state,id_acara:r.plan.result.id_acara||r.plan.command.id||''})));
}
function doPost(){return ContentService.createTextOutput(JSON.stringify({ok:false,error:'Endpoint disabled'})).setMimeType(ContentService.MimeType.JSON)}
function doGet(){return HtmlService.createHtmlOutput('KEVITU Admin Bridge — API Executable only')}

// Publication protocol v1: pure validation/signing shared verbatim with Reader.
const PUB_WORKBOOK_ID='1j8xz7G2CksaZt_LOVvSSk8fVsC78LXMVDgioF2tqQ-E';
const PUB_HOUSES=['MERAH','BIRU','HIJAU','KUNING'];
const PUB_MAX_AGE=86400000;
function pubHash_(s){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,s,Utilities.Charset.UTF_8).map(x=>(x&255).toString(16).padStart(2,'0')).join('')}
function pubScope_(){return pubHash_('KEVITU_PUBLIC_V1:'+PUB_WORKBOOK_ID)}
function pubKey_(){const k=PropertiesService.getScriptProperties().getProperty('PUBLIC_SNAPSHOT_HMAC_KEY');if(typeof k!=='string'||k.length<32||k.length>200)throw Error('Publication configuration missing');return k}
function pubSign_(p){return Utilities.computeHmacSha256Signature(JSON.stringify(p),pubKey_(),Utilities.Charset.UTF_8).map(x=>(x&255).toString(16).padStart(2,'0')).join('')}
function pubSame_(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0}
function pubPointer_(text,allowExpired){
 let p;try{p=JSON.parse(text)}catch(e){throw Error('Invalid signed pointer')}
 if(!p||Object.keys(p).sort().join(',')!=='expires_at,generation,published_at,row,schema,scope,sha256,signature,source_hash')throw Error('Invalid signed pointer schema');
 const u={schema:p.schema,scope:p.scope,row:p.row,sha256:p.sha256,generation:p.generation,source_hash:p.source_hash,published_at:p.published_at,expires_at:p.expires_at};
 const at=Date.parse(u.published_at),until=Date.parse(u.expires_at);
 if(u.schema!==1||u.scope!==pubScope_()||!Number.isInteger(u.row)||u.row<2||u.row>2001||
 !Number.isInteger(u.generation)||u.generation<0||u.generation>2000||!/^[a-f0-9]{64}$/.test(u.sha256)||!/^[a-f0-9]{64}$/.test(u.source_hash)||
 typeof p.signature!=='string'||!/^[a-f0-9]{64}$/.test(p.signature)||!Number.isFinite(at)||!Number.isFinite(until)||
 new Date(at).toISOString()!==u.published_at||new Date(until).toISOString()!==u.expires_at||until-at!==PUB_MAX_AGE||
 at>Date.now()+300000||(!allowExpired&&until<=Date.now())||!pubSame_(pubSign_(u),p.signature))throw Error('Invalid or expired signed pointer');
 return p;
}
function pubDecimalSum_(values){
 const parts=values.map(n=>{
  const bits=String(n).split('e'),mantissa=bits[0].split('.');
  let digits=(mantissa[0]+(mantissa[1]||'')).replace(/^0+/,'')||'0';
  let scale=(mantissa[1]||'').length-Number(bits[1]||0);
  if(scale<0){digits+='0'.repeat(-scale);scale=0}
  return {digits,scale};
 });
 const scale=Math.max(0,...parts.map(p=>p.scale));let sum='0';
 parts.forEach(p=>{
  const digits=p.digits+'0'.repeat(scale-p.scale);let carry=0,out='',i=sum.length-1,j=digits.length-1;
  while(i>=0||j>=0||carry){const x=(i>=0?Number(sum[i--]):0)+(j>=0?Number(digits[j--]):0)+carry;out=String(x%10)+out;carry=Math.floor(x/10)}
  sum=out.replace(/^0+/,'')||'0';
 });
 if(!scale)return Number(sum);
 sum=sum.padStart(scale+1,'0');return Number(sum.slice(0,-scale)+'.'+sum.slice(-scale));
}
function pubValidate_(snapshot){
 if(!snapshot||Object.keys(snapshot).sort().join(',')!=='acara,generation,kedudukan,schema'||snapshot.schema!==1||
 !Number.isInteger(snapshot.generation)||snapshot.generation<0||snapshot.generation>2000||
 !Array.isArray(snapshot.acara)||snapshot.acara.length>2000||!Array.isArray(snapshot.kedudukan)||snapshot.kedudukan.length!==4)throw Error('Invalid snapshot');
 const seen=new Set(),agg=PUB_HOUSES.map(h=>({h,values:[],count:0}));
 snapshot.acara.forEach(e=>{
  if(!e||Object.keys(e).sort().join(',')!=='id_acara,mata,nama_acara,status,tarikh_acara'||
  typeof e.id_acara!=='string'||!/^EVT\d{3,}$/.test(e.id_acara))throw Error('Invalid snapshot event');
  if(seen.has(e.id_acara))throw Error('Duplicate event including BATAL');seen.add(e.id_acara);
  if(typeof e.nama_acara!=='string'||!e.nama_acara.trim()||e.nama_acara.length>120||/^[\s]*[=+@-]|[<>\x00-\x1f\x7f]/.test(e.nama_acara)||
  !['AKTIF','SELESAI','BATAL'].includes(e.status)||typeof e.tarikh_acara!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(e.tarikh_acara)||
  !Number.isFinite(Date.parse(e.tarikh_acara+'T00:00:00Z'))||new Date(e.tarikh_acara+'T00:00:00Z').toISOString().slice(0,10)!==e.tarikh_acara||
  !e.mata||Object.keys(e.mata).sort().join(',')!==PUB_HOUSES.slice().sort().join(','))throw Error('Invalid snapshot event data');
  PUB_HOUSES.forEach((h,i)=>{const n=e.mata[h];if(n!==null&&(typeof n!=='number'||!Number.isFinite(n)||n<0||n>1000000))throw Error('Invalid snapshot points');if(e.status!=='BATAL'&&n!==null){agg[i].values.push(n);agg[i].count++}});
 });
 agg.forEach(x=>{x.total=pubDecimalSum_(x.values);if(!Number.isFinite(x.total)||x.total>2000000000)throw Error('Invalid snapshot total')});
 agg.sort((a,b)=>b.total-a.total||PUB_HOUSES.indexOf(a.h)-PUB_HOUSES.indexOf(b.h));
 const rows=agg.map(x=>({rumah_sukan:x.h,jumlah_mata:x.total,kedudukan:1+agg.filter(y=>y.total>x.total).length,jumlah_acara:x.count}));
 snapshot.kedudukan.forEach((r,i)=>{if(!r||Object.keys(r).sort().join(',')!=='jumlah_acara,jumlah_mata,kedudukan,rumah_sukan'||Object.keys(rows[i]).some(k=>r[k]!==rows[i][k]))throw Error('Snapshot ranking mismatch')});
 return {kedudukan:rows,acara:snapshot.acara.filter(e=>e.status!=='BATAL').map(e=>({id_acara:e.id_acara,nama_acara:e.nama_acara,tarikh_acara:e.tarikh_acara,status:e.status}))};
}
function pubDecode_(pointer,text,allowExpired){
 pubPointer_(JSON.stringify(pointer),allowExpired);
 if(typeof text!=='string'||text.length>40000||pubHash_(text)!==pointer.sha256)throw Error('Snapshot checksum mismatch');
 let snapshot;try{snapshot=JSON.parse(text)}catch(e){throw Error('Invalid snapshot JSON')}
 if(snapshot.generation!==pointer.generation)throw Error('Snapshot generation mismatch');
 const data=pubValidate_(snapshot);
 data.publication={generation:pointer.generation,published_at:pointer.published_at,expires_at:pointer.expires_at,age_seconds:Math.max(0,Math.floor((Date.now()-Date.parse(pointer.published_at))/1000)),cache_max_age_seconds:60,policy:'signed_committed_snapshot'};
 return data;
}

V9_HEADERS.V9_PUBLIC_SNAPSHOTS=['SNAPSHOT_JSON'];
V9_HEADERS.V9_PUBLIC_POINTER=['POINTER_JSON'];
function v9PublicJson_(data,generation){
 const acara=data.ACARA.map(r=>{
  const mata={};KEVITU_BRIDGE_HOUSES.forEach(h=>{const p=data.MATA_ACARA.find(x=>x[0]===r[0]&&x[1]===h),n=p?v9Points_(p[2]):'';mata[h]=n===''?null:n});
  return {id_acara:r[0],nama_acara:r[1],tarikh_acara:String(r[2]).slice(0,10),status:r[3],mata};
 });
 const kedudukan=v9Aggregate_(data).map(r=>({rumah_sukan:r[0],jumlah_mata:r[1],kedudukan:r[2],jumlah_acara:r[3]}));
 const snapshot={schema:1,generation,acara,kedudukan};pubValidate_(snapshot);
 const text=JSON.stringify(snapshot);if(text.length>40000)throw Error('Publication snapshot capacity exceeded');return text;
}
function v9Publication_(book){
 pubKey_();
 const rows=v9Read_(book,'V9_PUBLIC_SNAPSHOTS'),ptrRows=v9Read_(book,'V9_PUBLIC_POINTER');
 if(ptrRows.length>1||rows.some(r=>typeof r[0]!=='string'||!r[0]))throw Error('CONSISTENCY_BLOCKED: publication schema');
 const raw=ptrRows.length?ptrRows[0][0]:'',pointer=raw?pubPointer_(raw,true):null;
 return {rows,raw,pointer};
}
function v9PublicGeneration_(journal){return journal.filter(r=>r.state==='COMMITTED').length}
function v9PublicationReady_(book,data,journal){
 const p=v9Publication_(book),generation=v9PublicGeneration_(journal),text=v9PublicJson_(data,generation);
 if(!p.pointer)throw Error('MIGRATION_REQUIRED: publish initial snapshot first');
 if(p.pointer.generation<generation)throw Error('RECOVERY_REQUIRED: committed publication pending');
 if(p.pointer.generation!==generation||p.pointer.sha256!==pubHash_(text)||p.pointer.source_hash!==v9Hash_(JSON.stringify(data))||p.rows[p.pointer.row-2]?.[0]!==text)throw Error('CONSISTENCY_BLOCKED: publication differs');
 pubDecode_(p.pointer,text,true);
 return p;
}
function v9EnsurePublished_(book){
 const data=v9Data_(book),journal=v9Journal_(book);
 if(journal.some(r=>r.state==='PREPARED'))throw Error('RECOVERY_REQUIRED: no publication while PREPARED');
 v9Validate_(data);v9CheckCommitted_(data,journal,null);
 const state=v9Publication_(book),generation=v9PublicGeneration_(journal),text=v9PublicJson_(data,generation),sha=pubHash_(text);
 if(state.pointer&&state.pointer.generation>generation)throw Error('CONSISTENCY_BLOCKED: publication generation ahead');
 if(state.pointer&&state.pointer.generation===generation&&(state.pointer.sha256!==sha||state.pointer.source_hash!==v9Hash_(JSON.stringify(data))))throw Error('CONSISTENCY_BLOCKED: publication content differs');
 if(state.pointer&&state.pointer.generation===generation&&state.pointer.sha256===sha&&state.rows[state.pointer.row-2]?.[0]===text&&Date.parse(state.pointer.expires_at)>Date.now()){
  pubDecode_(state.pointer,text);return state.pointer;
 }
 const matches=[];
 state.rows.forEach((r,i)=>{let s;try{s=JSON.parse(r[0]);pubValidate_(s)}catch(e){throw Error('CONSISTENCY_BLOCKED: malformed immutable snapshot')}
  if(s.generation===generation){if(r[0]!==text)throw Error('CONSISTENCY_BLOCKED: snapshot generation collision');matches.push(i+2)}});
 if(matches.length>1)throw Error('CONSISTENCY_BLOCKED: duplicate snapshot generation');
 let row=matches[0];
 if(!row){
  if(state.rows.length>=2000)throw Error('Publication snapshot capacity exceeded');
  row=state.rows.length+2;bridgeTable_(book,'V9_PUBLIC_SNAPSHOTS').getRange(row,1).setValue(text);SpreadsheetApp.flush();
  if(bridgeTable_(book,'V9_PUBLIC_SNAPSHOTS').getRange(row,1).getValues()[0][0]!==text)throw Error('CONSISTENCY_BLOCKED: snapshot readback');
 }
 const now=new Date(),u={schema:1,scope:pubScope_(),row,sha256:sha,generation,source_hash:v9Hash_(JSON.stringify(data)),published_at:now.toISOString(),expires_at:new Date(now.getTime()+PUB_MAX_AGE).toISOString()};
 const raw=JSON.stringify({...u,signature:pubSign_(u)});
 bridgeTable_(book,'V9_PUBLIC_POINTER').getRange(2,1).setValue(raw);SpreadsheetApp.flush();
 if(bridgeTable_(book,'V9_PUBLIC_POINTER').getRange(2,1).getValues()[0][0]!==raw)throw Error('CONSISTENCY_BLOCKED: pointer readback');
 pubDecode_(pubPointer_(raw),text);return JSON.parse(raw);
}
function apiGetKevituAdminContext(){
 const ctx=kevituApiAdmin_();
 return {protocol:9,publication_protocol:1,actor:v9Hash_('KEVITU_ACTOR:'+ctx.email),scope:pubScope_()};
}
function apiPublishKevituSnapshot(){const ctx=kevituApiAdmin_();v9Gate_();return v9Lock_(()=>v9EnsurePublished_(ctx.book))}
function apiCloseKevituRequest(envelope){
 const ctx=kevituApiAdmin_();v9Gate_();
 if(!envelope||!['save','cancel'].includes(envelope.action)||Object.keys(envelope).sort().join(',')!=='action,payload')throw Error('Invalid close request');
 const command=v9Command_(envelope.action,envelope.payload),fingerprint=v9Hash_(JSON.stringify([ctx.email,command]));
 return v9Lock_(()=>{
  const data=v9Data_(ctx.book),journal=v9Journal_(ctx.book),old=journal.find(r=>r.request===command.request);
  if(old&&old.fingerprint!==fingerprint)throw Error('IDEMPOTENCY_CONFLICT: request_id already bound');
  if(journal.some(r=>r.state==='PREPARED'&&r.request!==command.request))throw Error('RECOVERY_REQUIRED: different pending transaction');
  if(old){if(old.state==='PREPARED')return v9Replay_(ctx.book,old);v9Validate_(data);v9CheckCommitted_(data,journal,null);v9EnsurePublished_(ctx.book);return old.plan.result}
  v9Validate_(data);v9CheckCommitted_(data,journal,null);
  if(journal.length>=V9_LIMIT)throw Error('Journal capacity exceeded');
  v9PublicationReady_(ctx.book,data,journal);
  const masks={};V9_TABLES.forEach(n=>{masks[n]={length:data[n].length,hash:v9Hash_(JSON.stringify(v9Masked_(data,n,[],data[n].length)))}});
  const result={request_id:command.request,outcome:'CLOSED_UNAPPLIED'},plan={v:9,kind:'CLOSED',request:command.request,fingerprint,actor:ctx.email,command,targets:[],masks,result};
  v9SealPlan_(plan);const json=JSON.stringify(plan),row=journal.length+2;
  bridgeTable_(ctx.book,'V9_JOURNAL').getRange(row,1,1,6).setValues([[command.request,fingerprint,'CLOSED',json,v9Hash_(json),JSON.stringify(result)]]);SpreadsheetApp.flush();
  const record=v9Journal_(ctx.book).find(r=>r.request===command.request);
  if(!record||record.state!=='CLOSED'||!v9Equal_(record.plan,plan))throw Error('JOURNAL_CORRUPT: close readback');
  return result;
 });
}
function v9PlanMac_(plan){
 const copy={};Object.keys(plan).forEach(k=>{if(k!=='plan_hmac')copy[k]=plan[k]});
 return Utilities.computeHmacSha256Signature('KEVITU_JOURNAL_V9B:'+JSON.stringify(copy),pubKey_(),Utilities.Charset.UTF_8).map(x=>(x&255).toString(16).padStart(2,'0')).join('');
}
function v9SealPlan_(plan){plan.plan_hmac=v9PlanMac_(plan);return plan}
