import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length, 1, "Expected one inline application script.");
const appJs = scripts[0][1];
const context = vm.createContext({ URL, console });
new vm.Script(appJs, {filename:"index.html"}).runInContext(context);
const run = (expression) => vm.runInContext(expression, context);

test("Standard and Drive folders share the same live SENARAI STANDARD dataset", () => {
  assert.doesNotMatch(html,/FOLDER_CATALOG/);
  assert.doesNotMatch(html,/id="module-folder"/);
  assert.match(html,/id="standard-folder-tree"/);
  assert.match(html,/id="standard-table"/);
  run(`SYSTEM_BUNDLE={standards:[
    {Standard:"STANDARD 1: KEPIMPINAN",Aspek:"PGB Sebagai Peneraju","No Item":"1.1.1","Folder URL":"https://drive.google.com/folder/A"},
    {Standard:"STANDARD 1: KEPIMPINAN",Aspek:"PGB Sebagai Peneraju","No Item":"1.1.2","Folder URL":""},
    {Standard:"STANDARD 2: ORGANISASI",Aspek:"Pengurusan Aset","No Item":"2.2.1","Folder URL":"https://drive.google.com/folder/B"}
  ]}`);
  assert.equal(run("deriveStandardFolderTree(SYSTEM_BUNDLE.standards).length"), 2);
  assert.equal(run("deriveStandardFolderTree(SYSTEM_BUNDLE.standards)[0].aspects[0].items.length"), 2);
  run(`SYSTEM_BUNDLE.standards.push({Standard:"STANDARD 1: KEPIMPINAN",Aspek:"PGB Sebagai Peneraju","No Item":"1.1.3"})`);
  assert.equal(run("deriveStandardFolderTree(SYSTEM_BUNDLE.standards)[0].aspects[0].items.length"), 3);
});
test("Ruang Kerja contains exactly 3 modules and administrative modules are grouped together", () => {
  const work = html.match(/<div class="nav-label">Ruang Kerja<\/div>([\s\S]*?)<div class="nav-label admin-only">Pentadbiran<\/div>/);
  assert.ok(work);
  assert.deepEqual([...work[1].matchAll(/switchNav\('([^']+)'/g)].map(x=>x[1]), ["analisis","muatnaik","senarai_eviden"]);
  const admin = html.match(/<div class="nav-label admin-only">Pentadbiran<\/div>([\s\S]*?)<div class="sidebar-footer">/);
  assert.ok(admin);
  for(const module of ["jawatankuasa","checklist","standard","pps","pengguna","tetapan"])
    assert.ok(admin[1].includes("switchNav('"+module+"'"),module);
});
test("unsafe protocols and HTML are not passed into evidence links", () => {
  assert.equal(run("safeHref('javascript:alert(1)')"), "");
  assert.equal(run("safeHref('data:text/html,hello')"), "");
  assert.equal(run("safeHref('http://example.com/a')"), "");
  assert.equal(run("safeHref('https://drive.google.com/file/d/123')"), "https://drive.google.com/file/d/123");
  assert.equal(run("escapeHtml('<img src=x onerror=1>')"), "&lt;img src=x onerror=1&gt;");
});
test("USER cannot access admin actions in client", () => {
  run("CURRENT_USER={role:'USER'}");
  assert.equal(run("isPrivilegedUser()"), false);
  run("CURRENT_USER={role:'ADMIN'}");
  assert.equal(run("isPrivilegedUser()"), true);
  run("CURRENT_USER={role:'SUPER ADMIN'}");
  assert.equal(run("isPrivilegedUser()"), true);
});
test("active-year filter excludes archived years", () => {
  run("SYSTEM_BUNDLE={activeYear:2026,eviden:[{tahun:2025,id:'old'},{tahun:2026,id:'active'}]}");
  assert.equal(run("evidenceForActiveYear().length"), 1);
  assert.equal(run("evidenceForActiveYear()[0].id"), "active");
});
test("evidence list has required guide controls", () => {
  for (const id of ["filter-standard","filter-item","filter-uploader","filter-pdca","filter-search","standard-folder-tree","coverage-table"]) {
    assert.match(html, new RegExp('id="'+id+'"'));
  }
  assert.doesNotMatch(html,/action: "get_bundle", tahun: "2026"/);
});

test("e-Keberadaan authenticates PIN only once; SKAS exchanges existing session",()=>{
  assert.match(html,/method: "loginWithPin"/);
  assert.match(html,/establishBackendSession\(loginEmail,result\.value\.token\)/);
  assert.match(html,/action:"auth_exchange",email,ekeToken/);
  assert.doesNotMatch(html,/establishBackendSession\(loginEmail,pin\)/);
  assert.doesNotMatch(html,/action:"auth_login"/);
});

test("frontend detects older SKAS backend version instead of calling it an expired session",()=>{
  assert.match(html,/data\.code==="AUTH_REQUIRED"/);
  assert.match(html,/auth_exchange belum tersedia/);
  assert.match(html,/Deploy > Manage deployments > Edit > New version > Deploy/);
});

test("ZIP Standard module is renamed and includes inline import plus folder tools",()=>{
 assert.match(html,/> Standard<\/a>/);
 assert.match(html,/<h2 class="page-title">Standard<\/h2>/);
 assert.doesNotMatch(html,/Senarai Standard & Folder/);
 assert.match(html,/id="zip-catalog"/);
 assert.match(html,/import_zip_standards/);
 assert.match(html,/sync_zip_master_folders/);
 assert.match(html,/Bina Folder ZIP di Drive/);
 assert.match(html,/Import Item Standard ZIP/);
 assert.match(html,/function renderZipCatalog\(/);
 assert.match(html,/function standardOptions\(/);
});
