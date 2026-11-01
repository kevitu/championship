'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{Worker}=require('node:worker_threads');
const {make,payload}=require('./mock.cjs');
const sourcePath=path.resolve(__dirname,'../../gas/bridge/Code.gs'),source=fs.readFileSync(sourcePath,'utf8');
module.exports=(async()=>{
 const results=[];fs.mkdirSync(__dirname+'/evidence',{recursive:true});
 async function run(id,q,jobs,verify){
  const shared=new SharedArrayBuffer(12),a=new Int32Array(shared),state=__dirname+'/evidence/parallel-state.json';
  fs.writeFileSync(state,JSON.stringify(q.snapshot()));
  const workers=[],tasks=jobs.map(job=>new Promise((resolve,reject)=>{
   const w=new Worker(__dirname+'/parallel-worker.cjs',{workerData:{shared,state,source:sourcePath,...job}});workers.push(w);
   w.once('message',resolve);w.once('error',reject);w.once('exit',c=>{if(c)reject(Error('worker exit '+c))});
  }));
  const start=Date.now();while(Atomics.load(a,1)<jobs.length){if(Date.now()-start>10000){for(const w of workers)await w.terminate();throw Error('Worker barrier timeout')}await new Promise(r=>setTimeout(r,5))}
  Atomics.store(a,2,1);Atomics.notify(a,2,jobs.length);
  const responses=await Promise.all(tasks),final=make(source,JSON.parse(fs.readFileSync(state,'utf8')));final.list();
  verify(responses,final);results.push({id,status:'PASS',responses,counts:Object.fromEntries(Object.keys(final.sheets).map(n=>[n,final.rows(n).length]))});
 }
 await run('duplicate create same request across workers',make(source),[{payload:payload()},{payload:payload()}],(rs,q)=>{assert(rs.every(x=>x.ok));assert.deepEqual(rs[0].result,rs[1].result);assert.equal(q.rows('ACARA').length,1);assert.equal(q.rows('LOG_MATA').length,4);assert.equal(q.rows('V9_JOURNAL').length,1)});
 await run('two independent creates',make(source),[{payload:payload('parallel-create-0001')},{payload:payload('parallel-create-0002')}],(rs,q)=>{assert(rs.every(x=>x.ok));assert.equal(new Set(rs.map(x=>x.result.id_acara)).size,2);assert.equal(q.rows('MATA_ACARA').length,8);assert.equal(q.rows('LOG_MATA').length,8);assert.equal(q.rows('KEDUDUKAN').find(r=>r[0]==='MERAH')[1],20)});
 let q=make(source),r=q.save(payload());
 await run('two admins stale edit race',q,[{email:'admin@example.invalid',payload:payload('parallel-edit-0001',{id_acara:r.id_acara,expected_revision:r.revision,mata_MERAH:20})},{email:'second@example.invalid',payload:payload('parallel-edit-0002',{id_acara:r.id_acara,expected_revision:r.revision,mata_MERAH:30})}],rs=>{assert.equal(rs.filter(x=>x.ok).length,1);assert.match(rs.find(x=>!x.ok).error,/STALE/)});
 q=make(source);r=q.save(payload());
 await run('cancel versus edit stale race',q,[{action:'cancel',payload:{request_id:'parallel-cancel-0001',id_acara:r.id_acara,expected_revision:r.revision}},{payload:payload('parallel-edit-0003',{id_acara:r.id_acara,expected_revision:r.revision,mata_MERAH:20})}],rs=>{assert.equal(rs.filter(x=>x.ok).length,1);assert.match(rs.find(x=>!x.ok).error,/STALE/)});
 q=make(source);r=q.save(payload());const c={request_id:'parallel-cancel-0002',id_acara:r.id_acara,expected_revision:r.revision};
 await run('duplicate concurrent cancel',q,[{action:'cancel',payload:c},{action:'cancel',payload:c}],(rs,q)=>{assert(rs.every(x=>x.ok));assert.deepEqual(rs[0].result,rs[1].result);assert.equal(q.rows('LOG_MATA').filter(r=>r[6]==='BATAL_ACARA').length,1);assert(q.rows('KEDUDUKAN').every(r=>r[1]===0))});
 q=make(source);q.inject={at:3,when:'after'};assert.throws(()=>q.save(payload()),/FAULT/);q=make(source,q.snapshot());
 await run('concurrent retry versus operator recovery',q,[{payload:payload()},{action:'recover',payload:payload().request_id}],(rs,q)=>{assert(rs.every(x=>x.ok));assert.deepEqual(rs[0].result,rs[1].result);assert.equal(q.rows('LOG_MATA').length,4)});
 const out={timestamp:new Date().toISOString(),summary:{total:results.length,pass:results.length,fail:0},limitation:'Real Node worker concurrency; mock Sheets and Atomics LockService. Actual Google service locking and quotas NOT VERIFIED.',results};
 fs.writeFileSync(__dirname+'/evidence/parallel-results.json',JSON.stringify(out,null,2));return out;
})();
