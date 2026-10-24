import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import crypto from "node:crypto";

const code=readFileSync(new URL("./Code.gs",import.meta.url),"utf8");
const cache=new Map();
const userRows=[
 ["Emel","Nama","Pentadbir","Aktif"],
 ["guru@moe-dl.edu.my","CIKGU GURU",false,true],
 ["admin@moe-dl.edu.my","PENTADBIR SEKOLAH",true,true],
 ["inactive@moe-dl.edu.my","TIDAK AKTIF",false,false]
];
function sheet(rows){
  return {
    rows,
    getDataRange(){return {getValues:()=>rows.map(r=>r.slice())}},
    getLastRow(){return rows.length},
    getRange(row,col,rs=1,cs=1){
      return {
        getValue:()=>rows[row-1]?.[col-1]??"",
        setValue(value){
          while(rows.length<row)rows.push([]);
          rows[row-1][col-1]=value;
        },
        setValues(values){
          while(rows.length<row+rs-1)rows.push([]);
          for(let i=0;i<rs;i++)for(let j=0;j<cs;j++)rows[row-1+i][col-1+j]=values[i][j];
        }
      };
    },
    appendRow(values){rows.push(values.slice());},
    deleteRow(row){rows.splice(row-1,1);}
  };
}
const primary={
 "SETTING":sheet([["ITEM","KAEDAH","NILAI / SENARAI"],["TAHUN PENILAIAN","INPUT","2027"],["FOLDER DRIVE EVIDEN","INPUT","test-folder"]]),
 "SENARAI STANDARD":sheet([["Standard","No Item","Aspek","Huraian"],["STANDARD 1: KEPIMPINAN","1.1.1","Standard 1.1 PGB Sebagai Peneraju","Penerangan item"]]),
 "SENARAI PPS":sheet([["Standard","Aspek","Nama Guru","Peranan"]]),
 "SENARAI SEMAK":sheet([["Bilangan","Status","Perkara","PIC","Catatan"]]),
 "JAWATANKUASA SK@S":sheet([["Bilangan","Jawatan","Nama Penuh","Level Carta"]]),
 "EVIDEN":sheet([["ID","Tahun","Pemuat Naik","Standard","No Item","Aspek","Huraian","PDCA","Jenis","Tajuk","Catatan","Pautan","Tarikh","Pemuat Email"]])
};
let uuidCounter=0;
let bridgeSuccess=true;
let lastBridgeMethod="";
let lastBridgeToken="";
const sandbox={
 console,JSON,Date,Number,String,Boolean,Object,Array,Error,Math,
 Logger:{log(){}},
 PropertiesService:{getScriptProperties(){return {getProperty(k){
   return {SPES_DB_ID:"db",EKEBERADAAN_DB_ID:"ek",EKEBERADAAN_WEB_APP_URL:"https://example.org/exec",AUTH_BRIDGE_ORIGIN:"https://example.github.io"}[k]||"";
 }}}},
 SpreadsheetApp:{openById(id){
   if(id==="db")return {getSheetByName:name=>primary[name]||null};
   if(id==="ek")return {getSheetByName:name=>name==="PENGGUNA"?sheet(userRows):null};
   throw new Error("unknown database ID");
 }},
 CacheService:{getScriptCache(){return {get:k=>cache.get(k)||null,put:(k,v)=>cache.set(k,v),remove:k=>cache.delete(k)}}},
 LockService:{getScriptLock(){return {waitLock(){},releaseLock(){}}}},
 Utilities:{
   getUuid:()=>String(++uuidCounter).padStart(8,"0")+"-abcd-1234-efgh-5678",
   computeDigest:(alg,text)=>[...crypto.createHash("sha256").update(String(text)).digest()],
   base64EncodeWebSafe:a=>Buffer.from(a).toString("base64url"),
   DigestAlgorithm:{SHA_256:"SHA_256"},
   formatDate:()=> "2026-10-24 10:30:00"
 },
 UrlFetchApp:{fetch(url,opts){
   const bridge=JSON.parse(opts.payload.payload);
   lastBridgeMethod=bridge.method;
   lastBridgeToken=bridge.args[0];
   const email=String(lastBridgeToken).replace(/^signed:/,"");
   return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({
     type:"EK_BRIDGE_RESULT",id:bridge.id,channel:bridge.channel,
     ok:bridgeSuccess,value:{user:{email,active:true,mustChangePassword:false}}
   })};
 }}
};
vm.createContext(sandbox);
new vm.Script(code,{filename:"Code.gs"}).runInContext(sandbox);
const request=p=>sandbox.handleAction(p);
const login=email=>request({action:"auth_exchange",email,ekeToken:"signed:"+email});
const entry={action:"save_eviden",tahun:"2099",pemuatNaik:"PENYAMAR",
  standard:"STANDARD 1: KEPIMPINAN",noItem:"1.1.1",aspek:"Standard 1.1 PGB Sebagai Peneraju",
  huraian:"Penerangan item",pdca:"PLAN,DO",jenis:"LAPORAN",tajuk:"Laporan eviden",catatan:"sah",
  pautanLuar:"https://drive.google.com/example"};

test("without a server session every data action is denied",()=>{
  assert.equal(request({action:"get_bundle"}).code,"AUTH_REQUIRED");
  assert.equal(request({action:"delete_eviden",id:"x"}).code,"AUTH_REQUIRED");
  assert.equal(request({action:"populate_master"}).code,"AUTH_REQUIRED");
});
test("an existing e-Keberadaan session is verified without a second PIN login",()=>{
  bridgeSuccess=false;
  assert.equal(login("guru@moe-dl.edu.my").code,"EKE_SESSION_REJECTED");
  bridgeSuccess=true;
  assert.equal(login("inactive@moe-dl.edu.my").code,"FORBIDDEN");
  assert.equal(login("guru@moe-dl.edu.my").status,"success");
  assert.equal(lastBridgeMethod,"getBootstrapData");
  assert.equal(lastBridgeToken,"signed:guru@moe-dl.edu.my");
  assert.equal(request({action:"auth_login",email:"guru@moe-dl.edu.my",pin:"123456"}).code,"USE_AUTH_EXCHANGE");
  assert.equal(request({action:"auth_exchange",email:"admin@moe-dl.edu.my",ekeToken:"signed:guru@moe-dl.edu.my"}).code,"IDENTITY_MISMATCH");
});
const guru=login("guru@moe-dl.edu.my").authToken;
const admin=login("admin@moe-dl.edu.my").authToken;
test("roles and active year come from trusted Sheets, not client",()=>{
  assert.equal(request({action:"delete_eviden",authToken:guru,id:"fake"}).code,"FORBIDDEN");
  const bundle=request({action:"get_bundle",authToken:guru,tahun:"1999"});
  assert.equal(bundle.activeYear,"2027");
  assert.equal(bundle.users.length,0);
  assert.equal(request({action:"get_bundle",authToken:admin}).users.length,3);
  assert.equal(request({action:"populate_master",authToken:admin}).code,"UNKNOWN_ACTION");
});
let evidenceId="";
test("teacher can create evidence but cannot spoof year/name",()=>{
  const result=request({...entry,authToken:guru});
  assert.equal(result.status,"success");
  evidenceId=result.id;
  const inserted=primary.EVIDEN.rows.at(-1);
  assert.equal(String(inserted[1]),"2027");
  assert.equal(inserted[2],"CIKGU GURU");
  assert.equal(inserted[13],"guru@moe-dl.edu.my");
  assert.match(inserted[0],/^EVD-2027-/);
});
test("invalid standard and insecure links rejected",()=>{
  assert.equal(request({...entry,authToken:guru,noItem:"1.1.999"}).status,"error");
  assert.equal(request({...entry,authToken:guru,pautanLuar:"javascript:alert(1)"}).status,"error");
});
test("evidence owner can update; another teacher cannot; admin can delete",()=>{
  assert.equal(request({action:"update_eviden",authToken:guru,id:evidenceId,tajuk:"Dikemas kini"}).status,"success");
  assert.equal(primary.EVIDEN.rows.at(-1)[9],"Dikemas kini");
  const other=login("admin@moe-dl.edu.my");
  assert.equal(request({action:"delete_eviden",authToken:guru,id:evidenceId}).code,"FORBIDDEN");
  assert.equal(request({action:"delete_eviden",authToken:other.authToken,id:evidenceId}).status,"success");
});
test("a deactivated account loses access on subsequent requests",()=>{
  const idx=userRows.findIndex(r=>r[0]==="guru@moe-dl.edu.my");
  userRows[idx][3]=false;
  assert.equal(request({action:"get_bundle",authToken:guru}).code,"AUTH_REQUIRED");
  userRows[idx][3]=true;
});
