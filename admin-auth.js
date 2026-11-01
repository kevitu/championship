'use strict';
/* KEVITU API Executable: OAuth access token in memory only. */
const KEVITU_CLIENT_ID='556436437882-flsu8vhvkt2cmsvbbp0nm3mtn7s0cth0.apps.googleusercontent.com';
const API_URL='https://script.googleapis.com/v1/scripts/AKfycby7JmaCo93QYuetstRvCQkGTV8l1I-y8Jxlu3lDfnHs5ggs_3IW8IVidOsHhI_nnj3z:run';
const API_SCOPES='https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/script.external_request';
const $=id=>document.getElementById(id);
const ids=['existing','eventName','eventDate','eventStatus','merah','biru','hijau','kuning'];
let accessToken='',expiry=0,authorised=false,busy=false,events=[],tokenClient;
function status(t){$('bridge-status').textContent=t}
function message(t){$('operation-status').textContent=t}
function selected(){return events.find(x=>x.id_acara===$('existing').value)}
function enable(){
 const ready=authorised&&!!accessToken&&Date.now()<expiry&&!busy;
 ids.forEach(id=>$(id).disabled=!ready);
 $('save').disabled=!ready||selected()?.status==='BATAL';
 $('cancel').disabled=!ready||!selected()||selected().status==='BATAL';
}
function fill(){
 const e=selected();
 $('eventName').value=e?.nama_acara||'';
 $('eventDate').value=e?.tarikh_acara||'';
 $('eventStatus').value=e?.status==='SELESAI'?'SELESAI':'AKTIF';
 for(const [house,id] of [['MERAH','merah'],['BIRU','biru'],['HIJAU','hijau'],['KUNING','kuning']])$(id).value=e?.mata?.[house]??'';
 enable();
}
function renderEvents(preferred=''){
 const s=$('existing');s.replaceChildren(new Option('+ Acara baharu',''));
 for(const e of events)s.add(new Option(e.id_acara+' · '+e.nama_acara+' ['+e.status+']',e.id_acara));
 s.value=preferred;fill();
}
async function run(functionName,params=[]){
 if(!accessToken||Date.now()>=expiry)throw Error('Sesi Google tamat. Log masuk semula.');
 busy=true;enable();
 try{
  const response=await fetch(API_URL,{method:'POST',headers:{'Authorization':'Bearer '+accessToken,'Content-Type':'application/json'},body:JSON.stringify({function:functionName,parameters:params,devMode:false}),cache:'no-store'});
  const json=await response.json().catch(()=>({}));
  if(!response.ok)throw Error('Apps Script API '+response.status+' — semak kebenaran OAuth atau deployment');
  if(json.error)throw Error(json.error.message||'Operasi API gagal');
  if(!json.done||!json.response)throw Error('API belum memulangkan keputusan');
  return json.response.result;
 }finally{busy=false;enable()}
}
async function refresh(preferred=''){
 try{const result=await run('apiListKevituEvents');if(!Array.isArray(result))throw Error('Format senarai salah');events=result;authorised=true;renderEvents(preferred);status('Akses Admin disahkan.');}
 catch(e){authorised=false;enable();status('Akses Admin gagal: '+e.message);}
}
function clearSession(){
 if(accessToken&&window.google?.accounts?.oauth2)google.accounts.oauth2.revoke(accessToken,()=>{});
 accessToken='';expiry=0;authorised=false;events=[];renderEvents();$('signout').hidden=true;
 $('login-status').textContent='Log masuk Google diperlukan.';status('Log masuk untuk semakan Admin.');
}
function onToken(response){
 if(response.error||!response.access_token){status('Google OAuth gagal.');return}
 accessToken=response.access_token;expiry=Date.now()+(Number(response.expires_in)||3600)*1000-60000;
 authorised=false;
 $('signout').hidden=false;$('login-status').textContent='Kebenaran Google diperoleh. Menyemak Admin melalui API…';
 status('Sedang menyemak akaun Admin…');refresh();
}
function start(){
 if(!window.google?.accounts?.oauth2){$('login-status').textContent='Google OAuth tidak tersedia. Refresh halaman.';return}
 tokenClient=google.accounts.oauth2.initTokenClient({client_id:KEVITU_CLIENT_ID,scope:API_SCOPES,callback:onToken});
 const button=$('google-signin');button.replaceChildren();
 const btn=document.createElement('button');btn.type='button';btn.textContent='Sign in with Google';btn.addEventListener('click',()=>tokenClient.requestAccessToken({prompt:'consent'}));
 button.append(btn);enable();
}
$('existing').addEventListener('change',fill);
$('signout').addEventListener('click',clearSession);
$('save').addEventListener('click',async()=>{
 if(!authorised||busy)return;
 const event=selected();
 const body={id_acara:event?.id_acara||'',nama_acara:$('eventName').value.trim(),tarikh_acara:$('eventDate').value,status:$('eventStatus').value};
 if(!body.nama_acara||!body.tarikh_acara)return message('Nama dan tarikh acara diperlukan.');
 for(const [h,id] of [['MERAH','merah'],['BIRU','biru'],['HIJAU','hijau'],['KUNING','kuning']])body['mata_'+h]=$(id).value;
 message('Menyimpan…');
 try{const r=await run('apiSaveKevituEvent',[body]);message('Berjaya: '+r.id_acara+'. Refresh dashboard selepas 60 saat.');await refresh(r.id_acara)}
 catch(e){message('Ralat: '+e.message+'. Semak mata sebelum cuba lagi; jangan auto-retry.')}
});
$('cancel').addEventListener('click',async()=>{
 const e=selected();if(!e||busy||!authorised||!confirm('Batal acara '+e.id_acara+'?'))return;
 message('Membatalkan…');
 try{await run('apiCancelKevituEvent',[e.id_acara]);message('Acara telah dibatalkan.');await refresh(e.id_acara)}
 catch(err){message('Ralat: '+err.message)}
});
window.addEventListener('load',start);
