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

test("ZIP has 80 .keep paths in 12 groups and 30 distinct coded Standard aspects",()=>{
 const groups=sandbox.skasZipFolders_();
 assert.equal(groups.length,12);
 assert.equal(groups.reduce((n,g)=>n+g.paths.length,0),80);
 const actualFolders=new Set(["SKAS_MASTER_FOLDER_2026"]);
 for(const group of groups){
   let top="SKAS_MASTER_FOLDER_2026/"+group.name;
   actualFolders.add(top);
   for(const relative of group.paths){
     for(const part of relative.split("/")){
       top+="/"+part;
       actualFolders.add(top);
     }
     top="SKAS_MASTER_FOLDER_2026/"+group.name;
   }
 }
 assert.equal(actualFolders.size,94,"Physical ZIP folder tally must be 94, not 80 .keep leaf paths.");
 assert.equal([...actualFolders].filter(p=>p.split("/").length===4).length,10);

 const records=sandbox.skasZipStandardEntries_();
 assert.equal(records.length,30);
 assert.equal(records.filter(x=>x.noItem==="3.1.2").length,1);
 assert.equal(new Set(records.map(x=>x.zipPath)).size,30);
 assert.equal(groups.find(x=>x.name==="05_STANDARD 3.3_HEM").paths.includes("3.3.5_Kesihatan"),true);
 assert.equal(groups.find(x=>x.name==="03_STANDARD 3.1_KURIKULUM").paths.includes("3.1.2_Pengurusan Mata Pelajaran/Bahasa Melayu"),true);
 assert.equal(groups.filter(g=>/^0[1-7]_STANDARD /.test(g.name)).length,7);
});
test("import all ZIP Standard entries safely in 15-row batches, without duplicate rows",()=>{
 let offset=0,added=0;
 do {
   const r=sandbox.importZipStandards(ss,{offset});
   assert.equal(r.status,"success");
   assert.ok(r.nextOffset>offset);
   added+=r.added;
   offset=r.nextOffset;
 }while(offset<30);
 assert.equal(added,30);
 assert.equal(standards.rows.length,33);
 const imports=standards.rows.slice(3);
 assert.equal(imports.filter(r=>r[1]==="3.1.2").length,1);
 assert.ok(imports.every(r=>r[6]));
 offset=0;let replayAdded=0;
 do {
   const r=sandbox.importZipStandards(ss,{offset});
   replayAdded+=r.added;offset=r.nextOffset;
 }while(offset<30);
 assert.equal(replayAdded,0);
 assert.equal(standards.rows.length,33);
});
test("creating an imported ZIP hierarchy preserves exact nested subject folder names",()=>{
 const ref=standards.rows.find(row=>String(row[6]||"").endsWith("3.1.2_Pengurusan Mata Pelajaran"));
 assert.ok(ref);
 const result=sandbox.standardFolderInfo_(ss,{standard:ref[0],noItem:ref[1],aspek:ref[2],zipPath:ref[6]});
 assert.equal(result.status,undefined);
 const archive=root.children.get("SKAS_MASTER_FOLDER_2026");
 const group=archive.children.get("03_STANDARD 3.1_KURIKULUM");
 assert.ok(group);
 const parent=group.children.get("3.1.2_Pengurusan Mata Pelajaran");
 assert.equal(parent.getId(),result.id);
 const child=sandbox.createZipPathFolder_(ss,ref[6]+"/Bahasa Melayu");
 assert.equal(parent.children.get("Bahasa Melayu").getId(),child.id);
 assert.equal(sandbox.updateStandard(ss,{standard:ref[0],noItem:ref[1],aspek:"DIUBAH",huraian:ref[3],row:standards.rows.indexOf(ref)+1}).status,"error");
});
test("full ZIP Drive folder generation covers supporting and Standard folders, repeat is idempotent",()=>{
 let offset=0;
 do {const r=sandbox.syncZipMasterFolders(ss,{offset});assert.equal(r.status,"success");offset=r.nextOffset;}
 while(offset<80);
 const archive=root.children.get("SKAS_MASTER_FOLDER_2026");
 assert.ok(archive.children.get("00_PENGURUSAN SK@S").children.get("03_Jawatankuasa SK@S"));
 assert.ok(archive.children.get("04_STANDARD 3.2_KOKURIKULUM").children.get("PAJSK"));
 assert.ok(archive.children.get("11_PEMANTAUAN & PENAMBAHBAIKAN").children.get("Pelan Intervensi"));
 assert.equal(standards.rows.slice(3).filter(r=>r[6] && r[4] && r[5]).length,30,
   "All imported Standard ZIP rows must link to their actual Drive folders.");
 const count=folderMap.size;offset=0;
 do{const r=sandbox.syncZipMasterFolders(ss,{offset});offset=r.nextOffset;}while(offset<80);
 assert.equal(folderMap.size,count);
});

test("previous 3.1.2 child records can be preserved and linked without deletion",()=>{
 const oldPath="03_STANDARD 3.1_KURIKULUM/3.1.2_Pengurusan Mata Pelajaran/Bahasa Melayu";
 const previousCount=standards.rows.length;
 standards.appendRow([
   "STANDARD 3.1: KURIKULUM","3.1.2","Pengurusan Mata Pelajaran / Bahasa Melayu",
   "Legacy child record: retain for existing evidence","","",oldPath
 ]);
 assert.equal(standards.rows.length,previousCount+1);
 let offset=0;
 do {
   const r=sandbox.syncZipMasterFolders(ss,{offset});
   assert.equal(r.status,"success");
   offset=r.nextOffset;
 }while(offset<80);
 const record=standards.rows[standards.rows.length-1];
 assert.equal(record[6],oldPath);
 assert.ok(record[4]&&record[5]);
 const parent=standards.rows.find(r=>r[6]==="03_STANDARD 3.1_KURIKULUM/3.1.2_Pengurusan Mata Pelajaran");
 assert.ok(parent&&parent[4]);
 assert.notEqual(record[4],parent[4]);
 assert.equal(standards.rows.length,previousCount+1);
});
