/**
 * KEVITU Public Reader V9-B — QA only, strictly read-only.
 * Reads only signed immutable snapshots + descriptor; never physical score tabs.
 * No shared lock with Bridge. Cache60s; signed24h expiry enforced on every read.
 */
'use strict';

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

const CACHE_KEY='kevitu_signed_public_v1';
function pubTable_(book,name,header){
 const sh=book.getSheetByName(name);if(!sh||sh.getLastRow()<1||sh.getLastRow()>2001)throw Error('Snapshot schema unavailable');
 if(sh.getRange(1,1).getFormulas().some(r=>r.some(Boolean)))throw Error('Snapshot header formula forbidden');
 if(sh.getRange(1,1).getDisplayValues()[0][0]!==header)throw Error('Snapshot header invalid');
 return sh;
}
function pubCell_(sh,row){
 const range=sh.getRange(row,1);if(range.getFormulas().some(r=>r.some(Boolean)))throw Error('Snapshot formula forbidden');
 const value=range.getValues()[0][0];if(typeof value!=='string')throw Error('Snapshot cell invalid');return value;
}
function pubLoad_(){
 const id=String(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')||'').trim();
 if(id!==PUB_WORKBOOK_ID)throw Error('STOP: unapproved LIVE workbook');
 pubKey_();
 const book=SpreadsheetApp.openById(id),ptr=pubTable_(book,'V9_PUBLIC_POINTER','POINTER_JSON');
 if(ptr.getLastRow()!==2)throw Error('Snapshot pointer missing');
 const before=pubCell_(ptr,2),p=pubPointer_(before),snap=pubTable_(book,'V9_PUBLIC_SNAPSHOTS','SNAPSHOT_JSON');
 const text=pubCell_(snap,p.row),after=pubCell_(ptr,2);pubPointer_(after);
 if(before!==after)throw Error('Snapshot changed during read');
 pubDecode_(p,text);return {pointer:p,snapshot_json:text};
}
function publicSnapshot_(){const r=pubLoad_();return pubDecode_(r.pointer,r.snapshot_json)}
function doGet(e){
 const callback=String(e&&e.parameter&&e.parameter.callback||'');
 if(callback!=='kevituPublicCallback')return ContentService.createTextOutput(JSON.stringify({ok:false,error:'Invalid callback'})).setMimeType(ContentService.MimeType.JSON);
 let result;
 try{
  // Pin/key checked even on cache hits. Never serve an expired or unauthenticated LKG.
  if(String(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')||'').trim()!==PUB_WORKBOOK_ID)throw Error('STOP: unapproved workbook');
  pubKey_();const cache=CacheService.getScriptCache(),cached=cache.get(CACHE_KEY);
  const r=cached?JSON.parse(cached):pubLoad_(),data=pubDecode_(r.pointer,r.snapshot_json);
  if(!cached){const packed=JSON.stringify(r);if(packed.length<=30000){try{cache.put(CACHE_KEY,packed,Math.max(1,Math.min(60,Math.floor((Date.parse(r.pointer.expires_at)-Date.now())/1000))))}catch(cacheError){/* Optional cache: verified data may be served uncached. */}}}
  result={ok:true,data};
 }catch(err){console.error('Public snapshot unavailable');result={ok:false,error:'Data tidak tersedia'}}
 const json=JSON.stringify(result).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
 return ContentService.createTextOutput('kevituPublicCallback('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
}
