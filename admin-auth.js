'use strict';
/* KEVITU API Executable: OAuth access token in memory only. */
const KEVITU_CLIENT_ID='556436437882-flsu8vhvkt2cmsvbbp0nm3mtn7s0cth0.apps.googleusercontent.com';
const API_URL='https://script.googleapis.com/v1/scripts/AKfycbwTHh9hIeFQXALpkZwqwwyr1WGCZTOux-hUpJj4knw3dRImwdnvmYpUHO9J99o9UJ9g:run';
const API_SCOPES='https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/script.external_request';
const $=id=>document.getElementById(id);
const ids=['existing','eventName','eventDate','eventStatus','merah','biru','hijau','kuning'];
let accessToken='',expiry=0,authorised=false,writing=false,reading=false,listReady=false,events=[],tokenClient,context=null,pending=null,session=0,storageBlocked=false;
function status(t){$('bridge-status').textContent=t}
function message(t){$('operation-status').textContent=t}
function selected(){return events.find(x=>x.id_acara===$('existing').value)}
function storageKey(){if(!context)throw Error('AUTH_REQUIRED');return 'kevitu.v9.pending.'+context.scope+'.'+context.actor}
function supported(){return !!navigator.locks?.request&&!!crypto.randomUUID}
function enable(){
 const auth=authorised&&!!accessToken&&Date.now()<expiry&&!!context;
 const idle=auth&&!writing&&!reading&&!storageBlocked&&supported(),ready=idle&&listReady&&!pending;
 ids.forEach(id=>$(id).disabled=!ready);
 $('save').disabled=!ready||selected()?.status==='BATAL';
 $('cancel').disabled=!ready||!selected()||selected().status==='BATAL';
 $('retry-pending').hidden=!pending;$('close-pending').hidden=!pending;
 $('retry-pending').disabled=!idle||!pending;$('close-pending').disabled=!idle||!pending;
 $('refresh-events').disabled=!idle;
}
function fill(){
 const e=selected();
 $('eventName').value=e?.nama_acara||'';$('eventDate').value=e?.tarikh_acara||'';
 $('eventStatus').value=e?.status==='SELESAI'?'SELESAI':'AKTIF';
 for(const[h,id]of [['MERAH','merah'],['BIRU','biru'],['HIJAU','hijau'],['KUNING','kuning']])$(id).value=e?.mata?.[h]??'';
 enable();
}
function renderEvents(preferred=''){
 const s=$('existing');s.replaceChildren(new Option('+ Acara baharu',''));
 for(const e of events)s.add(new Option(e.id_acara+' · '+e.nama_acara+' ['+e.status+']',e.id_acara));
 s.value=preferred;fill();
}
function validRecord(r){
 if(!r||Object.keys(r).sort().join(',')!=='action,actor,payload,schema,scope'||r.schema!==1||r.actor!==context.actor||r.scope!==context.scope||
 !['save','cancel'].includes(r.action)||!r.payload||typeof r.payload!=='object'||Array.isArray(r.payload)||
 !/^[a-z0-9][a-z0-9_-]{15,79}$/i.test(r.payload.request_id))throw Error('STORAGE_BLOCKED: metadata operasi tidak sah');
 const p=r.payload,allowed=r.action==='save'?['request_id','id_acara','expected_revision','nama_acara','tarikh_acara','status','mata_MERAH','mata_BIRU','mata_HIJAU','mata_KUNING']:['request_id','id_acara','expected_revision'];
 if(Object.keys(p).some(k=>!allowed.includes(k))||typeof p.id_acara!=='string'||(p.id_acara&&!/^EVT\d{3,}$/.test(p.id_acara))||
 (p.id_acara&&!/^[a-f0-9]{64}$/.test(p.expected_revision))||(r.action==='cancel'&&!p.id_acara))throw Error('STORAGE_BLOCKED: kontrak operasi tidak sah');
 if(r.action==='save'){
  if(typeof p.nama_acara!=='string'||!p.nama_acara.trim()||p.nama_acara.length>120||/^[\s]*[=+@-]|[<>\x00-\x1f\x7f]/.test(p.nama_acara)||
  typeof p.tarikh_acara!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(p.tarikh_acara)||!Number.isFinite(Date.parse(p.tarikh_acara+'T00:00:00Z'))||
  new Date(p.tarikh_acara+'T00:00:00Z').toISOString().slice(0,10)!==p.tarikh_acara||!['AKTIF','SELESAI'].includes(p.status))throw Error('INPUT_INVALID: nama, tarikh atau status tidak sah');
  for(const h of ['MERAH','BIRU','HIJAU','KUNING']){const v=p['mata_'+h];if(typeof v!=='string'||(v!==''&&(!/^\d+(?:\.\d+)?$/.test(v)||!Number.isFinite(Number(v))||Number(v)<0||Number(v)>1000000)))throw Error('INPUT_INVALID: mata mesti antara 0 dan 1000000')}
 }
 return Object.freeze({...r,payload:Object.freeze({...p})});
}
function readPending(){
 const raw=localStorage.getItem(storageKey());return raw?validRecord(JSON.parse(raw)):null;
}
function persist(r){
 const key=storageKey(),raw=JSON.stringify(r);
 if(localStorage.getItem(key))throw Error('STORAGE_BLOCKED: operasi lama belum selesai');
 localStorage.setItem(key,raw);if(localStorage.getItem(key)!==raw)throw Error('STORAGE_BLOCKED: metadata tidak kekal');
 pending=r;
}
function clearConfirmed(r){
 const key=storageKey(),raw=localStorage.getItem(key);
 if(raw!==JSON.stringify(r))throw Error('STORAGE_BLOCKED: metadata berubah; jangan padam');
 localStorage.removeItem(key);if(localStorage.getItem(key)!==null)throw Error('STORAGE_BLOCKED: metadata tidak dapat dipadam');
 pending=null;
}
async function run(functionName,parameters=[]){
 if(!accessToken||Date.now()>=expiry)throw Error('AUTH_REQUIRED: Sesi Google tamat. Log masuk semula.');
 const epoch=session,token=accessToken,controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
 try{
  const response=await fetch(API_URL,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({function:functionName,parameters,devMode:false}),cache:'no-store',signal:controller.signal});
  const json=await response.json();
  if(epoch!==session)throw Error('AUTH_REQUIRED: sesi telah berubah');
  if(!response.ok)throw Error('AUTH_OR_NETWORK: Apps Script API '+response.status);
  if(json.error)throw Error(json.error.details?.find(d=>d.errorMessage)?.errorMessage||json.error.message||'Operasi API gagal');
  if(!json.done||!json.response)throw Error('UNKNOWN_OUTCOME: keputusan API belum disahkan');
  return json.response.result;
 }finally{clearTimeout(timer)}
}
function showError(e){
 const t=String(e.message||e);
 if(/STALE_REVISION/.test(t))message('Konflik STALE_REVISION: acara sudah berubah. Request asal dikekalkan; tutup request ini untuk muat semula.');
 else if(/RECOVERY_REQUIRED/.test(t))message('RECOVERY_REQUIRED: operasi memerlukan pemulihan. Cuba semula request asal atau rujuk Admin pemulihan.');
 else if(/AUTH_REQUIRED|Admin tidak|401|403/.test(t)){authorised=false;message('Log masuk Google semula. Request asal kekal untuk akaun yang sama.')}
 else if(/STORAGE|INPUT_INVALID/.test(t))message(t);
 else message('Hasil belum pasti. Request dan payload asal dikekalkan; gunakan Cuba semula. '+t);
}
async function refresh(preferred=''){
 if(!authorised||!context)return;
 const epoch=session;reading=true;enable();
 try{
  const result=await run('apiListKevituEvents');
  if(!Array.isArray(result)||result.some(e=>!e||!/^[a-f0-9]{64}$/.test(e.revision)))throw Error('MIGRATION_REQUIRED: senarai/revision V9 tidak sah');
  if(epoch!==session)return;
  events=result;listReady=true;renderEvents(preferred);status('Akses Admin V9 disahkan.');
 }catch(e){if(epoch===session){listReady=false;showError(e);status('Senarai belum tersedia. '+String(e.message||e))}}
 finally{if(epoch===session){reading=false;enable()}}
}
function matching(r,result){
 if(!result||result.request_id!==r.payload.request_id)return false;
 if(result.outcome==='CLOSED_UNAPPLIED')return Object.keys(result).sort().join(',')==='outcome,request_id';
 return /^EVT\d{3,}$/.test(result.id_acara)&&/^[a-f0-9]{64}$/.test(result.revision)&&
 (r.payload.id_acara===''||result.id_acara===r.payload.id_acara)&&
 (r.action==='cancel'?result.status==='BATAL':result.status===r.payload.status);
}
async function send(r,close){
 const result=await run(close?'apiCloseKevituRequest':r.action==='save'?'apiSaveKevituEvent':'apiCancelKevituEvent',close?[{action:r.action,payload:r.payload}]:[r.payload]);
 if(!matching(r,result))throw Error('UNKNOWN_OUTCOME: keputusan tidak sepadan dengan request asal');
 clearConfirmed(r);
 message(result.outcome==='CLOSED_UNAPPLIED'?'Request ditutup tanpa perubahan.':'Hasil disahkan: '+result.id_acara+'. Snapshot awam akan dikemas kini dalam 60 saat.');
 await refresh(result.id_acara||r.payload.id_acara||'');
}
function newRecord(action){
 const e=selected(),p={request_id:crypto.randomUUID(),id_acara:e?.id_acara||''};
 if(e)p.expected_revision=e.revision;
 if(action==='save'){
  p.nama_acara=$('eventName').value.trim();p.tarikh_acara=$('eventDate').value;p.status=$('eventStatus').value;
  for(const[h,id]of [['MERAH','merah'],['BIRU','biru'],['HIJAU','hijau'],['KUNING','kuning']])p['mata_'+h]=$(id).value.trim();
 }
 return validRecord({schema:1,actor:context.actor,scope:context.scope,action,payload:p});
}
async function operate(mode){
 if(!authorised||!context||writing||reading||storageBlocked)return;
 if(!supported()){storageBlocked=true;message('STORAGE_BLOCKED: browser memerlukan Web Locks dan UUID selamat.');enable();return}
 const epoch=session;writing=true;enable();
 try{
  const key=storageKey();
  await navigator.locks.request(key,{ifAvailable:true},async lock=>{
   if(!lock){message('Operasi sedang diproses dalam tab lain. Jangan hantar request baharu.');return}
   if(epoch!==session)return;
   pending=readPending();enable();
   if(mode==='retry'||mode==='close'){
    if(!pending){message('Tiada request tertunggak.');return}
    if(mode==='close'&&!confirm('Selesaikan atau tutup request asal? Jika telah diproses, hasil asal akan dipulangkan.'))return;
    await send(pending,mode==='close');return;
   }
   if(pending){message('Request lama belum selesai. Gunakan Cuba semula; jangan ubah payload.');return}
   if(!listReady)throw Error('RECOVERY_REQUIRED: muat semula senarai dahulu');
   if(mode==='cancel'&&(!selected()||!confirm('Batal acara '+selected().id_acara+'?')))return;
   const r=newRecord(mode);persist(r);enable();await send(r,false);
  });
 }catch(e){if(epoch===session){if(/STORAGE|storage|Storage/.test(String(e.message||e)))storageBlocked=true;showError(e)}}
 finally{if(epoch===session){writing=false;enable()}}
}
function clearSession(revoke=true){
 const token=accessToken;
 session++;accessToken='';expiry=0;authorised=false;writing=false;reading=false;listReady=false;context=null;pending=null;events=[];storageBlocked=false;
 if(revoke&&token&&window.google?.accounts?.oauth2)google.accounts.oauth2.revoke(token,()=>{});
 renderEvents();$('signout').hidden=true;$('login-status').textContent='Log masuk Google diperlukan. Request tertunggak disimpan tanpa token.';
 status('Log masuk untuk semakan Admin.');enable();
}
async function onToken(response){
 // Receiving a replacement token must not revoke the same OAuth grant.
 clearSession(false);
 if(response.error||!response.access_token){status('Google OAuth gagal.');return}
 const epoch=session;accessToken=response.access_token;expiry=Date.now()+(Number(response.expires_in)||3600)*1000-60000;
 $('signout').hidden=false;$('login-status').textContent='Menyemak identiti dan protokol Admin V9…';
 try{
  const ctx=await run('apiGetKevituAdminContext');
  if(ctx?.protocol!==9||ctx?.publication_protocol!==1||!/^[a-f0-9]{64}$/.test(ctx.actor)||!/^[a-f0-9]{64}$/.test(ctx.scope))throw Error('MIGRATION_REQUIRED: backend V9-B diperlukan');
  if(epoch!==session)return;
  context=ctx;authorised=true;
  if(!supported())throw Error('STORAGE_BLOCKED: browser memerlukan Web Locks dan UUID selamat');
  pending=readPending();
  $('login-status').textContent='Akses Admin disahkan. Token Google hanya dalam memori.';
  if(pending)message('Request belum selesai ditemui. Payload asal dikunci; gunakan Cuba semula atau Selesaikan / tutup.');
  await refresh(pending?.payload.id_acara||'');
 }catch(e){if(epoch===session){if(/STORAGE|Storage|storage/.test(String(e.message||e)))storageBlocked=true;else authorised=false;showError(e);status('Akses belum tersedia. '+String(e.message||e))}}
 finally{if(epoch===session)enable()}
}
function start(){
 if(!window.google?.accounts?.oauth2){$('login-status').textContent='Google OAuth tidak tersedia. Refresh halaman.';return}
 tokenClient=google.accounts.oauth2.initTokenClient({client_id:KEVITU_CLIENT_ID,scope:API_SCOPES,callback:onToken});
 const button=$('google-signin');button.replaceChildren();const btn=document.createElement('button');btn.type='button';btn.textContent='Sign in with Google';
 btn.addEventListener('click',()=>tokenClient.requestAccessToken({prompt:'consent'}));button.append(btn);enable();
}
const controls=document.createElement('div');controls.className='admin-grid';
for(const[id,text]of [['retry-pending','Cuba semula request asal'],['close-pending','Selesaikan / tutup request'],['refresh-events','Muat semula acara']]){
 const b=document.createElement('button');b.id=id;b.type='button';b.textContent=text;controls.append(b);
}
$('operation-status').after(controls);
$('existing').addEventListener('change',fill);$('signout').addEventListener('click',clearSession);
$('save').addEventListener('click',()=>operate('save'));$('cancel').addEventListener('click',()=>operate('cancel'));
$('retry-pending').addEventListener('click',()=>operate('retry'));$('close-pending').addEventListener('click',()=>operate('close'));
$('refresh-events').addEventListener('click',()=>refresh(selected()?.id_acara||''));
window.addEventListener('storage',e=>{
 if(!context||e.key!==storageKey())return;
 try{pending=readPending();if(!pending&&!writing)refresh(selected()?.id_acara||'');else message('Request tertunggak disegerakkan dari tab lain. Payload dikunci.')}
 catch(err){storageBlocked=true;showError(err)}
 enable();
});
window.addEventListener('load',start);
enable();
