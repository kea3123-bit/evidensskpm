import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const source=readFileSync(new URL("./Code.gs",import.meta.url),"utf8");
const folderMap=new Map();
let n=0;const uploads=[];
function folder(name){
 const id="f"+(++n),children=new Map(),value={
   name,id,children,getId:()=>id,getUrl:()=>`https://drive.google.com/drive/folders/${id}`,
   getFoldersByName:x=>({hasNext:()=>children.has(x),next:()=>children.get(x)}),
   createFolder:x=>{const o=folder(x);children.set(x,o);return o},
   createFile:blob=>{uploads.push({folder:id,blob});return{getUrl:()=>"https://drive.google.com/file/d/example"}}
 };
 folderMap.set(id,value);return value;
}
const root=folder("ROOT");
function sheet(rows){
 return {rows,getLastRow:()=>rows.length,
 getDataRange:()=>({getValues:()=>rows.map(x=>x.slice())}),
 getRange(r,c,h=1,w=1){return{
   getValue:()=>rows[r-1]?.[c-1]??"",
   getValues:()=>Array.from({length:h},(_,i)=>Array.from({length:w},(_,j)=>rows[r+i-1]?.[c+j-1]??"")),
   setValue:v=>{rows[r-1][c-1]=v},
   setValues:a=>{for(let i=0;i<h;i++)for(let j=0;j<w;j++)rows[r+i-1][c+j-1]=a[i][j]}
 }},
 appendRow:x=>rows.push(x.slice()),
 deleteRow:r=>rows.splice(r-1,1)
 };
}
const standards=sheet([["Standard","No Item","Aspek","Huraian"],
["STANDARD 1: KEPIMPINAN","1.1.1","Standard 1.1 PGB Sebagai Peneraju","Ketetapan"]]);
const eviden=sheet([["ID","Tahun","Pemuat Naik","Standard","No Item","Aspek","Huraian","PDCA","Jenis","Tajuk","Catatan","Pautan","Tarikh"]]);
const settings=sheet([["ITEM","KAEDAH","NILAI / SENARAI"],["TAHUN PENILAIAN","INPUT","2026"],["FOLDER DRIVE EVIDEN","INPUT",root.id]]);
const ss={getSheetByName:x=>({"SENARAI STANDARD":standards,"EVIDEN":eviden,"SETTING":settings})[x]||null};
const sandbox={String,Number,Object,Array,Error,Math,Date,JSON,
 DriveApp:{getFolderById:x=>{if(!folderMap.has(x))throw Error("Unknown folder "+x);return folderMap.get(x)}},
 LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
 Utilities:{getUuid:()=>"12345678-aaaa-aaaa-bbbb-cccccccccccc",formatDate:()=>"2026-10-24 12:00:00",
 base64Decode:s=>Buffer.from(s,"base64"),newBlob:(bytes,type,name)=>({bytes,type,name})}
};
vm.createContext(sandbox);
new vm.Script(source,{filename:"Code.gs"}).runInContext(sandbox);
const input={standard:"STANDARD 1: KEPIMPINAN",noItem:"1.1.2",aspek:"Standard 1.1 PGB Sebagai Peneraju",huraian:"Huraian item"};

test("adding item creates Standard/Aspek/No Item Drive folder and saves link",()=>{
 const r=sandbox.saveStandard(ss,input);
 assert.equal(r.status,"success");
 assert.equal(standards.rows.length,3);
 assert.equal(standards.rows[0][4],"Folder ID");
 const std=root.children.get("STANDARD 1- KEPIMPINAN");
 assert.ok(std);
 const leaf=std.children.get(input.aspek).children.get(input.noItem);
 assert.equal(standards.rows[2][4],leaf.id);
 assert.equal(standards.rows[2][5],leaf.getUrl());
});
test("duplicates rejected, old references sync idempotently",()=>{
 assert.equal(sandbox.saveStandard(ss,input).status,"error");
 let count=folderMap.size;
 assert.equal(sandbox.syncStandardFolders(ss,{}).synced,1);
 assert.equal(folderMap.size,count+1);
 count=folderMap.size;
 assert.equal(sandbox.syncStandardFolders(ss,{}).synced,0);
 assert.equal(folderMap.size,count);
});
test("uploaded evidence goes to the item-specific folder",()=>{
 const fileBase64=Buffer.from("hi").toString("base64");
 const r=sandbox.saveEviden(ss,{...input,pemuatNaik:"GURU",pemuatEmail:"a@b.com",
 pdca:"PLAN",jenis:"LAPORAN",tajuk:"Test evidence",fileBase64,fileName:"proof.txt",fileMime:"text/plain"});
 assert.equal(r.status,"success");
 assert.equal(uploads[0].folder,standards.rows[2][4]);
});
test("evidence-linked standards cannot be deleted or recoded, but descriptions can change",()=>{
 assert.equal(sandbox.deleteStandard(ss,{row:3}).status,"error");
 assert.equal(sandbox.updateStandard(ss,{...input,noItem:"1.1.3",row:3}).status,"error");
 const oldFolder=standards.rows[2][4],before=folderMap.size;
 assert.equal(sandbox.updateStandard(ss,{...input,huraian:"new text",row:3}).status,"success");
 assert.equal(standards.rows[2][4],oldFolder);
 assert.equal(folderMap.size,before);
});
