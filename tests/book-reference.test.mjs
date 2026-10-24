import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const sourceJson=JSON.parse(readFileSync(new URL("../data/skas-book-reference-2024.json",import.meta.url),"utf8"));
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length,1);
const ctx=vm.createContext({URL,console});
new vm.Script(scripts[0][1],{filename:"index.html"}).runInContext(ctx);
const run=code=>vm.runInContext(code,ctx);

test("Book 2024 reference has 38 coded aspects, 9 strength aspects and 115 subaspek",()=>{
 assert.equal(sourceJson.aspects.length,38);
 assert.equal(sourceJson.strengths.length,9);
 assert.equal(sourceJson.totalSubaspek,115);
 assert.equal(sourceJson.aspects.reduce((sum,item)=>sum+item.subaspek,0),76);
 assert.equal(sourceJson.strengths.reduce((sum,item)=>sum+item.subaspek,0),39);
 assert.equal(sourceJson.aspects.find(item=>item.code==="1.1").subaspek,7);
 assert.equal(sourceJson.aspects.find(item=>item.code==="3.1.2").subaspek,4);
 assert.equal(sourceJson.aspects.find(item=>item.code==="5.4").subaspek,8);
 assert.equal(new Set(sourceJson.aspects.map(x=>x.code)).size,38);
 for(const item of sourceJson.aspects){
   assert.ok(item.name&&item.description);
   assert.ok(item.pdfPage>=24&&item.pdfPage<=125);
 }
});
test("book code and aspect labels prevent incorrect replacement of HEM codes",()=>{
 const refs=sourceJson.aspects;
 const hem=refs.find(x=>x.code==="3.3.5");
 assert.equal(hem.name,"Pengurusan Bantuan Pelajaran Murid");
 assert.equal(run("bookRowMatch("+JSON.stringify(hem)+",{Aspek:'Kesihatan','No Item':'3.3.5'})"),false);
 assert.equal(run("bookRowMatch("+JSON.stringify(hem)+",{Aspek:'Pengurusan Bantuan Pelajaran Murid','No Item':'3.3.5'})"),true);
 const leading=refs.find(x=>x.code==="1.1");
 assert.equal(run("bookRowMatch("+JSON.stringify(leading)+",{Aspek:'Standard 1.1 PGB Sebagai Peneraju','No Item':'1.1.1'})"),true);
 assert.equal(run("bookRowMatch("+JSON.stringify(leading)+",{Aspek:'PGB Sebagai Peneraju','No Item':'1.1'})"),true);
 const guide=refs.find(x=>x.code==="4.3");
 assert.equal(run("bookRowMatch("+JSON.stringify(guide)+",{Aspek:'Pentaksiran','No Item':'4.3'})"),false);
});
test("reference comparison reports absent, matching and conflicting aspects",()=>{
 const ref=sourceJson.aspects.find(x=>x.code==="3.3.5");
 const title=sourceJson.aspects.find(x=>x.code==="1.1");
 const missing=sourceJson.aspects.find(x=>x.code==="2.7");
 const rows=[{Aspek:"Kesihatan","No Item":"3.3.5"},{Aspek:"PGB Sebagai Peneraju","No Item":"1.1.1"}];
 assert.equal(run("bookReferenceState("+JSON.stringify(ref)+","+JSON.stringify(rows)+")"),"KOD SAMA, ASPEK BERCANGGAH");
 assert.equal(run("bookReferenceState("+JSON.stringify(title)+","+JSON.stringify(rows)+")"),"SEPADAN");
 assert.equal(run("bookReferenceState("+JSON.stringify(missing)+","+JSON.stringify(rows)+")"),"TIADA DALAM SENARAI");
});
test("huraian suggestion is optional and never auto-overwrites Sheet rows",()=>{
 assert.match(html,/id="book-reference-panel"/);
 assert.match(html,/id="book-reference-table"/);
 assert.match(html,/fillBookSummary\('edit'\)/);
 assert.match(html,/fillBookSummary\('add'\)/);
 assert.match(html,/Tiada huraian dalam ZIP/);
 assert.match(html,/Kriteria Kritikal aras aspek/);
 assert.match(html,/Buka Rujukan Buku untuk semak/);
 assert.match(html,/if\(!placeholder && !confirm\(/);
 assert.doesNotMatch(html,/action:"bulk_overwrite_standards"/);
});
