// Offline QA. Run: node security-tests.cjs (no packages/network/credentials).
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=__dirname,bridge=fs.readFileSync(root+'/source/gas/bridge/Code.gs','utf8'),pub=fs.readFileSync(root+'/source/gas/public/Code.gs','utf8'),dev=fs.readFileSync(root+'/source/gas/Code.gs','utf8');
const H={ACARA:['ID_ACARA','NAMA_ACARA','TARIKH_ACARA','STATUS','CATATAN','DICIPTA_PADA','DIKEMASKINI_PADA'],MATA_ACARA:['ID_ACARA','RUMAH_SUKAN','MATA','DIKEMASKINI_PADA','DIKEMASKINI_OLEH'],KEDUDUKAN:['RUMAH_SUKAN','JUMLAH_MATA','KEDUDUKAN','JUMLAH_ACARA','DIKEMASKINI_PADA'],LOG_MATA:['ID_LOG','TIMESTAMP','ID_ACARA','RUMAH_SUKAN','MATA_LAMA','MATA_BAHARU','TINDAKAN','ADMIN_ID']};
const results=[];
function test(id,fn){try{let detail=fn();results.push({id,status:'PASS',detail:detail||'Assertion satisfied'});}catch(e){results.push({id,status:'FAIL',detail:e.message});}}
function setup(code=bridge){
 const s={writes:[],fault:null,email:'admin@example.invalid',locked:false,trace:[],hook:null,uid:0,opens:0,props:{SPREADSHEET_ID:'1j8xz7G2CksaZt_LOVvSSk8fVsC78LXMVDgioF2tqQ-E',OAUTH_CLIENT_ID:'mock-client',ADMIN_EMAILS:'admin@example.invalid'}};
 const check=(n,m)=>{if(s.fault&&s.fault(n,m))throw Error('INJECTED '+n+'.'+m);};
 const sheets=Object.fromEntries(Object.entries(H).map(([n,h])=>[n,{data:[[...h]],getLastRow(){let k=this.data.length;while(k>1&&this.data[k-1].every(x=>x===''||x==null))k--;return k},getRange(r,c,nr=1,nc=1){let sh=this;return{getValues(){return Array.from({length:nr},(_,i)=>Array.from({length:nc},(_,j)=>sh.data[r-1+i]?.[c-1+j]??''))},getDisplayValues(){return this.getValues().map(row=>row.map(String))},setValues(v){check(n,'setValues');assert.equal(v.length,nr);for(let i=0;i<nr;i++){assert.equal(v[i].length,nc);sh.data[r-1+i]??=[];for(let j=0;j<nc;j++)sh.data[r-1+i][c-1+j]=v[i][j]}s.writes.push([n,'setValues']);if(s.hook)s.hook(n);return this},setValue(v){check(n,'setValue');sh.data[r-1]??=[];sh.data[r-1][c-1]=v;s.writes.push([n,'setValue']);return this},clearContent(){check(n,'clearContent');for(let i=0;i<nr;i++)for(let j=0;j<nc;j++)if(sh.data[r-1+i])sh.data[r-1+i][c-1+j]='';s.writes.push([n,'clearContent']);return this}}},appendRow(v){check(n,'appendRow');this.data.push([...v]);s.writes.push([n,'appendRow']);if(s.hook)s.hook(n);return this}}]));
 const book={getSheetByName:n=>sheets[n],getName:()=> 'QA MOCK ONLY'};
 const props={getProperty:k=>s.props[k]??null,setProperty(k,v){s.props[k]=v},deleteProperty(k){delete s.props[k]}};
 const out=t=>({text:t,setMimeType(){return this}});
 const ctx=vm.createContext({Date,Number,String,Set,Map,Math,JSON,console:{error(){}},Logger:{log(){}},PropertiesService:{getScriptProperties:()=>props},Session:{getActiveUser:()=>({getEmail:()=>s.email})},SpreadsheetApp:{openById(){s.opens++;return book},flush(){check('SpreadsheetApp','flush')}},LockService:{getScriptLock:()=>({waitLock(){s.trace.push('wait');if(s.locked)throw Error('MOCK_LOCK_BUSY');s.locked=true;s.trace.push('acquire')},releaseLock(){assert(s.locked);s.locked=false;s.trace.push('release')}})},Utilities:{getUuid:()=> 'mock-'+(++s.uid),formatDate:d=>d.toISOString().slice(0,10)},ContentService:{createTextOutput:out,MimeType:{JSON:'json',JAVASCRIPT:'js'}},HtmlService:{createHtmlOutput:out},CacheService:{getScriptCache:()=>({get:()=>null,put(){}})}});
 vm.runInContext(code,ctx,{timeout:2000});
 return {s,sheets,book,c:ctx,rows:n=>sheets[n].data.slice(1).filter(r=>r.some(x=>x!==''&&x!=null)),save:p=>ctx.apiSaveKevituEvent(p),snap:()=>JSON.stringify(Object.fromEntries(Object.entries(sheets).map(([n,sh])=>[n,sh.data])))};
}
const payload=(over={})=>({nama_acara:'QA Event',tarikh_acara:'2026-11-01',status:'SELESAI',mata_MERAH:10,mata_BIRU:10,mata_HIJAU:5,mata_KUNING:0,...over});
function rejectNoWrite(q,fn,pattern){assert.throws(fn,pattern);assert.equal(q.s.writes.length,0)}

const {parentPort,workerData}=require('node:worker_threads');
const shared=new Int32Array(workerData.shared),q=setup();
q.c.LockService={getScriptLock:()=>({waitLock(){while(Atomics.compareExchange(shared,0,0,1)!==0)Atomics.wait(shared,0,1,100);let state=JSON.parse(fs.readFileSync(workerData.state,'utf8'));for(let n of Object.keys(H))q.sheets[n].data=state[n];q.s.locked=true;q.s.trace.push('acquire')},releaseLock(){fs.writeFileSync(workerData.state,JSON.stringify(Object.fromEntries(Object.entries(q.sheets).map(([n,sh])=>[n,sh.data]))));q.s.locked=false;q.s.trace.push('release');Atomics.store(shared,0,0);Atomics.notify(shared,0)} })};
Atomics.add(shared,1,1);Atomics.notify(shared,1);while(Atomics.load(shared,2)===0)Atomics.wait(shared,2,0,100);
try{let r=q.save(payload({nama_acara:'QA worker '+workerData.index}));parentPort.postMessage({index:workerData.index,result:r,trace:q.s.trace})}catch(e){parentPort.postMessage({error:e.message})}
