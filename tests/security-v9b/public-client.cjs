'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{frontend,shared}=require('./dom.cjs'),{make}=require('../security-v9/mock.cjs');
const root=path.resolve(__dirname,'../..'),app=fs.readFileSync(root+'/app.js','utf8'),bridge=fs.readFileSync(root+'/gas/bridge/Code.gs','utf8'),auth=fs.readFileSync(root+'/admin-auth.js','utf8');
const page=frontend(auth,make(bridge));for(const id of ['houses','events','connection','updated']){const e=page.doc.createElement('div');e.id=id;page.doc.root.append(e)}page.doc.head=page.doc.createElement('head');
const window={matchMedia:()=>({matches:false}),KEVITU_PUBLIC_READ_URL:''};
const ctx=vm.createContext({window,document:page.doc,URL,Date,JSON,Number,String,Set,Math,performance:{now:()=>0},requestAnimationFrame:fn=>fn(1000)});
vm.runInContext(app,ctx);const now=Date.now(),data={kedudukan:['MERAH','BIRU','HIJAU','KUNING'].map(h=>({rumah_sukan:h,jumlah_mata:0,kedudukan:1,jumlah_acara:0})),acara:[],publication:{generation:0,policy:'signed_committed_snapshot',published_at:new Date(now).toISOString(),expires_at:new Date(now+86400000).toISOString(),age_seconds:0,cache_max_age_seconds:60}};
const results=[];function test(id,fn){try{fn();results.push({id,status:'PASS'})}catch(e){results.push({id,status:'FAIL',detail:e.message})}}
test('V9 public client accepts verified publication metadata',()=>assert(ctx.validate(data)));
test('V9 public client refuses V8 raw publication without provenance',()=>{const d={...data};delete d.publication;assert.throws(()=>ctx.validate(d),/snapshot|Snapshot|publication/i)});
test('V9 public client refuses expired snapshot',()=>assert.throws(()=>ctx.validate({...data,publication:{...data.publication,expires_at:new Date(now-1).toISOString()}}),/snapshot|Snapshot|publication/i));
test('counter preserves final fractional points',()=>{let e=page.doc.createElement('span');ctx.countUp(e,0.3);assert.equal(e.textContent,'0.3')});
const out={timestamp:new Date().toISOString(),summary:{total:results.length,pass:results.filter(x=>x.status==='PASS').length,fail:results.filter(x=>x.status==='FAIL').length},results};fs.writeFileSync(__dirname+'/evidence/public-client-results.json',JSON.stringify(out,null,2));module.exports=out;
