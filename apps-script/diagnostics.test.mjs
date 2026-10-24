import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const source=readFileSync(new URL("./Diagnostics.gs",import.meta.url),"utf8");
const properties={
  SPES_DB_ID:"main",
  EKEBERADAAN_DB_ID:"ek",
  EKEBERADAAN_WEB_APP_URL:"https://example.test/exec",
  AUTH_BRIDGE_ORIGIN:"https://kea3123-bit.github.io"
};
const requests=[];
const mainSheetNames=new Set([
  "SETTING","SENARAI STANDARD","SENARAI PPS","SENARAI SEMAK",
  "JAWATANKUASA SK@S","EVIDEN"
]);
const users=["Aktif","Nama","Emel","Kategori","Pentadbir"];
let bridgeAvailable=true;
const sandbox={
  Date,JSON,String,Error,RegExp,Utilities:{getUuid:()=>"unit-test-id"},
  PropertiesService:{getScriptProperties(){return{getProperty:(key)=>properties[key]||""}}},
  SpreadsheetApp:{openById(id){
    if(id==="main")return{getSheetByName:n=>mainSheetNames.has(n)?{}:null};
    if(id==="ek")return{getSheetByName:n=>n==="PENGGUNA"?{
      getLastColumn:()=>users.length,
      getRange:()=>({getValues:()=>[users]})
    }:null};
    throw Error("unknown source");
  }},
  UrlFetchApp:{fetch(url,options){
    const payload=JSON.parse(options.payload.payload);
    requests.push(payload);
    return {
      getResponseCode:()=>200,
      getContentText:()=>JSON.stringify({
        type:"EK_BRIDGE_RESULT",id:payload.id,channel:payload.channel,
        ok:bridgeAvailable,
        value:{ready:true}
      })
    };
  }},
  Logger:{log(){}}
};
vm.createContext(sandbox);
new vm.Script(source).runInContext(sandbox);

test("passes with current e-Keberadaan bridge contract, without creating a device",()=>{
  const out=sandbox.diagnoseSKASConnection();
  assert.equal(out.ok,true);
  assert.equal(requests.length,1);
  assert.equal(requests[0].method,"__ping__");
  assert.equal(requests[0].channel,"perf-burst");
  assert.equal(requests[0].origin,properties.AUTH_BRIDGE_ORIGIN);
  assert.equal(requests[0].args.length,0);
  assert.doesNotMatch(JSON.stringify(out),/EKEBERADAAN_WEB_APP_URL\":\"https:/);
});
test("missing properties block the network request",()=>{
  const old=properties.EKEBERADAAN_DB_ID;delete properties.EKEBERADAAN_DB_ID;
  const before=requests.length;
  const out=sandbox.diagnoseSKASConnection();
  assert.equal(out.ok,false);
  assert.equal(requests.length,before);
  assert.match(JSON.stringify(out),/EKEBERADAAN_DB_ID/);
  properties.EKEBERADAAN_DB_ID=old;
});
test("bridge rejects and surfaces an actionable origin/deployment failure",()=>{
  bridgeAvailable=false;
  const out=sandbox.diagnoseSKASConnection();
  assert.equal(out.ok,false);
  assert.match(JSON.stringify(out),/origin allowlist/);
  bridgeAvailable=true;
});
