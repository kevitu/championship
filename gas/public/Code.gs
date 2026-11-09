/**
 * KEVITU PUBLIC READ — hardened, read-only, approved LIVE workbook.
 * Spreadsheet ID belongs in private Script Properties: SPREADSHEET_ID.
 * Fail-closed against switching source to a different workbook.
 * No Admin functions, write methods, or participant information.
 * Cache 60 seconds; the public scoreboard may lag by up to one minute.
 */
'use strict';
const HOUSES = ['MERAH','BIRU','HIJAU','KUNING'];
const VALID_STATUS = new Set(['AKTIF','SELESAI']);
const CACHE_KEY = 'kevitu_public_snapshot_v3';
const CACHE_SECONDS = 60;
const MAX_ROWS = 2000;

function readRows_(book, name, headers) {
  const sheet = book.getSheetByName(name);
  if (!sheet) throw Error('Missing tab');
  const width = headers.length;
  const last = sheet.getLastRow();
  if (last < 1 || last - 1 > MAX_ROWS) throw Error('Row limit exceeded');
  const actual = sheet.getRange(1,1,1,width).getDisplayValues()[0];
  if (actual.some((v,i)=>v.trim()!==headers[i])) throw Error('Invalid headers');
  return last===1 ? [] : sheet.getRange(2,1,last-1,width).getDisplayValues();
}

function publicSnapshot_() {
  const id=String(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')||'').trim();
  if (id !== '1j8xz7G2CksaZt_LOVvSSk8fVsC78LXMVDgioF2tqQ-E') throw Error('STOP: unapproved LIVE workbook');
  const book=SpreadsheetApp.openById(id);
  const events=readRows_(book,'ACARA',['ID_ACARA','NAMA_ACARA','TARIKH_ACARA','STATUS','CATATAN','DICIPTA_PADA','DIKEMASKINI_PADA','TARIKH_TAMAT']);
  const scores=readRows_(book,'MATA_ACARA',['ID_ACARA','RUMAH_SUKAN','MATA','DIKEMASKINI_PADA','DIKEMASKINI_OLEH']);
  const eligible=new Map();
  events.forEach(r=>{
    const id=r[0].trim(),status=r[3].trim();
    if(!/^EVT\d{3,}$/.test(id)) throw Error('Invalid event ID');
    if(eligible.has(id)) throw Error('Duplicate event');
    if(VALID_STATUS.has(status)) {
      if(r[1].length>120||/[<>]/.test(r[1])) throw Error('Invalid event name');
      eligible.set(id,{id_acara:id,nama_acara:r[1],tarikh_acara:r[2],tarikh_tamat:r[7].trim(),status,mata:{MERAH:null,BIRU:null,HIJAU:null,KUNING:null}});
    } else if(status!=='BATAL') throw Error('Invalid event status');
  });
  const acc=new Map(HOUSES.map(h=>[h,{rumah_sukan:h,jumlah_mata:0,jumlah_acara:0}]));
  const seen=new Set();
  scores.forEach(r=>{
    const id=r[0].trim(),house=r[1].trim(),key=id+':'+house;
    if(seen.has(key)) throw Error('Duplicate score');
    seen.add(key);
    if(!eligible.has(id)) return;
    if(!acc.has(house)) throw Error('Unknown house');
    if(r[2].trim()==='') return;
    const value=Number(r[2]);
    if(!Number.isFinite(value)||value<0||value>1000000) throw Error('Invalid points');
    eligible.get(id).mata[house]=value;
    const item=acc.get(house);
    item.jumlah_mata+=value;
    if(!Number.isSafeInteger(Math.trunc(item.jumlah_mata))) throw Error('Invalid total');
    item.jumlah_acara++;
  });
  const leaderboard=Array.from(acc.values()).sort((a,b)=>b.jumlah_mata-a.jumlah_mata||HOUSES.indexOf(a.rumah_sukan)-HOUSES.indexOf(b.rumah_sukan));
  leaderboard.forEach(x=>{x.kedudukan=1+leaderboard.filter(y=>y.jumlah_mata>x.jumlah_mata).length});
  return {kedudukan:leaderboard,acara:Array.from(eligible.values())};
}

function doGet(e) {
  const callback=String(e&&e.parameter&&e.parameter.callback||'');
  if(callback!=='kevituPublicCallback') {
    return ContentService.createTextOutput(JSON.stringify({ok:false,error:'Invalid callback'}))
      .setMimeType(ContentService.MimeType.JSON);
  }
  let result;
  try {
    const cache=CacheService.getScriptCache();
    const cached=cache.get(CACHE_KEY);
    if(cached) result=JSON.parse(cached);
    else {
      result={ok:true,data:publicSnapshot_()};
      cache.put(CACHE_KEY,JSON.stringify(result),CACHE_SECONDS);
    }
  } catch(err) {
    console.error('Public Reader: '+String(err&&err.message||err));
    result={ok:false,error:'Data tidak tersedia'};
  }
  const json=JSON.stringify(result)
    .replace(/</g,'\\u003c')
    .replace(/\u2028/g,'\\u2028')
    .replace(/\u2029/g,'\\u2029');
  return ContentService.createTextOutput('kevituPublicCallback('+json+');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
