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

test("app JS parses and 12 original master folder categories exist", () => {
  assert.equal(run("FOLDER_CATALOG.length"), 12);
  assert.ok(run("FOLDER_CATALOG.reduce((n,item)=>n+item[1].length,0)") >= 75);
  assert.ok(run("folderPath(0,0)").startsWith("SKAS_MASTER_FOLDER_2026/"));
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
  for (const id of ["filter-standard","filter-item","filter-uploader","filter-pdca","filter-search","folder-catalog","coverage-table"]) {
    assert.match(html, new RegExp('id="'+id+'"'));
  }
  assert.doesNotMatch(html,/action: "get_bundle", tahun: "2026"/);
});
