'use strict';
const vm=require('node:vm'),crypto=require('node:crypto');
const H={
 ACARA:['ID_ACARA','NAMA_ACARA','TARIKH_ACARA','STATUS','CATATAN','DICIPTA_PADA','DIKEMASKINI_PADA'],
 MATA_ACARA:['ID_ACARA','RUMAH_SUKAN','MATA','DIKEMASKINI_PADA','DIKEMASKINI_OLEH'],
 KEDUDUKAN:['RUMAH_SUKAN','JUMLAH_MATA','KEDUDUKAN','JUMLAH_ACARA','DIKEMASKINI_PADA'],
 LOG_MATA:['ID_LOG','TIMESTAMP','ID_ACARA','RUMAH_SUKAN','MATA_LAMA','MATA_BAHARU','TINDAKAN','ADMIN_ID'],
 V9_JOURNAL:['REQUEST_ID','FINGERPRINT','STATE','PLAN_JSON','CHECKSUM','RESULT_JSON']
};
const plain=x=>JSON.parse(JSON.stringify(x));
function make(source,snapshot){
 const q={email:'admin@example.invalid',props:{SPREADSHEET_ID:'1j8xz7G2CksaZt_LOVvSSk8fVsC78LXMVDgioF2tqQ-E',OAUTH_CLIENT_ID:'mock',ADMIN_EMAILS:'admin@example.invalid,second@example.invalid',BRIDGE_V9_ENABLED:'true'},locked:false,boundaries:[],inject:null,onPersist:null,formulas:{}};
 function boundary(label,apply){q.boundaries.push(label);let i=q.boundaries.length;if(q.inject?.at===i&&q.inject.when==='before')throw Error('FAULT before '+label);apply();if(q.onPersist)q.onPersist(q.snapshot());if(q.inject?.at===i&&q.inject.when==='after')throw Error('FAULT after '+label);}
 const sheets={};for(const[n,headers]of Object.entries(H)){sheets[n]={data:plain(snapshot?.[n]||[headers]),getLastRow(){let k=this.data.length;while(k>1&&this.data[k-1].every(v=>v===''||v==null))k--;return k},getRange(r,c,nr=1,nc=1){const sh=this;const read=()=>Array.from({length:nr},(_,i)=>Array.from({length:nc},(_,j)=>sh.data[r-1+i]?.[c-1+j]??''));return {getValues:read,getDisplayValues:()=>read().map(row=>row.map(v=>String(v))),getFormulas:()=>Array.from({length:nr},(_,i)=>Array.from({length:nc},(_,j)=>q.formulas[n+':'+(r+i)+':'+(c+j)]||'')),setValues(values){if(values.length!==nr||values.some(x=>x.length!==nc))throw Error('Mock range shape');boundary(n+'.setValues['+r+','+c+','+nr+','+nc+']',()=>{values.forEach((row,i)=>{sh.data[r-1+i]??=[];row.forEach((v,j)=>{sh.data[r-1+i][c-1+j]=v})})});return this},setValue(v){if(nr!==1||nc!==1)throw Error('Mock setValue shape');return this.setValues([[v]])},clearContent(){boundary(n+'.clearContent',()=>{for(let i=0;i<nr;i++)for(let j=0;j<nc;j++)if(sh.data[r-1+i])sh.data[r-1+i][c-1+j]=''});return this}}},appendRow(row){boundary(n+'.appendRow',()=>this.data.push([...row]));return this}}}
 q.sheets=sheets;q.snapshot=()=>plain(Object.fromEntries(Object.entries(sheets).map(([n,s])=>[n,s.data])));q.rows=n=>sheets[n].data.slice(1).filter(r=>r.some(v=>v!==''&&v!=null));
 const book={getSheetByName:n=>sheets[n],getName:()=> 'QA MOCK ONLY'};
 const out=t=>({text:t,setMimeType(){return this}});
 q.c=vm.createContext({Date,Number,String,Set,Map,Math,JSON,Object,Array,console:{error(){}},PropertiesService:{getScriptProperties:()=>({getProperty:k=>q.props[k]||null})},Session:{getActiveUser:()=>({getEmail:()=>q.email})},SpreadsheetApp:{openById:()=>book,flush:()=>boundary('SpreadsheetApp.flush',()=>{})},LockService:{getScriptLock:()=>({waitLock(){if(q.locked)throw Error('MOCK_BUSY');q.locked=true},releaseLock(){q.locked=false}})},Utilities:{DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(_a,text)=>Array.from(crypto.createHash('sha256').update(text,'utf8').digest()).map(v=>v>127?v-256:v),getUuid:()=>crypto.randomUUID(),formatDate:(d,tz)=>{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d),get=k=>parts.find(p=>p.type===k).value;return get('year')+'-'+get('month')+'-'+get('day')}},ContentService:{createTextOutput:out,MimeType:{JSON:'json'}},HtmlService:{createHtmlOutput:out}});
 vm.runInContext(source,q.c,{timeout:5000});q.save=p=>plain(q.c.apiSaveKevituEvent(p));q.cancel=p=>plain(q.c.apiCancelKevituEvent(p));q.list=()=>plain(q.c.apiListKevituEvents());q.recover=id=>plain(q.c.apiRecoverKevituTransaction(id));return q;
}
function payload(id='request-create-0001',over={}){return {request_id:id,nama_acara:'QA Event',tarikh_acara:'2026-11-01',status:'SELESAI',mata_MERAH:10,mata_BIRU:10,mata_HIJAU:5,mata_KUNING:0,...over};}
module.exports={H,plain,make,payload};
