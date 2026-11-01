'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
module.exports=(async()=>{
 const base=__dirname+'/v9a-baseline/tests/security-v9',baselineReg=require(base+'/regression.cjs'),baselinePar=await require(base+'/parallel.cjs');
 assert.equal(baselineReg.summary.total+baselinePar.summary.total,331);assert.equal(baselineReg.summary.fail+baselinePar.summary.fail,0);
 const reg=require('../security-v9/regression.cjs'),oldWorkers=await require('../security-v9/parallel.cjs'),publication=require('./publication.cjs'),integration=await require('./integration.cjs'),concurrency=await require('./concurrency.cjs'),client=require('./public-client.cjs');
 const suites={expandedV9AOnV9B:reg.summary,v9AWorkerOnV9B:oldWorkers.summary,publication:publication.summary,adminIntegration:integration.summary,concurrency:concurrency.summary,publicClient:client.summary};
 const ids=new Set(reg.results.map(x=>x.id)),workerIds=new Set(oldWorkers.results.map(x=>x.id));
 assert(baselineReg.results.every(x=>ids.has(x.id)),'Original V9-A assertion omitted');assert(baselinePar.results.every(x=>workerIds.has(x.id)),'Original worker scenario omitted');
 const hashes={};for(const f of ['gas/bridge/Code.gs','gas/public/Code.gs','admin-auth.js','admin.html','app.js'])hashes[f]=crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,'../..',f))).digest('hex');
 const current=Object.values(suites).reduce((a,s)=>({total:a.total+s.total,pass:a.pass+s.pass,fail:a.fail+s.fail}),{total:0,pass:0,fail:0});
 const browser=JSON.parse(fs.readFileSync(__dirname+'/evidence/browser-results.json','utf8'));
 assert.equal(browser.sourceHashes.bridge,hashes['gas/bridge/Code.gs'],'Browser backend evidence from different bytes');
 assert.equal(browser.sourceHashes.admin,hashes['admin-auth.js'],'Browser Admin evidence from different bytes');
 const out={timestamp:new Date().toISOString(),runtime:process.version,baseline:{commit:'4234353c947f7c5f8a1527618345b5e16bdfe7f6',total:331,pass:331,fail:0},originalAssertionsRetained:331,current,suites,browser:{...browser.summary,scope:browser.surface},hashes,notVerified:['Real GAS/OAuth/Sheets identity, permissions, quotas and deployment','Physical mobile devices and browsers beyond this Chromium viewport run','Independent execution of full Node/DOM/worker/browser suite; separate reviewer pure checks recorded separately']};
 for(const[file,value]of [['summary.json',out],['v9a-on-v9b-regression.json',reg],['v9a-on-v9b-parallel.json',oldWorkers],['v9a-exact-baseline-regression.json',baselineReg],['v9a-exact-baseline-parallel.json',baselinePar]])fs.writeFileSync(__dirname+'/evidence/'+file,JSON.stringify(value,null,2));
 console.log(JSON.stringify(out,null,2));process.exitCode=current.fail?1:0;return out;
})().catch(e=>{console.error(e);process.exitCode=1;throw e});
