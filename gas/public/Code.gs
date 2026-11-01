/**
 * KEVITU Public Scoreboard Reader — separate standalone GAS project.
 * READ ONLY. Do not copy Admin doPost() into this project.
 * Script Properties: SPREADSHEET_ID of approved scoreboard workbook.
 */
const HOUSES=['MERAH','BIRU','HIJAU','KUNING'];
const VALID_STATUS=new Set(['AKTIF','SELESAI']);
function readRows_(sheetName,width,headers) {
  const id=PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if(!id)throw Error('Missing configuration');
  const sheet=SpreadsheetApp.openById(id).getSheetByName(sheetName);
  if(!sheet)throw Error('Missing tab');
  const head=sheet.getRange(1,1,1,width).getDisplayValues()[0];
  if(head.some((v,i)=>v!==headers[i]))throw Error('Invalid headers');
  const count=sheet.getLastRow()-1;
  return count?sheet.getRange(2,1,count,width).getDisplayValues():[];
}
function publicSnapshot_() {
  const events=readRows_('ACARA',7,['ID_ACARA','NAMA_ACARA','TARIKH_ACARA','STATUS','CATATAN','DICIPTA_PADA','DIKEMASKINI_PADA']);
  const scores=readRows_('MATA_ACARA',5,['ID_ACARA','RUMAH_SUKAN','MATA','DIKEMASKINI_PADA','DIKEMASKINI_OLEH']);
  const eligible=new Map();
  events.forEach(r=>{const id=r[0].trim(),status=r[3].trim();if(id&&VALID_STATUS.has(status)){if(eligible.has(id))throw Error('Duplicate event');eligible.set(id,{id_acara:id,nama_acara:r[1],tarikh_acara:r[2],status});}});
  const acc=new Map(HOUSES.map(h=>[h,{rumah_sukan:h,jumlah_mata:0,jumlah_acara:0}]));
  const seen=new Set();
  scores.forEach(r=>{
    const id=r[0].trim(),house=r[1].trim(),key=id+':'+house;
    if(seen.has(key))throw Error('Duplicate score');
    seen.add(key);
    if(!eligible.has(id))return;
    if(!acc.has(house))throw Error('Unknown house');
    if(r[2].trim()==='')return;
    const n=Number(r[2]);if(!Number.isFinite(n)||n<0)throw Error('Invalid points');
    const a=acc.get(house);a.jumlah_mata+=n;a.jumlah_acara++;
  });
  const leaderboard=Array.from(acc.values()).sort((a,b)=>b.jumlah_mata-a.jumlah_mata||a.rumah_sukan.localeCompare(b.rumah_sukan));
  leaderboard.forEach(x=>{x.kedudukan=1+leaderboard.filter(y=>y.jumlah_mata>x.jumlah_mata).length;});
  return {kedudukan:leaderboard,acara:Array.from(eligible.values())};
}
function doGet(e) {
  const callback=String(e&&e.parameter&&e.parameter.callback||'');
  // Only a fixed callback name is permitted, preventing arbitrary JS expressions.
  if(callback!=='kevituPublicCallback') {
    return ContentService.createTextOutput(JSON.stringify({ok:false,error:'Use approved read callback'}))
      .setMimeType(ContentService.MimeType.JSON);
  }
  let result;
  try{result={ok:true,data:publicSnapshot_()};}
  catch(err){result={ok:false,error:'Data tidak tersedia'};}
  const js='kevituPublicCallback('+JSON.stringify(result).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029')+');';
  return ContentService.createTextOutput(js).setMimeType(ContentService.MimeType.JAVASCRIPT);
}
