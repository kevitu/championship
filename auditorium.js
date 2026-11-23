'use strict';
// Public display only: no admin endpoints, authentication or write actions.
const HOUSES=[
{id:'MERAH',name:'Rumah Merah',image:'./assets/img/houses/rumah_merah.png',colour:'#f04b55'},
{id:'BIRU',name:'Rumah Biru',image:'./assets/img/houses/rumah_biru.png',colour:'#459bfa'},
{id:'HIJAU',name:'Rumah Hijau',image:'./assets/img/houses/rumah-hijau.png',colour:'#4ccd99'},
{id:'KUNING',name:'Rumah Kuning',image:'./assets/img/houses/rumah_kuning.png',colour:'#f6c74b'}];
const $=id=>document.getElementById(id);
let busy=false;
function status(message,state){$('status').textContent=message;$('dot').className='dot '+state}
function readPublic(endpoint){
 return new Promise((resolve,reject)=>{
  const url=new URL(endpoint);
  if(url.protocol!=='https:'||url.hostname!=='script.google.com'||!url.pathname.endsWith('/exec')){reject(Error('Endpoint tidak diluluskan'));return}
  // The deployed public GAS endpoint accepts exactly this callback name.
  const callback='kevituPublicCallback';
  const script=document.createElement('script');
  const timer=setTimeout(()=>finish(Error('Timeout API')),15000);
  function finish(error,data){clearTimeout(timer);delete window[callback];script.remove();error?reject(error):resolve(data)}
  window[callback]=data=>finish(null,data);
  script.onerror=()=>finish(Error('Ralat rangkaian'));
  url.searchParams.set('callback',callback);
  script.src=url.href;document.head.append(script);
 });
}
function validate(data){
 if(!data||!Array.isArray(data.kedudukan)||data.kedudukan.length!==4)throw Error('Data kedudukan tidak sah');
 const ids=new Set();
 for(const row of data.kedudukan){
  if(!HOUSES.some(h=>h.id===row.rumah_sukan)||ids.has(row.rumah_sukan)||!Number.isFinite(row.jumlah_mata)||row.jumlah_mata<0||!Number.isInteger(row.kedudukan)||row.kedudukan<1)throw Error('Data rumah sukan tidak sah');
  ids.add(row.rumah_sukan);
 }
 return data.kedudukan;
}
function render(rows){
 const ranked=rows.some(r=>r.jumlah_mata>0||r.jumlah_acara>0);
 const ordered=[...HOUSES].sort((a,b)=>ranked?(rows.find(r=>r.rumah_sukan===a.id).kedudukan-rows.find(r=>r.rumah_sukan===b.id).kedudukan):0);
 const container=$('houses');container.replaceChildren();
 for(const house of ordered){
  const row=rows.find(r=>r.rumah_sukan===house.id);
  const article=document.createElement('article');article.className='house';article.style.setProperty('--house',house.colour);
  const img=document.createElement('img');img.src=house.image;img.alt='Logo '+house.name;
  const rank=document.createElement('div');rank.className='rank';rank.textContent=ranked?'KEDUDUKAN #'+row.kedudukan:'BELUM ADA KEDUDUKAN';
  const title=document.createElement('h2');title.textContent=house.name;
  const points=document.createElement('div');points.className='points';points.textContent=String(row.jumlah_mata);
  const unit=document.createElement('div');unit.className='unit';unit.textContent='MATA';
  article.append(img,rank,title,points,unit);container.append(article);
 }
}
async function refresh(){
 if(busy||document.hidden)return;
 busy=true;status('Mengemas kini…','');
 try{
  const endpoint=String(window.KEVITU_PUBLIC_READ_URL||'').trim();
  if(!endpoint)throw Error('Konfigurasi API tiada');
  const payload=await readPublic(endpoint);
  if(!payload?.ok)throw Error('Respons API gagal');
  render(validate(payload.data));
  $('updated').textContent='Berjaya dikemas kini: '+new Date().toLocaleTimeString('ms-MY',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  status('Data rasmi berjaya dimuatkan','ok');
 }catch(error){status('Gagal kemas kini — paparan terakhir dikekalkan','error');$('updated').textContent='Sila semak sambungan dan cuba semula';}
 finally{busy=false}
}
$('refresh').addEventListener('click',refresh);
$('fullscreen').addEventListener('click',()=>{if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen?.().catch(()=>{});});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
refresh();setInterval(refresh,60000);
