'use strict';
const vm=require('node:vm'),crypto=require('node:crypto'),{plain}=require('../security-v9/mock.cjs');
class El{
 constructor(tag='div',doc){this.tagName=tag.toUpperCase();this.doc=doc;this.children=[];this.listeners={};this.value='';this.disabled=false;this.hidden=false;this.textContent='';this.style={setProperty(k,v){this[k]=v}};this.attributes={}}
 set value(v){this._value=String(v)}get value(){return this._value||''}
 set id(v){this._id=v;if(this.doc)this.doc.map.set(v,this)}get id(){return this._id}
 append(...nodes){for(let n of nodes){n.parentElement=this;this.children.push(n)}}replaceChildren(...nodes){this.children=[];this.append(...nodes)}
 add(n){this.append(n)}after(n){(this.parentElement||this.doc.root).append(n)}
 setAttribute(k,v){this.attributes[k]=v}addEventListener(k,fn){(this.listeners[k]??=[]).push(fn)}
 async fire(k){if(this.disabled&&k==='click')return;for(const f of this.listeners[k]||[])await f({type:k,target:this})}
}
function shared(){return{storage:new Map(),locks:new Set(),pages:[]}}
function frontend(source,q,space=shared(),options={}){
 const doc={map:new Map(),createElement(t){return new El(t,this)},getElementById(id){return this.map.get(id)}};doc.root=new El('body',doc);
 for(const id of ['existing','eventName','eventDate','eventStatus','merah','biru','hijau','kuning','save','cancel','operation-status','bridge-status','login-status','google-signin','signout']){let e=new El(id==='existing'||id==='eventStatus'?'select':'div',doc);e.id=id;doc.root.append(e)}
 doc.getElementById('eventStatus').value='AKTIF';
 const page={doc,space,calls:[],mode:null,email:options.email||'admin@example.invalid',storageFail:false,revoked:0,windowEvents:{},width:options.width||1280};
 const localStorage={getItem(k){if(page.storageFail)throw Error('Storage unavailable');return space.storage.get(k)??null},setItem(k,v){if(page.storageFail)throw Error('Storage unavailable');space.storage.set(k,String(v));for(const p of space.pages)if(p!==page)for(const f of p.windowEvents.storage||[])f({key:k,newValue:v})},removeItem(k){if(page.storageFail)throw Error('Storage unavailable');space.storage.delete(k);for(const p of space.pages)if(p!==page)for(const f of p.windowEvents.storage||[])f({key:k,newValue:null})}};
 const window={addEventListener(k,fn){(page.windowEvents[k]??=[]).push(fn)},innerWidth:page.width};
 let tokenCallback;
 window.google={accounts:{oauth2:{initTokenClient(c){tokenCallback=c.callback;return{requestAccessToken(){return tokenCallback({access_token:'SYNTHETIC_TOKEN_NOT_REAL',expires_in:3600})}}},revoke(_t,cb){page.revoked++;cb()}}}};
 const navigator={locks:{async request(name,_opts,fn){if(space.locks.has(name))return fn(null);space.locks.add(name);try{return await fn({name})}finally{space.locks.delete(name)}}}};
 const fetch=async(_url,opts)=>{
  const body=JSON.parse(opts.body);page.calls.push(plain(body));if(page.mode==='before'){page.mode=null;throw Error('Network lost before response')}
  const before=q.email;q.email=page.email;
  try{
   let result;try{result=q.c[body.function](...(body.parameters||[]))}catch(e){return{ok:true,status:200,json:async()=>({done:true,error:{message:'Script error',details:[{errorMessage:e.message}]}})}}
   if(page.mode==='after'){page.mode=null;throw Error('Network lost after commit')}
   if(page.mode==='mismatch'){page.mode=null;result={...result,request_id:'wrong-request-0001'}}
   if(page.mode==='defer'){page.mode=null;return await new Promise(resolve=>{page.resolveFetch=()=>resolve({ok:true,status:200,json:async()=>({done:true,response:{result}})})})}
   return{ok:true,status:200,json:async()=>({done:true,response:{result}})};
  }finally{q.email=before}
 };
 const ctx=vm.createContext({window,document:doc,navigator,localStorage,crypto:{randomUUID:()=>crypto.randomUUID()},google:window.google,fetch,Date,JSON,Object,Array,Number,String,Map,Set,Promise,AbortController,setTimeout,clearTimeout,console,confirm:()=>true,Option:function(t,v){let e=new El('option',doc);e.textContent=t;e.value=v;return e}});
 vm.runInContext(source,ctx);page.c=ctx;page.$=id=>doc.getElementById(id);page.click=async id=>{let e=page.$(id);if(!e)throw Error('Missing control '+id);await e.fire('click');await page.idle()};page.idle=async()=>{for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r))};
 page.login=async()=>{ctx.start();await tokenCallback({access_token:'SYNTHETIC_TOKEN_NOT_REAL',expires_in:3600});await page.idle()};
 page.form=(over={})=>{for(const[k,v]of Object.entries({eventName:'UI QA',eventDate:'2026-11-01',eventStatus:'SELESAI',merah:'10',biru:'5',hijau:'0',kuning:'0',...over}))page.$(k).value=v};
 page.pending=()=>[...space.storage.entries()].filter(([k])=>k.startsWith('kevitu.v9.pending.')).map(([,v])=>JSON.parse(v));
 space.pages.push(page);return page;
}
module.exports={frontend,shared};
