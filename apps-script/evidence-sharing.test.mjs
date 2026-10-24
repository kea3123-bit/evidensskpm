import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const code=readFileSync(new URL("./Code.gs",import.meta.url),"utf8");
const store=new Map(),log=[];
const rootId="SKAS_EVIDENCE_ROOT_123456";
const root={
 getId:()=>rootId,
 getParents:()=>({hasNext:()=>false})
};
const iterator=items=>{
 let i=0;return{hasNext:()=>i<items.length,next:()=>items[i++]};
};
let sequence=0,blockSharing=false;
function makeFile(parent=root){
 const id="SKAS_EVIDENCE_"+String(++sequence).padStart(10,"0");
 let access="PRIVATE",permission="NONE";
 const file={
   id,
   getUrl:()=> "https://drive.google.com/file/d/"+id+"/view",
   getParents:()=>iterator([parent]),
   getSharingAccess:()=>access,
   getSharingPermission:()=>permission,
   setSharing(a,p){
     log.push({id,access:a,permission:p});
     if(blockSharing)throw Error("Sharing externally is disabled by administrator");
     access=a;permission=p;return this;
   }
 };
 store.set(id,file);
 return file;
}
function sheet(data){
 const rows=data.map(row=>row.slice());
 return {
   rows,
   getLastRow:()=>rows.length,
   getDataRange:()=>({getValues:()=>rows.map(row=>row.slice())}),
   getRange(row,col,height=1,width=1){
     return{
       getValue:()=>rows[row-1]?.[col-1]??"",
       getValues:()=>Array.from({length:height},(_,i)=>Array.from({length:width},(_,j)=>rows[row-1+i]?.[col-1+j]??"")),
       setValue(value){rows[row-1][col-1]=value},
       setValues(values){for(let i=0;i<height;i++)for(let j=0;j<width;j++)rows[row-1+i][col-1+j]=values[i][j]}
     };
   },
   appendRow(row){rows.push(row.slice())}
 };
}
const std="STANDARD 1: KEPIMPINAN",aspect="Standard 1.1 PGB Sebagai Peneraju";
const standards=sheet([
 ["Standard","No Item","Aspek","Huraian","Folder ID","Folder URL","ZIP Path"],
 [std,"1.1.1",aspect,"Ketetapan",rootId,"https://drive.google.com/drive/folders/"+rootId,""]
]);
const evidence=sheet([["ID","Tahun","Pemuat Naik","Standard","No Item","Aspek","Huraian","PDCA","Jenis","Tajuk","Catatan","Pautan","Tarikh","Pemuat Email"]]);
const settings=sheet([
 ["ITEM","KAEDAH","NILAI / SENARAI"],
 ["TAHUN PENILAIAN","INPUT","2026"],
 ["FOLDER DRIVE EVIDEN","INPUT",rootId]
]);
const ss={getSheetByName:name=>({
  "SENARAI STANDARD":standards,"EVIDEN":evidence,"SETTING":settings
})[name]||null};
const sandbox={
 DriveApp:{
   Access:{ANYONE_WITH_LINK:"ANYONE_WITH_LINK",ANYONE:"ANYONE",PRIVATE:"PRIVATE"},
   Permission:{VIEW:"VIEW",EDIT:"EDIT",NONE:"NONE"},
   getFolderById:id=>{
     if(id!==rootId)throw Error("Folder not found");return{
       ...root,createFile:()=>makeFile()
     };
   },
   getFileById:id=>{
     if(!store.has(id))throw Error("File not found");return store.get(id);
   }
 },
 Utilities:{
   base64Decode:s=>Buffer.from(s,"base64"),newBlob:(bytes,mime,name)=>({bytes,mime,name}),
   getUuid:()=>String(++sequence).padStart(24,"1")+"-aaaa-bbbb-cccc",
   formatDate:()=>"2026-10-24 14:00:00"
 },
 LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
 Logger:{log:()=>{}}
};
vm.createContext(sandbox);
new vm.Script(code).runInContext(sandbox);

function upload(name,sharing){
 return sandbox.saveEviden(ss,{
   pemuatNaik:"GURU",pemuatEmail:"guru@example.test",
   standard:std,noItem:"1.1.1",aspek:aspect,huraian:"Ketetapan",
   pdca:"PLAN",jenis:"LAPORAN",tajuk:name,
   fileName:name+".pdf",fileMime:"application/pdf",
   fileBase64:Buffer.from("PDF").toString("base64"),
   shareAccess:sharing
 });
}

test("new upload is stored and shared as ANYONE_WITH_LINK VIEW",()=>{
 const result=upload("Shared");
 assert.equal(result.status,"success");
 assert.equal(result.accessStatus,"link");
 assert.equal(evidence.rows.length,2);
 const fileId=sandbox.uploadedDriveFileId_(result.url);
 assert.ok(fileId);
 assert.equal(store.get(fileId).getSharingAccess(),"ANYONE_WITH_LINK");
 assert.equal(store.get(fileId).getSharingPermission(),"VIEW");
 assert.equal(log.at(-1).access,"ANYONE_WITH_LINK");
 assert.equal(log.at(-1).permission,"VIEW");
});
test("sensitive evidence can stay private with opt-out",()=>{
 const before=log.length;
 const result=upload("Private","private");
 assert.equal(result.status,"success");
 assert.equal(result.accessStatus,"private");
 assert.equal(log.length,before);
 assert.equal(store.get(sandbox.uploadedDriveFileId_(result.url)).getSharingAccess(),"PRIVATE");
});
test("Workspace sharing denial does not lose uploaded file or EVIDEN record",()=>{
 const before=evidence.rows.length;
 blockSharing=true;
 const result=upload("Blocked");
 blockSharing=false;
 assert.equal(result.status,"success");
 assert.equal(result.accessStatus,"restricted");
 assert.match(result.accessWarning,/Google Workspace/);
 assert.equal(evidence.rows.length,before+1);
 assert.ok(result.url);
 assert.equal(store.get(sandbox.uploadedDriveFileId_(result.url)).getSharingAccess(),"PRIVATE");
});
test("repair only managed recorded Drive files, skips external URLs and foreign files",()=>{
 const linked=upload("OldPrivate","private");
 const legacyFile=makeFile();
 evidence.appendRow([
 "LEGACY","2025","GURU",std,"1.1.1",aspect,"","PLAN","FILE","Legacy private file","",
 legacyFile.getUrl(),"","guru@example.test"
 ]);
 evidence.appendRow([
 "EXT-1","2026","GURU",std,"1.1.1",aspect,"","PLAN","LINK","External","",
 "https://example.com/non-school-link","", "guru@example.test"
 ]);
 const foreign=makeFile({getId:()=>"FOREIGN_FOLDER_ID",getParents:()=>iterator([])});
 evidence.appendRow([
 "FOREIGN","2026","GURU",std,"1.1.1",aspect,"","PLAN","LINK","Foreign","",
 foreign.getUrl(),"","guru@example.test"
 ]);
 let offset=0,success=0,skipped=0,failed=0,already=0;
 do {
   const out=sandbox.repairEvidenceAccess(ss,{offset});
   assert.equal(out.status,"success");
   success+=out.repaired;skipped+=out.skipped;failed+=out.failed;already+=out.already;
   offset=out.nextOffset;
   if(!out.remaining)break;
 }while(true);
 assert.equal(success,2); // blocked upload + one private old upload
 assert.equal(skipped,4); // 2 intentionally private + external + foreign
 assert.equal(failed,0);
 assert.equal(already,1); // original already-shared upload
 assert.equal(store.get(sandbox.uploadedDriveFileId_(linked.url)).getSharingAccess(),"PRIVATE");
 assert.equal(legacyFile.getSharingAccess(),"ANYONE_WITH_LINK");
 assert.equal(foreign.getSharingAccess(),"PRIVATE");
 const again=sandbox.repairEvidenceAccess(ss,{offset:0});
 assert.equal(again.repaired,0);
 assert.ok(again.already>=3);
});
test("repair is protected by backend admin-action permission list",()=>{
 assert.equal(vm.runInContext('ADMIN_ACTIONS_.indexOf("repair_evidence_access")>=0',sandbox),true);
 assert.equal(sandbox.uploadedDriveFileId_("https://docs.google.com/document/d/EXTERNALID"),"");
 assert.equal(sandbox.uploadedDriveFileId_("https://evil.example.com/file/d/FAKEFILEID"),"");
});
