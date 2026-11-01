'use strict';
// OFFLINE QA helper only: synthetic identity, in-memory Sheets, no Google network.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),{make}=require('../security-v9/mock.cjs');
async function start(port=0){
 const root=path.resolve(__dirname,'../..'),backend=make(fs.readFileSync(root+'/gas/bridge/Code.gs','utf8')),state={mode:'normal',calls:[]};
 const bootstrap='<aside style="padding:12px;background:#fff1b8;color:#111">QA MOCK ONLY — no LIVE or real OAuth. <button onclick="fetch(\'/mode/unknown\',{method:\'POST\'})">QA: unknown outcome</button> <button onclick="fetch(\'/mode/drop\',{method:\'POST\'})">QA: network drop</button> <button onclick="fetch(\'/mode/normal\',{method:\'POST\'})">QA: normal</button></aside><script>window.google={accounts:{oauth2:{initTokenClient:c=>({requestAccessToken:()=>c.callback({access_token:\'SYNTHETIC_BROWSER_TOKEN_NOT_REAL\',expires_in:3600})}),revoke:(_t,c)=>c()}}};const qaFetch=window.fetch.bind(window);window.fetch=(u,o={})=>String(u).startsWith(\'https://script.googleapis.com/\')?qaFetch(\'/rpc\',{...o,headers:{\'Content-Type\':\'application/json\'}}):String(u).startsWith(\'/\')?qaFetch(u,o):Promise.reject(Error(\'QA blocks external network\'));</script>';
 const server=http.createServer(async(req,res)=>{
  try{
   res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'");
   if(req.url.startsWith('/mode/')){const mode=req.url.slice(6);if(!['normal','unknown','drop'].includes(mode))throw Error('Invalid mode');state.mode=mode;res.end('QA '+mode);return}
   if(req.url==='/rpc'){
    let raw='';for await(const c of req){raw+=c;if(raw.length>20000)throw Error('Body limit')}
    const rpc=JSON.parse(raw),allowed=['apiGetKevituAdminContext','apiListKevituEvents','apiSaveKevituEvent','apiCancelKevituEvent','apiCloseKevituRequest'];
    if(!allowed.includes(rpc.function))throw Error('Forbidden QA method');state.calls.push(rpc);
    let output;
    try{const result=backend.c[rpc.function](...(rpc.parameters||[]));if(rpc.function==='apiSaveKevituEvent'&&state.mode==='drop'){res.destroy();return}if(rpc.function==='apiSaveKevituEvent'&&state.mode==='unknown')throw Error('QA_UNKNOWN_OUTCOME_AFTER_COMMIT');output={done:true,response:{result}}}
    catch(e){output={done:true,error:{details:[{errorMessage:e.message}]}}}
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify(output));return;
   }
   const file=req.url==='/'||req.url==='/admin.html'?'admin.html':req.url==='/admin-auth.js'?'admin-auth.js':req.url==='/styles.css'?'styles.css':null;
   if(!file){res.statusCode=404;res.end('QA asset absent');return}
   let text=fs.readFileSync(root+'/'+file,'utf8');
   if(file==='admin.html')text=text.replace(/<script src="https:\/\/accounts.google.com\/gsi\/client" async defer><\/script>/,'').replace(/<script src="\.\/pwa.js" defer><\/script>/,'').replace(/<script src="\.\/admin-config.js" defer><\/script>/,'').replace('<body>','<body>'+bootstrap);
   res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(text);
  }catch(e){res.statusCode=500;res.end('QA request refused')}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve)});
 return {server,backend,state,url:'http://127.0.0.1:'+server.address().port+'/admin.html'};
}
module.exports={start};
if(require.main===module)start().then(x=>console.log('LOCAL MOCK ONLY: '+x.url)).catch(e=>{console.error(e.message);process.exitCode=1});
