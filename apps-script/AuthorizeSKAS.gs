/**
 * SK@S one-time OAuth consent helper.
 *
 * Run authorizeSKAS() DIRECTLY in the SPES-SK@S Apps Script editor using
 * the Google account that deploys the SK@S web app (Execute as me).
 *
 * DO NOT paste into or deploy this file in the e-Keberadaan project.
 * Does not read school records, user tokens, PINs, or touch Google Sheets.
 */
function authorizeSKAS() {
  var scope = "https://www.googleapis.com/auth/script.external_request";
  ScriptApp.requireScopes(ScriptApp.AuthMode.FULL, [scope]);

  // A credential-free, side-effect-free external HTTP request to confirm
  // that UrlFetchApp can now execute under the editor account.
  var response = UrlFetchApp.fetch("https://www.google.com/generate_204", {
    method: "get",
    muteHttpExceptions: true,
    followRedirects: false
  });
  var status = response.getResponseCode();
  Logger.log("SKAS_URLFETCH_AUTHORIZED: UrlFetchApp.fetch executed, HTTP " + status);
  return {status:"success", urlFetchAuthorized:true, httpStatus:status};
}
