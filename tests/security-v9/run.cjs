'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
module.exports=(async()=>{
 const log=console.log;let baseline;
 try{console.log=()=>{};require('./baseline/security-tests.cjs');baseline=JSON.parse(fs.readFileSync(__dirname+'/baseline/results.json','utf8'))}
 finally{console.log=log}
 assert.deepEqual(baseline.summary,{total:54,pass:40,fail:14},'Historical baseline unexpectedly changed');
 const oldParallel=await require('./baseline/parallel-tests.cjs');assert.equal(oldParallel.status,'PASS');
 const regression=require('./regression.cjs'),parallel=await require('./parallel.cjs');
 const result={baseline:{total:55,pass:41,fail:14,sourceCommit:baseline.commit},v9:{total:regression.summary.total+parallel.summary.total,pass:regression.summary.pass+parallel.summary.pass,fail:regression.summary.fail+parallel.summary.fail},deferred:[{id:'3.public duplicate BATAL event rejected',status:'FAIL',reason:'Public Reader unchanged by explicit scope lock'}],notVerified:['Real GAS/Sheets deployment, quotas and permissions','Public read isolation across scripts','Current frontend compatibility; migration documented but not implemented']};
 fs.writeFileSync(__dirname+'/evidence/summary.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(result.v9.fail)process.exitCode=1;return result;
})().catch(e=>{console.error(e);process.exitCode=1});
