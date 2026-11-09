'use strict';
// Public scoreboard only. Admin writes occur through separately authorised API.
const HOUSES=[
{id:'MERAH',name:'Rumah Merah',image:'./assets/img/houses/rumah_merah.png',fallback:'🔴',colour:'#f04b55',identity:'Pantang Menyerah'},
{id:'BIRU',name:'Rumah Biru',image:'./assets/img/houses/rumah_biru.png',fallback:'🐉',colour:'#459bfa',identity:'Semangat Kental Pantang Mundur'},
{id:'HIJAU',name:'Rumah Hijau',image:'./assets/img/houses/rumah-hijau.png',fallback:'🐢',colour:'#4ccd99',identity:'Green Turtle'},
{id:'KUNING',name:'Rumah Kuning',image:'./assets/img/houses/rumah_kuning.png',fallback:'🐝',colour:'#f6c74b',identity:'Sengat Sampai Menang'}];
const $=id=>document.getElementById(id);
function element(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e}
const REDUCED_MOTION=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function countUp(node,target){if(REDUCED_MOTION){node.textContent=String(target);return}const start=performance.now(),duration=950;function tick(now){const t=Math.min((now-start)/duration,1);node.textContent=String(Math.round(target*(1-Math.pow(1-t,3))));if(t<1)requestAnimationFrame(tick)}requestAnimationFrame(tick)}
function drawHouses(items){
 const container=$('houses');container.replaceChildren();container.setAttribute('aria-busy',items?'false':'true');
 if(!items){for(let i=0;i<4;i++){const skeleton=element('article','house house-skeleton');skeleton.setAttribute('aria-hidden','true');skeleton.append(element('div','skeleton-logo'),element('div','skeleton-line'),element('div','skeleton-line short'),element('div','skeleton-line short'));container.append(skeleton)}return}
 const ranked=items.some(r=>r.jumlah_acara>0)||items.some(r=>r.jumlah_mata>0);
 const ordered=[...HOUSES].sort((a,b)=>{if(!ranked)return HOUSES.indexOf(a)-HOUSES.indexOf(b);const ar=items.find(x=>x.rumah_sukan===a.id),br=items.find(x=>x.rumah_sukan===b.id);return (ar?.kedudukan??99)-(br?.kedudukan??99)||HOUSES.indexOf(a)-HOUSES.indexOf(b)});
 const podiumOrder=ranked?[ordered[1],ordered[0],ordered[2],ordered[3]]:ordered;
 for(const [i,h] of podiumOrder.entries()){
  const row=items.find(x=>x.rumah_sukan===h.id);const rank=ranked?row?.kedudukan:null;
  const card=element('article','house podium-card '+(ranked?'podium-slot-'+(i+1):'podium-neutral'));card.style.setProperty('--house',h.colour);card.style.setProperty('--podium-delay',i*100+'ms');card.style.setProperty('--podium-rise',rank===1?'0px':rank===2?'22px':rank===3?'44px':'66px');
  const frame=element('div','logo-frame'),img=element('img','house-logo');img.src=h.image;img.alt='Logo '+h.name;img.loading='lazy';img.decoding='async';img.addEventListener('error',()=>{frame.replaceChildren(element('span','logo-fallback',h.fallback))},{once:true});frame.append(img);
  const label=rank?'KEDUDUKAN #'+rank:'BELUM ADA KEDUDUKAN';
  const pointWrap=element('div','points'),numeric=element('span','point-number','0');pointWrap.append(numeric,element('small','',' mata'));
  card.append(frame,element('div','rank',label),element('h3','',h.name),element('p','sub',h.identity),pointWrap);
  const pedestal=element('div','podium-base');pedestal.style.setProperty('--house',h.colour);pedestal.append(element('span','',rank?'#'+rank:'—'));card.append(pedestal);container.append(card);countUp(numeric,row?.jumlah_mata??0);
 }
}
function formatEventDate(value){const s=String(value||'');return /^\d{4}-\d{2}-\d{2}$/.test(s)?s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4):s}
function drawEvents(items){
 const el=$('events');el.replaceChildren();
 if(!items?.length){el.append(element('p','muted','Belum ada acara rasmi untuk dipaparkan.'));return}
 for(const item of items){
  const row=element('article','event'),meta=element('div');
  const dates=item.tarikh_acara?(item.tarikh_tamat?formatEventDate(item.tarikh_acara)+' – '+formatEventDate(item.tarikh_tamat):formatEventDate(item.tarikh_acara)):'Tarikh belum ditetapkan';
  meta.append(element('strong','',item.nama_acara),element('small','',dates));
  const points=element('div','event-points');
  for(const h of HOUSES){
   const tile=element('span','event-point event-point-'+h.id.toLowerCase());
   const score=item.mata?.[h.id];
   tile.append(element('span','event-point-name',h.name),element('b','',typeof score==='number'&&Number.isFinite(score)?score:'—'),element('span','event-point-unit','mata'));
   points.append(tile);
  }
  meta.append(points);
  row.append(meta,element('span','status',item.status));el.append(row);
 }
}
function validate(payload){if(!payload||!Array.isArray(payload.kedudukan)||!Array.isArray(payload.acara))throw Error('Format API tidak sah');if(payload.kedudukan.length!==4||new Set(payload.kedudukan.map(x=>x.rumah_sukan)).size!==4||payload.kedudukan.some(x=>!HOUSES.some(h=>h.id===x.rumah_sukan)||!Number.isFinite(x.jumlah_mata)||x.jumlah_mata<0||!Number.isInteger(x.kedudukan)||x.kedudukan<1))throw Error('Kedudukan API tidak sah');return payload}
function readPublicJsonp(endpoint){return new Promise((resolve,reject)=>{let done=false;const script=document.createElement('script');const url=new URL(endpoint);if(url.protocol!=='https:'||url.hostname!=='script.google.com'||!url.pathname.endsWith('/exec')){reject(Error('Unapproved endpoint'));return;}url.searchParams.set('callback','kevituPublicCallback');const finish=(err,data)=>{if(done)return;done=true;delete window.kevituPublicCallback;script.remove();err?reject(err):resolve(data)};window.kevituPublicCallback=data=>finish(null,data);script.onerror=()=>finish(Error('Network error'));script.src=url.href;document.head.append(script);});}
async function init(){drawHouses(null);drawEvents([]);const endpoint=String(window.KEVITU_PUBLIC_READ_URL||'').trim();if(!endpoint){$('connection').textContent='Paparan V1 · Menunggu sambungan API rasmi';return}try{const json=await readPublicJsonp(endpoint);if(!json.ok)throw Error('API tidak berjaya');const data=validate(json.data);drawHouses(data.kedudukan);drawEvents(data.acara);$('connection').textContent='Kedudukan rasmi berjaya dimuatkan';$('updated').textContent='Dikemas kini semasa halaman dibuka'}catch(err){$('connection').textContent='Kedudukan belum tersedia — cuba lagi kemudian';$('updated').textContent='Tiada data sah';}}
init();