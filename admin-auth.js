'use strict';
const KEVITU_OAUTH_CLIENT_ID='556436437882-flsu8vhvkt2cmsvbbp0nm3mtn7s0cth0.apps.googleusercontent.com';
const $=id=>document.getElementById(id);
const bridge=String(window.KEVITU_ADMIN_BRIDGE_URL||'').trim();
let credential='',events=[],pending=null,busy=false,authorised=false;
const fields=['existing','eventName','eventDate','eventStatus','merah','biru','hijau','kuning'];
function validBridge(){
  try {const u=new URL(bridge);return u.protocol==='https:'&&u.hostname==='script.google.com'&&u.pathname.endsWith('/exec')}catch(_){return false}
}
function status(t){$('bridge-status').textContent=t}
function message(t){$('operation-status').textContent=t}
function selected(){return events.find(x=>x.id_acara===$('existing').value)}
function enable(){
  const ok=!!credential&&authorised&&validBridge()&&!busy;
  for(const id of fields)$(id).disabled=!ok;
  const item=selected();
  $('save').disabled=!ok||item?.status==='BATAL';
  $('cancel').disabled=!ok||!item||item.status==='BATAL';
}
function fill(){
 const item=selected();
 $('eventName').value=item?.nama_acara||'';
 $('eventDate').value=item?.tarikh_acara||'';
 $('eventStatus').value=item?.status==='SELESAI'?'SELESAI':'AKTIF';
 for(const [house,id] of [['MERAH','merah'],['BIRU','biru'],['HIJAU','hijau'],['KUNING','kuning']])$(id).value=item?.mata?.[house]??'';
 enable();
}
function renderEvents(preferred=''){
 const selector=$('existing');selector.replaceChildren(new Option('+ Acara baharu',''));
 events.forEach(item=>selector.add(new Option(item.id_acara+' · '+item.nama_acara+' ['+item.status+']',item.id_acara)));
 selector.value=preferred;
 fill();
}
function request(action,payload){
 if(!credential||!validBridge())return Promise.reject(Error('Sambungan Admin belum disahkan.'));
 if(pending)return Promise.reject(Error('Operasi sebelumnya belum selesai.'));
 busy=true;enable();
 const requestId='k'+Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
 return new Promise((resolve,reject)=>{
   const frame=document.createElement('iframe');
   frame.hidden=true;frame.name='kevitu-bridge-'+requestId;frame.title='KEVITU Admin Bridge';
   const form=document.createElement('form');form.method='POST';form.action=bridge;form.target=frame.name;form.hidden=true;
   const args={request_id:requestId,action,credential,payload:JSON.stringify(payload||{})};
   for(const [name,value] of Object.entries(args)){const input=document.createElement('input');input.type='hidden';input.name=name;input.value=value;form.append(input)}
   const watchdog=setTimeout(()=>{cleanup();reject(Error('Tiada respons daripada backend. Semak data sebelum cuba lagi.'))},30000);
   function cleanup(){clearTimeout(watchdog);window.removeEventListener('message',receive);frame.remove();form.remove();pending=null;busy=false;enable()}
   function receive(e){
     // HtmlService may execute from a sandboxed googleusercontent.com iframe.
     // Both frame source and exact message identifier are mandatory.
     if(e.source!==frame.contentWindow||!e.data||e.data.source!=='kevitu-admin-bridge'||e.data.requestId!==requestId)return;
     if(!['https://script.google.com','https://script.googleusercontent.com','null'].includes(e.origin))return;
     const data=e.data;cleanup();data.ok?resolve(data.data):reject(Error(data.error||'Operasi ditolak'));
   }
   window.addEventListener('message',receive);
   pending={requestId};
   document.body.append(frame,form);
   form.submit();
   // Intentionally no automatic retry on a write: unknown network outcome might have committed.
 });
}
async function refresh(preferred=''){
 try{const rows=await request('list',{});if(!Array.isArray(rows))throw Error('Format senarai tidak sah');events=rows;authorised=true;renderEvents(preferred);status('Akses Admin disahkan oleh backend DEV.');message('Acara berjaya dimuatkan.')}
 catch(e){authorised=false;enable();status('Admin belum boleh digunakan: '+e.message);message('');}
}
function onGoogleCredential(response){
 if(!response||typeof response.credential!=='string'){status('Google Sign-In gagal.');return}
 credential=response.credential;authorised=false;
 status('Sedang menghubungi backend DEV untuk semakan Admin…');
 $('login-status').textContent='Google Sign-In berjaya. Menyemak whitelist Admin dengan backend…';
 $('signout').hidden=false;enable();
 if(validBridge())refresh();else status('Google Sign-In berjaya. Backend DEV belum dipasang; fungsi simpan masih dikunci.');
}
$('existing').addEventListener('change',fill);
$('save').addEventListener('click',async()=>{
 if(busy||!credential)return;
 const id=selected()?.id_acara||'';
 const name=$('eventName').value.trim(),date=$('eventDate').value;
 if(!name||!date)return message('Nama acara dan tarikh diperlukan.');
 const payload={id_acara:id,nama_acara:name,tarikh_acara:date,status:$('eventStatus').value};
 for(const [house,input] of [['MERAH','merah'],['BIRU','biru'],['HIJAU','hijau'],['KUNING','kuning']])payload['mata_'+house]=$(input).value.trim();
 message('Menyimpan mata…');
 try{const response=await request('save',payload);message('Berjaya: '+response.id_acara+'. Paparan leaderboard mungkin mengambil masa 60 saat.');await refresh(response.id_acara)}
 catch(e){message('Gagal: '+e.message+' — jika permintaan terganggu, semak data dahulu; jangan hantar semula secara automatik.')}
});
$('cancel').addEventListener('click',async()=>{
 const item=selected();if(!item||busy||!confirm('Batalkan '+item.id_acara+'? Mata acara akan dikecualikan.'))return;
 message('Membatalkan…');
 try{await request('cancel',{id_acara:item.id_acara});message('Acara dibatalkan.');await refresh(item.id_acara)}
 catch(e){message('Gagal: '+e.message)}
});
$('signout').addEventListener('click',()=>{
 if(pending)return message('Selesaikan operasi terdahulu sebelum log keluar.');
 credential='';authorised=false;events=[];renderEvents();$('signout').hidden=true;
 window.google?.accounts?.id?.disableAutoSelect();
 $('login-status').textContent='Telah log keluar daripada sesi aplikasi.';
 status('Log masuk Admin diperlukan.');
});
function start(){
 if(!window.google?.accounts?.id){$('login-status').textContent='Google Sign-In tidak dimuatkan. Semak internet.';return}
 google.accounts.id.initialize({client_id:KEVITU_OAUTH_CLIENT_ID,callback:onGoogleCredential,auto_select:false});
 google.accounts.id.renderButton($('google-signin'),{theme:'outline',size:'large',text:'signin_with',shape:'rectangular'});
 enable();
}
window.addEventListener('load',start);
