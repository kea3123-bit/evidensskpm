import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("./AuthorizeSKAS.gs",import.meta.url), "utf8");

test("SKAS authorization helper requires external_request and makes harmless GET", () => {
  const calls = [];
  const context = {
    ScriptApp: {
      AuthMode: { FULL: "FULL" },
      requireScopes: (mode, scopes) => calls.push({type:"requireScopes",mode,scopes})
    },
    UrlFetchApp: {
      fetch: (url,opts) => {
        calls.push({type:"fetch",url,opts});
        return {getResponseCode:()=>204};
      }
    },
    Logger: {log:()=>{}}
  };
  vm.createContext(context);
  new vm.Script(source, {filename:"AuthorizeSKAS.gs"}).runInContext(context);
  const result=context.authorizeSKAS();
  assert.equal(result.status,"success");
  assert.equal(result.urlFetchAuthorized,true);
  assert.equal(result.httpStatus,204);
  assert.equal(calls[0].type,"requireScopes");
  assert.equal(calls[0].mode,"FULL");
  assert.deepEqual(Array.from(calls[0].scopes),["https://www.googleapis.com/auth/script.external_request"]);
  assert.equal(calls[1].type,"fetch");
  assert.equal(calls[1].url,"https://www.google.com/generate_204");
  assert.equal(calls[1].opts.method,"get");
});

test("when consent is unavailable, the helper must not make an external request", () => {
  let fetched=false;
  const context = {
    ScriptApp: {AuthMode:{FULL:"FULL"},requireScopes:()=>{
      throw Error("Authorization required");
    }},
    UrlFetchApp: {fetch:()=>{fetched=true;}},
    Logger: {log:()=>{}}
  };
  vm.createContext(context);
  new vm.Script(source).runInContext(context);
  assert.throws(()=>context.authorizeSKAS(),/Authorization required/);
  assert.equal(fetched,false);
});
