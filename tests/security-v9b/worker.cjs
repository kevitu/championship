'use strict';
const fs=require('node:fs'),{parentPort,workerData}=require('node:worker_threads'),{make}=require('../security-v9/mock.cjs');
const q=make(fs.readFileSync(workerData.source,'utf8')),a=new Int32Array(workerData.shared);q.email=workerData.email||q.email;
q.onPersist=s=>{fs.writeFileSync(workerData.state,JSON.stringify(s));parentPort.postMessage({kind:'sample',snapshot:s})};
q.c.LockService={getScriptLock:()=>({waitLock(){while(Atomics.compareExchange(a,0,0,1)!==0)Atomics.wait(a,0,1,100);const s=JSON.parse(fs.readFileSync(workerData.state,'utf8'));for(const n of Object.keys(q.sheets))q.sheets[n].data=s[n];q.locked=true},releaseLock(){q.locked=false;Atomics.store(a,0,0);Atomics.notify(a,0)}})};
Atomics.add(a,1,1);while(!Atomics.load(a,2))Atomics.wait(a,2,0,100);
try{const result=q.c[workerData.method](workerData.payload);parentPort.postMessage({kind:'result',ok:true,result})}catch(e){parentPort.postMessage({kind:'result',ok:false,error:e.message})}
