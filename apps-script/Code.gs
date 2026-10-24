/**
 * SPES-SK@S backend v3 — derived from supplied Code.gs v2.0.
 * Requires Script Properties (never hardcode database IDs or PIN).
 * IMPORTANT: Replace the entire existing Code.gs when deploying; do not append.
 */
function cfg_(key) {
  var value = PropertiesService.getScriptProperties().getProperty(key);
  if (!value) throw new Error("Script Property belum diset: " + key);
  return String(value).trim();
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function doGet() {
  return json_({status:"success",service:"SPES-SK@S",version:"3.1",authMode:"auth_exchange",note:"Data memerlukan sesi."});
}
function doPost(e) {
  var p;
  try { p=JSON.parse((e && e.postData && e.postData.contents) || "{}"); }
  catch(ex) {return json_({status:"error",message:"Format JSON tidak sah."});}
  return json_(handleAction(p));
}
var ADMIN_ACTIONS_ = [
  "delete_eviden","update_settings",
  "save_jawatankuasa","update_jawatankuasa","delete_jawatankuasa",
  "save_standard","update_standard","delete_standard",
  "save_pps","update_pps","delete_pps",
  "save_checklist","update_checklist","delete_checklist"
];
function handleAction(params) {
  params=params||{};
  try {
    var action=String(params.action||"");
    if (action==="get_version") return {status:"success",service:"SPES-SK@S",version:"3.1",authMode:"auth_exchange"};
    if (action==="auth_exchange") return authExchange_(params);
    // PIN login happens exactly once in the existing e-Keberadaan frontend.
    // Never invoke loginWithPin here: it creates an extra trusted device and
    // can evict a real phone from the 2-device limit.
    if (action==="auth_login") return {status:"error",code:"USE_AUTH_EXCHANGE",message:"Gunakan auth_exchange dengan sesi e-Keberadaan sedia ada."};
    if (action==="auth_logout") {logout_(params.authToken);return {status:"success"};}
    // The former init_system/populate_master endpoints are intentionally disabled.
    // Their original code used clear(), which would overwrite school data.
    var auth=verifySession_(params.authToken);
    if (!auth) return {status:"error",code:"AUTH_REQUIRED",message:"Sesi tidak sah atau tamat. Log masuk semula."};
    if (ADMIN_ACTIONS_.indexOf(action)>=0 && !auth.isAdmin) {
      return {status:"error",code:"FORBIDDEN",message:"Tindakan pentadbir sahaja."};
    }
    var ss=SpreadsheetApp.openById(cfg_("SPES_DB_ID"));
    switch(action) {
      case "get_bundle": return getSystemBundle(ss,null,auth);
      case "save_eviden":
        params.pemuatNaik=auth.name;params.pemuatEmail=auth.email;
        return saveEviden(ss,params);
      case "update_eviden": return updateEviden(ss,params,auth);
      case "delete_eviden": return deleteEviden(ss,params);
      case "update_settings": return updateSettings(ss,params);
      case "save_jawatankuasa": return saveJawatankuasa(ss,params);
      case "update_jawatankuasa": return updateJawatankuasa(ss,params);
      case "delete_jawatankuasa": return deleteJawatankuasa(ss,params);
      case "save_standard": return saveStandard(ss,params);
      case "update_standard": return updateStandard(ss,params);
      case "delete_standard": return deleteStandard(ss,params);
      case "save_pps": return savePPS(ss,params);
      case "update_pps": return updatePPS(ss,params);
      case "delete_pps": return deletePPS(ss,params);
      case "save_checklist": return saveChecklist(ss,params);
      case "update_checklist": return updateChecklist(ss,params);
      case "delete_checklist": return deleteChecklist(ss,params);
      default: return {status:"error",code:"UNKNOWN_ACTION",message:"Tindakan tidak sah."};
    }
  } catch(err) {
    Logger.log("SPES action error: "+String(err));
    return {status:"error",message:String(err.message||"Ralat pelayan.")};
  }
}
function getSystemBundle(ss, tahunReq, auth) {
  var settingsSheet = ss.getSheetByName("SETTING");
  var sData = settingsSheet ? settingsSheet.getDataRange().getValues() : [];
  var settings = {};
  for (var r = 1; r < sData.length; r++) {
    var itemKey = String(sData[r][0]).trim();
    settings[itemKey] = sData[r][2];
  }
  if (settings["FOLDER DRIVE"] && !settings["FOLDER DRIVE EVIDEN"]) {
    settings["FOLDER DRIVE EVIDEN"] = settings["FOLDER DRIVE"];
  }

  var activeYear = settings["TAHUN PENILAIAN"] || "2026";

  var usersList = [];
  try {
    var ekSS = SpreadsheetApp.openById(cfg_("EKEBERADAAN_DB_ID"));
    var pSheet = ekSS.getSheetByName("PENGGUNA");
    if (pSheet) {
      var pData = pSheet.getDataRange().getValues();
      if (pData.length > 1) {
        var pHeaders = pData[0];
        var emelIdx = pHeaders.indexOf("Emel");
        var namaIdx = pHeaders.indexOf("Nama");
        var adminIdx = pHeaders.indexOf("Pentadbir");
        var statusIdx = pHeaders.indexOf("Aktif");
        for (var i = 1; i < pData.length; i++) {
          usersList.push({
            Email: pData[i][emelIdx],
            Nama: pData[i][namaIdx],
            Peranan: (pData[i][adminIdx] === true || String(pData[i][adminIdx]).toUpperCase() === "TRUE") ? "ADMIN" : "USER",
            Status: (pData[i][statusIdx] === true || String(pData[i][statusIdx]).toUpperCase() === "TRUE") ? "AKTIF" : "TIDAK AKTIF"
          });
        }
      }
    }
  } catch (err) {
    Logger.log("Ralat baca PENGGUNA e-Keberadaan: " + err);
  }

  var evidenSheet = ss.getSheetByName("EVIDEN");
  var eData = evidenSheet ? evidenSheet.getDataRange().getValues() : [];
  var evidenList = [];
  for (var j = 1; j < eData.length; j++) {
    if (String(eData[j][1]) === String(activeYear)) {
      evidenList.push({
        id: eData[j][0],
        tahun: eData[j][1],
        pemuatNaik: eData[j][2],
        pemuatEmail: eData[j][13] || "",
        standard: eData[j][3],
        noItem: eData[j][4],
        aspek: eData[j][5],
        huraian: eData[j][6],
        pdca: eData[j][7],
        jenis: eData[j][8],
        tajuk: eData[j][9],
        catatan: eData[j][10],
        pautan: eData[j][11]
      });
    }
  }

  return {
    status: "success",
    settings: settings,
    activeYear: activeYear,
    standards: getSheetObjects(ss, "SENARAI STANDARD"),
    pps: getSheetObjects(ss, "SENARAI PPS"),
    users: auth && auth.isAdmin ? usersList : [],
    checklist: getSheetObjects(ss, "SENARAI SEMAK"),
    jawatankuasa: getSheetObjects(ss, "JAWATANKUASA SK@S"),
    eviden: evidenList
  };
}

function getSheetObjects(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  var headers = values[0], list = [];
  for (var i = 1; i < values.length; i++) {
    var obj = { _row: i + 1 };
    for (var j = 0; j < headers.length; j++) obj[headers[j]] = values[i][j];
    list.push(obj);
  }
  return list;
}

// -------------------------------------------------------------
// 1. PENGURUSAN JAWATANKUASA SK@S (CRUD)
// -------------------------------------------------------------
function saveJawatankuasa(ss, p) {
  var sh = ss.getSheetByName("JAWATANKUASA SK@S");
  if (!sh) return { status: "error", message: "Helaian JAWATANKUASA SK@S tiada." };
  var lastRow = sh.getLastRow();
  sh.appendRow([p.bilangan || lastRow, safeCell_(p.jawatan), safeCell_(p.nama), p.level]);
  return { status: "success" };
}

function updateJawatankuasa(ss, p) {
  var sh = ss.getSheetByName("JAWATANKUASA SK@S");
  if (!sh) return { status: "error", message: "Helaian JAWATANKUASA SK@S tiada." };
  var row = parseInt(p.row, 10);
  if (isSafeRow_(row,sh)) {
    sh.getRange(row, 1, 1, 4).setValues([[p.bilangan, p.jawatan, p.nama, p.level]]);
    return { status: "success" };
  }
  return { status: "error", message: "Baris tidak sah." };
}

function deleteJawatankuasa(ss, p) {
  var sh = ss.getSheetByName("JAWATANKUASA SK@S");
  if (!sh) return { status: "error", message: "Helaian JAWATANKUASA SK@S tiada." };
  var row = parseInt(p.row, 10);
  if (isSafeRow_(row,sh)) {
    sh.deleteRow(row);
    return { status: "success" };
  }
  return { status: "error", message: "Baris tidak sah." };
}

// -------------------------------------------------------------
// 2. PENGURUSAN SENARAI RUJUKAN STANDARD (CRUD)
// -------------------------------------------------------------
function saveStandard(ss, p) {
  var sh = ss.getSheetByName("SENARAI STANDARD");
  if (!sh) return { status: "error", message: "Helaian SENARAI STANDARD tiada." };
  sh.appendRow([safeCell_(p.standard), safeCell_(p.noItem), safeCell_(p.aspek), safeCell_(p.huraian)]);
  return { status: "success" };
}

function updateStandard(ss, p) {
  var sh = ss.getSheetByName("SENARAI STANDARD");
  if (!sh) return { status: "error", message: "Helaian SENARAI STANDARD tiada." };
  var row = parseInt(p.row, 10);
  if (isSafeRow_(row,sh)) {
    sh.getRange(row, 1, 1, 4).setValues([[p.standard, p.noItem, p.aspek, p.huraian]]);
    return { status: "success" };
  }
  return { status: "error", message: "Baris tidak sah." };
}

function deleteStandard(ss, p) {
  var sh = ss.getSheetByName("SENARAI STANDARD");
  if (!sh) return { status: "error", message: "Helaian SENARAI STANDARD tiada." };
  var row = parseInt(p.row, 10);
  if (isSafeRow_(row,sh)) {
    sh.deleteRow(row);
    return { status: "success" };
  }
  return { status: "error", message: "Baris tidak sah." };
}

// -------------------------------------------------------------
// 3. PENGURUSAN PASUKAN PELAKSANA STANDARD / PPS (CRUD)
// -------------------------------------------------------------
function savePPS(ss, p) {
  var sh = ss.getSheetByName("SENARAI PPS");
  if (!sh) return { status: "error", message: "Helaian SENARAI PPS tiada." };
  sh.appendRow([safeCell_(p.standard), safeCell_(p.aspek), safeCell_(p.namaGuru), safeCell_(p.peranan)]);
  return { status: "success" };
}

function updatePPS(ss, p) {
  var sh = ss.getSheetByName("SENARAI PPS");
  if (!sh) return { status: "error", message: "Helaian SENARAI PPS tiada." };
  var row = parseInt(p.row, 10);
  if (isSafeRow_(row,sh)) {
    sh.getRange(row, 1, 1, 4).setValues([[p.standard, p.aspek, p.namaGuru, p.peranan]]);
    return { status: "success" };
  }
  return { status: "error", message: "Baris tidak sah." };
}

function deletePPS(ss, p) {
  var sh = ss.getSheetByName("SENARAI PPS");
  if (!sh) return { status: "error", message: "Helaian SENARAI PPS tiada." };
  var row = parseInt(p.row, 10);
  if (isSafeRow_(row,sh)) {
    sh.deleteRow(row);
    return { status: "success" };
  }
  return { status: "error", message: "Baris tidak sah." };
}

// -------------------------------------------------------------
// SENARAI SEMAK & TETAPAN
// -------------------------------------------------------------
function saveChecklist(ss, p) {
  var sh = ss.getSheetByName("SENARAI SEMAK");
  if (!sh) return {status:"error",message:"Helaian SENARAI SEMAK tiada."};
  var lastRow = sh.getLastRow();
  sh.appendRow([p.bilangan || lastRow, p.statusVal, safeCell_(p.perkara), safeCell_(p.pic), safeCell_(p.catatan)]);
  return { status: "success" };
}

function updateChecklist(ss, p) {
  var sh = ss.getSheetByName("SENARAI SEMAK");
  if (!sh) return {status:"error",message:"Helaian SENARAI SEMAK tiada."};
  var row = parseInt(p.row, 10);
  if (isSafeRow_(row,sh)) {
    sh.getRange(row, 1, 1, 5).setValues([[p.bilangan, p.statusVal, p.perkara, p.pic, p.catatan]]);
    return { status: "success" };
  }
  return { status: "error", message: "Baris tidak sah." };
}

function deleteChecklist(ss, p) {
  var sh = ss.getSheetByName("SENARAI SEMAK");
  if (!sh) return {status:"error",message:"Helaian SENARAI SEMAK tiada."};
  var row = parseInt(p.row, 10);
  if (isSafeRow_(row,sh)) {
    sh.deleteRow(row);
    return { status: "success" };
  }
  return { status: "error", message: "Baris tidak sah." };
}


function updateSettings(ss,p) {
  var sh=ss.getSheetByName("SETTING");
  if(!sh) return {status:"error",message:"Helaian SETTING tiada."};
  var year=Number(p.tahun);
  if(!Number.isInteger(year)||year<2000||year>2099) return {status:"error",message:"Tahun tidak sah."};
  var map={
    "TAHUN PENILAIAN": String(year),"KOD SEKOLAH":safeCell_(p.kodSekolah),
    "NAMA SEKOLAH":safeCell_(p.namaSekolah),
    "FOLDER DRIVE":String(p.folderId||"").trim(),
    "FOLDER DRIVE EVIDEN":String(p.folderId||"").trim()
  };
  var values=sh.getDataRange().getValues(),seen={};
  for(var i=1;i<values.length;i++){
    var key=String(values[i][0]||"").trim();
    if(Object.prototype.hasOwnProperty.call(map,key)){
      sh.getRange(i+1,3).setValue(map[key]);seen[key]=true;
    }
  }
  Object.keys(map).forEach(function(key){if(!seen[key])sh.appendRow([key,"INPUT",map[key]]);});
  return {status:"success"};
}
function safeHttps_(url) {
  url=String(url||"").trim();
  return /^https:\/\/[^\s/]+(?:\/[^\s]*)?$/i.test(url);
}
function safeCell_(value){
  var val=String(value===undefined||value===null?"":value).trim();
  return /^[=+@]/.test(val)?"'"+val:val;
}
function isSafeRow_(row,sh){
  return !!sh && Number.isInteger(row) && row>=2 && row<=sh.getLastRow();
}
function validateEviden_(ss,p){
  var required=["standard","aspek","noItem","pdca","jenis","tajuk"];
  for(var i=0;i<required.length;i++) if(!String(p[required[i]]||"").trim())
    throw new Error("Medan wajib tiada: "+required[i]);
  var stages=String(p.pdca).split(",").map(function(x){return x.trim();});
  if(stages.some(function(x){return ["PLAN","DO","CHECK","ACTION"].indexOf(x)<0;}))
    throw new Error("Nilai PDCA tidak sah.");
  var rows=getSheetObjects(ss,"SENARAI STANDARD");
  var ok=rows.some(function(r){
    return String(r.Standard)===String(p.standard) &&
      String(r.Aspek)===String(p.aspek) &&
      String(r["No Item"])===String(p.noItem);
  });
  if(!ok)throw new Error("Standard / Aspek / Item tidak wujud.");
}
function saveEviden(ss,p){
  validateEviden_(ss,p);
  var bundleYear=String(getSystemBundleYear_(ss));
  var isFile=Boolean(p.fileBase64&&p.fileName),isLink=Boolean(p.pautanLuar);
  if(isFile===isLink)throw new Error("Pilih satu sahaja: fail ATAU pautan HTTPS.");
  var fileUrl="";
  if(isLink){
    if(!safeHttps_(p.pautanLuar))throw new Error("URL mesti menggunakan HTTPS.");
    fileUrl=String(p.pautanLuar).trim();
  }
  var sheet=ss.getSheetByName("EVIDEN");
  if(!sheet)throw new Error("Helaian EVIDEN tiada.");
  if(isFile){
    if(String(p.fileBase64).length>22*1024*1024)throw new Error("Fail melebihi 15 MB.");
    var folderId=String(getSettings_(ss)["FOLDER DRIVE EVIDEN"] || getSettings_(ss)["FOLDER DRIVE"] || "").trim();
    if(!folderId || folderId==="ROOT")throw new Error("Sila konfigurasi ID folder Google Drive eviden dahulu.");
    var bytes=Utilities.base64Decode(p.fileBase64);
    if(bytes.length>15*1024*1024)throw new Error("Fail melebihi 15 MB.");
    var folder=DriveApp.getFolderById(folderId);
    var blob=Utilities.newBlob(bytes, String(p.fileMime||"application/octet-stream"), String(p.fileName).replace(/[\\/]/g,"_"));
    var file=folder.createFile(blob);
    // No ANYONE_WITH_LINK: leave Drive sharing private/inherited.
    fileUrl=file.getUrl();
  }
  var lock=LockService.getScriptLock();
  lock.waitLock(20000);
  try{
    var id="EVD-"+bundleYear+"-"+Utilities.getUuid().replace(/-/g,"").toUpperCase().slice(0,16);
    if (sheet.getRange(1,14).getValue()==="") sheet.getRange(1,14).setValue("Pemuat Email");
    var now=Utilities.formatDate(new Date(),"Asia/Kuala_Lumpur","yyyy-MM-dd HH:mm:ss");
    sheet.appendRow([id,bundleYear,safeCell_(p.pemuatNaik),p.standard,p.noItem,p.aspek,p.huraian,
      p.pdca,safeCell_(p.jenis),safeCell_(p.tajuk),safeCell_(p.catatan),fileUrl,now,p.pemuatEmail]);
    return {status:"success",id:id,url:fileUrl};
  }finally{lock.releaseLock();}
}
function getSystemBundleYear_(ss){
  return getSettings_(ss)["TAHUN PENILAIAN"] || "2026";
}
function getSettings_(ss){
  var sh=ss.getSheetByName("SETTING");if(!sh)throw new Error("SETTING tidak wujud.");
  var d=sh.getDataRange().getValues(),out={};
  for(var i=1;i<d.length;i++)out[String(d[i][0]).trim()]=d[i][2];
  return out;
}
function updateEviden(ss,p,auth){
  var sh=ss.getSheetByName("EVIDEN");if(!sh)throw new Error("EVIDEN tidak wujud.");
  var rows=sh.getDataRange().getValues(),idx=-1;
  for(var i=1;i<rows.length;i++)if(String(rows[i][0])===String(p.id)){idx=i;break;}
  if(idx<0)return {status:"error",message:"Rekod tidak ditemui."};
  var original=rows[idx],originalOwner=String(original[2]||"").trim();
  var originalEmail=String(original[13]||"").trim().toLowerCase();
  var owns=originalEmail ? originalEmail===String(auth.email).toLowerCase() : originalOwner===auth.name;
  if(!auth.isAdmin && !owns) return {status:"error",code:"FORBIDDEN",message:"Guru hanya boleh mengemas kini eviden sendiri."};
  if(String(original[1])!==String(getSystemBundleYear_(ss)))return {status:"error",message:"Rekod tahun arkib tidak boleh diubah."};
  var update={
    standard:p.standard!==undefined?p.standard:original[3],
    noItem:p.noItem!==undefined?p.noItem:original[4],
    aspek:p.aspek!==undefined?p.aspek:original[5],
    huraian:p.huraian!==undefined?p.huraian:original[6],
    pdca:p.pdca!==undefined?p.pdca:original[7],
    jenis:p.jenis!==undefined?p.jenis:original[8],
    tajuk:p.tajuk!==undefined?p.tajuk:original[9],
    catatan:p.catatan!==undefined?p.catatan:original[10]
  };
  validateEviden_(ss,update);
  var link=p.pautanLuar===undefined?original[11]:p.pautanLuar;
  if(link && !safeHttps_(link))throw new Error("URL mestilah HTTPS.");
  sh.getRange(idx+1,4,1,9).setValues([[
    update.standard,update.noItem,update.aspek,update.huraian,update.pdca,
    safeCell_(update.jenis),safeCell_(update.tajuk),safeCell_(update.catatan),link
  ]]);
  return {status:"success",id:p.id};
}
function deleteEviden(ss,p){
  var sh=ss.getSheetByName("EVIDEN");if(!sh)throw new Error("EVIDEN tidak wujud.");
  var values=sh.getDataRange().getValues();
  for(var i=1;i<values.length;i++){
    if(String(values[i][0])===String(p.id)){
      sh.deleteRow(i+1); // Preserve Drive file to prevent accidental irreversible loss.
      return {status:"success"};
    }
  }
  return {status:"error",message:"Rekod tidak ditemui."};
}
function getVerifiedUser_(email){
  email=String(email||"").trim().toLowerCase();
  var sh=SpreadsheetApp.openById(cfg_("EKEBERADAAN_DB_ID")).getSheetByName("PENGGUNA");
  if(!sh)throw new Error("Helaian PENGGUNA tidak wujud.");
  var data=sh.getDataRange().getValues();
  var h=data[0].map(function(x){return String(x).trim();});
  var ei=h.indexOf("Emel"),ni=h.indexOf("Nama"),ai=h.indexOf("Pentadbir"),si=h.indexOf("Aktif");
  if([ei,ni,ai,si].indexOf(-1)>=0)throw new Error("Lajur PENGGUNA tidak lengkap.");
  for(var i=1;i<data.length;i++){
    if(String(data[i][ei]||"").toLowerCase().trim()!==email)continue;
    var active=data[i][si]===true||String(data[i][si]).toUpperCase()==="TRUE";
    if(!active)return null;
    return {email:email,name:String(data[i][ni]||"").trim(),
      isAdmin:data[i][ai]===true||String(data[i][ai]).toUpperCase()==="TRUE"};
  }
  return null;
}
function tokenKey_(token){
  var hash=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(token||""));
  return "spes-session-"+Utilities.base64EncodeWebSafe(hash).replace(/=+$/,"").slice(0,38);
}
function verifySession_(token){
  if(!token||typeof token!=="string"||token.length>200)return null;
  var json=CacheService.getScriptCache().get(tokenKey_(token));
  if(!json)return null;
  var saved=JSON.parse(json),current=getVerifiedUser_(saved.email);
  return current&&current.name?current:null;
}
function logout_(token){
  if(token&&typeof token==="string"&&token.length<201)CacheService.getScriptCache().remove(tokenKey_(token));
}
/**
 * SSO: verify the already authenticated e-Keberadaan session on its own server.
 * The existing e-Keberadaan Bridges.gs (October 11 archive) explicitly allows
 * getBootstrapData via perf-burst and returns JSON to server-to-server clients.
 * This does NOT call loginWithPin or register a new trusted device.
 */
function authExchange_(p) {
  var eToken=String(p.ekeToken||"").trim();
  var expectedEmail=String(p.email||"").trim().toLowerCase();
  if(!eToken || eToken.length>4096 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(expectedEmail)) {
    return {status:"error",code:"BAD_REQUEST",message:"Sesi e-Keberadaan atau emel tidak sah."};
  }
  var id="spes_exchange_"+Utilities.getUuid();
  var origin=PropertiesService.getScriptProperties().getProperty("AUTH_BRIDGE_ORIGIN") || "https://kea3123-bit.github.io";
  var bridgePayload={
    id:id,channel:"perf-burst",method:"getBootstrapData",
    args:[eToken],origin:origin
  };
  var resp=UrlFetchApp.fetch(cfg_("EKEBERADAAN_WEB_APP_URL"),{
    method:"post",payload:{bridge:"1",payload:JSON.stringify(bridgePayload)},
    followRedirects:true,muteHttpExceptions:true
  });
  if(resp.getResponseCode()!==200) {
    return {status:"error",code:"BRIDGE_HTTP_ERROR",message:"Bridge e-Keberadaan tidak dapat dicapai daripada Apps Script SK@S."};
  }
  var answer;
  try { answer=JSON.parse(resp.getContentText()); }
  catch(err) {
    return {status:"error",code:"BRIDGE_INVALID_JSON",message:"Endpoint e-Keberadaan bukan respons JSON. Semak URL dan deployment."};
  }
  if(!answer || answer.type!=="EK_BRIDGE_RESULT" || answer.id!==id ||
     answer.channel!=="perf-burst" || answer.ok!==true) {
    return {status:"error",code:"EKE_SESSION_REJECTED",message:"Sesi e-Keberadaan tidak dapat disahkan. Log masuk semula atau semak kebenaran origin."};
  }
  var account=answer.value&&answer.value.user;
  if(!account || account.active!==true ||
     String(account.email||"").trim().toLowerCase()!==expectedEmail ||
     account.mustChangePassword===true) {
    return {status:"error",code:"IDENTITY_MISMATCH",message:"Identiti atau status akaun e-Keberadaan tidak sepadan."};
  }
  var user=getVerifiedUser_(expectedEmail);
  if(!user || !user.name) {
    return {status:"error",code:"FORBIDDEN",message:"Akaun tidak aktif dalam PENGGUNA."};
  }
  var token=Utilities.getUuid()+Utilities.getUuid();
  CacheService.getScriptCache().put(tokenKey_(token),JSON.stringify({email:user.email}),14400);
  return {status:"success",authToken:token,expiresIn:14400,
    user:{email:user.email,name:user.name,role:user.isAdmin?"ADMIN":"USER"}};
}
