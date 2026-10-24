/**
 * SPES-SK@S: read-only diagnostic for the linked e-Keberadaan deployment.
 * Run diagnoseSKASConnection() in the SPES-SK@S Apps Script editor.
 * Never copy this into e-Keberadaan itself.
 * This probe DOES NOT call loginWithPin, create or revoke trusted devices,
 * write to Sheets, change triggers, or expose session tokens.
 */
function diagnoseSKASConnection() {
  var results = {
    ok: true,
    checkedAt: new Date().toISOString(),
    target: "SPES-SK@S integration",
    checks: []
  };
  function add(name, ok, detail) {
    results.checks.push({name: name, ok: !!ok, detail: String(detail || "")});
    if (!ok) results.ok = false;
  }
  var props = PropertiesService.getScriptProperties();
  var required = ["SPES_DB_ID", "EKEBERADAAN_DB_ID", "EKEBERADAAN_WEB_APP_URL"];
  var missing = [];
  required.forEach(function(key) {
    if (!String(props.getProperty(key) || "").trim()) missing.push(key);
  });
  add("SCRIPT_PROPERTIES", !missing.length,
    missing.length ? "Missing: " + missing.join(", ") : "Required properties are present (values hidden).");

  var origin = String(props.getProperty("AUTH_BRIDGE_ORIGIN") || "https://kea3123-bit.github.io").replace(/\/$/, "");
  add("BRIDGE_ORIGIN", /^https:\/\/[A-Za-z0-9.-]+(?::\d+)?$/.test(origin),
    "Configured origin: " + origin + ". Must be whitelisted by e-Keberadaan.");

  if (props.getProperty("SPES_DB_ID")) {
    try {
      var main = SpreadsheetApp.openById(props.getProperty("SPES_DB_ID"));
      var mainSheets = [
        "SETTING", "SENARAI STANDARD", "SENARAI PPS",
        "SENARAI SEMAK", "JAWATANKUASA SK@S", "EVIDEN"
      ];
      var missingMain = mainSheets.filter(function(name) { return !main.getSheetByName(name); });
      add("SPES_SHEETS", !missingMain.length, missingMain.length ?
        "Missing sheets: " + missingMain.join(", ") : "All expected SPES-SK@S sheets exist.");
    } catch(err) {
      add("SPES_SHEETS", false, "Cannot open the SPES Google Sheet with this script's permissions.");
    }
  }
  if (props.getProperty("EKEBERADAAN_DB_ID")) {
    try {
      var eke = SpreadsheetApp.openById(props.getProperty("EKEBERADAAN_DB_ID"));
      var users = eke.getSheetByName("PENGGUNA");
      if (!users) {
        add("EKE_USERS", false, "PENGGUNA sheet is missing.");
      } else {
        var headers = users.getRange(1, 1, 1, users.getLastColumn()).getValues()[0].map(function(x) {
          return String(x || "").trim();
        });
        var requiredHeaders = ["Aktif", "Nama", "Emel", "Pentadbir"];
        var missingColumns = requiredHeaders.filter(function(x) { return headers.indexOf(x) === -1; });
        add("EKE_USERS", !missingColumns.length, missingColumns.length ?
          "Missing headers: " + missingColumns.join(", ") : "PENGGUNA has all required login-role headers.");
      }
    } catch(err) {
      add("EKE_USERS", false, "Cannot read e-Keberadaan PENGGUNA with this script's permissions.");
    }
  }
  if (!missing.length && results.checks.filter(function(x){return !x.ok;}).length === 0) {
    try {
      // Latest uploaded Bridges.gs accepts __ping__ on perf-burst directly.
      // This is a NO-AUTH and NO-DEVICE-REGISTRATION check.
      var requestId = "skas_probe_" + Utilities.getUuid();
      var payload = {
        id: requestId, channel: "perf-burst", method: "__ping__",
        args: [], origin: origin
      };
      var response = UrlFetchApp.fetch(props.getProperty("EKEBERADAAN_WEB_APP_URL"), {
        method: "post",
        payload: {bridge:"1",payload:JSON.stringify(payload)},
        muteHttpExceptions: true,
        followRedirects: true
      });
      var code = response.getResponseCode();
      if (code !== 200) {
        add("EKE_BRIDGE_PING", false, "HTTP " + code + "; check deployment access / URL.");
      } else {
        var raw = response.getContentText();
        var body;
        try { body = JSON.parse(raw); }
        catch(err) { body = null; }
        if (!body) {
          add("EKE_BRIDGE_PING", false, "Expected JSON, received another response. Check deployment access.");
        } else if (
          body.type === "EK_BRIDGE_RESULT" && body.id === requestId &&
          body.channel === "perf-burst" && body.ok === true &&
          body.value && body.value.ready === true
        ) {
          add("EKE_BRIDGE_PING", true, "e-Keberadaan bridge is reachable with the configured origin.");
        } else {
          add("EKE_BRIDGE_PING", false,
            body.ok === false ? "Bridge rejected this request; check origin allowlist and deployment." :
              "Bridge returned an unexpected payload shape.");
        }
      }
    } catch(err) {
      var msg = String(err && err.message || err || "");
      var isScopeError = /script\\.external_request|permission to call UrlFetchApp|Authorization is required/i.test(msg);
      add("EKE_BRIDGE_PING", false, isScopeError ?
        "SKAS_OAUTH_REQUIRED: UrlFetchApp permission missing. Run authorizeSKAS() in SKAS Apps Script editor using the deployment account, approve OAuth, then deploy a new version." :
        "BRIDGE_CONNECTION_ERROR: outbound request failed. Check deployment URL / allowed origins; see Apps Script Executions for details.");
    }
  } else {
    add("EKE_BRIDGE_PING", false, "Not run: fix the property, origin, or sheet checks above first.");
  }
  Logger.log(JSON.stringify(results));
  return results;
}
