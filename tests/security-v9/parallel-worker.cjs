'use strict';
const {parentPort,workerData}=require('node:worker_threads'),fs=require('node:fs');
const {make}=require('./mock.cjs');
const source=fs.readFileSync(workerData.source,'utf8'),q=make(source),a=new Int32Array(workerData.shared);
q.email=workerData.email||q.email;q.onPersist=s=>fs.writeFileSync(workerData.state,JSON.stringify(s));
q.c.LockService={getScriptLock:()=>({
 waitLock(){while(Atomics.compareExchange(a,0,0,1)!==0)Atomics.wait(a,0,1,100);const s=JSON.parse(fs.readFileSync(workerData.state,'utf8'));Object.keys(q.sheets).forEach(n=>{q.sheets[n].data=s[n]});q.locked=true},
 releaseLock(){q.locked=false;Atomics.store(a,0,0);Atomics.notify(a,0)}
})};
Atomics.add(a,1,1);Atomics.notify(a,1);while(Atomics.load(a,2)===0)Atomics.wait(a,2,0,100);
try{let result=workerData.action==='cancel'?q.cancel(workerData.payload):workerData.action==='recover'?q.recover(workerData.payload):q.save(workerData.payload);parentPort.postMessage({ok:true,result})}catch(e){parentPort.postMessage({ok:false,error:e.message})}
