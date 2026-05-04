/**
 * Steam OpenID 2.0 — редирект на steamcommunity.com/openid/login.
 * Подпись проверяется на сервере: POST /api/auth/steam/verify (см. server/index.js), затем completeSteamLoginAsync в auth-store.js.
 */
(function (w) {
  var STEAM_LOGIN = "https://steamcommunity.com/openid/login";

  function absoluteUrl(relative) {
    try {
      return new URL(relative, w.location.href).href;
    } catch (e) {
      return relative;
    }
  }

  /** Realm: origin; для file:// — localhost (Steam требует http/https). */
  function getRealm() {
    if (w.location.protocol === "file:") return "http://localhost";
    var o = w.location.origin;
    if (!o || o === "null") return "http://localhost";
    return o;
  }

  function getCallbackUrl() {
    return absoluteUrl("steam-callback.html");
  }

  /**
   * Полная ссылка входа Steam.
   * @param {string} [returnToOverride] — если не задано, steam-callback.html
   */
  function buildSteamLoginUrl(returnToOverride) {
    var returnTo = returnToOverride || getCallbackUrl();
    var p = new URLSearchParams();
    p.set("openid.ns", "http://specs.openid.net/auth/2.0");
    p.set("openid.mode", "checkid_setup");
    p.set("openid.return_to", returnTo);
    p.set("openid.realm", getRealm());
    p.set("openid.identity", "http://specs.openid.net/auth/2.0/identifier_select");
    p.set("openid.claimed_id", "http://specs.openid.net/auth/2.0/identifier_select");
    return STEAM_LOGIN + "?" + p.toString();
  }

  /** Из openid.identity / openid.claimed_id вида …/openid/id/76561198… */
  function extractSteamIdFromOpenId(claimedOrIdentity) {
    if (!claimedOrIdentity) return null;
    var m = String(claimedOrIdentity).match(/\/openid\/id\/(\d{5,20})$/);
    return m ? m[1] : null;
  }

  /** Разбор query после редиректа Steam. */
  function parseSteamReturn(search) {
    var q = typeof search === "string" ? search.replace(/^\?/, "") : w.location.search.replace(/^\?/, "");
    var params = new URLSearchParams(q);
    var mode = params.get("openid.mode");
    if (mode !== "id_res") {
      return { ok: false, message: mode ? "Неожиданный режим OpenID." : "Нет ответа Steam (откройте сайт по http/https, не file://)." };
    }
    var idStr = params.get("openid.claimed_id") || params.get("openid.identity");
    var steamId = extractSteamIdFromOpenId(idStr);
    if (!steamId) {
      return { ok: false, message: "Не удалось определить Steam ID." };
    }
    return { ok: true, steamId: steamId, params: params };
  }

  w.SkinexSteamOpenID = {
    buildSteamLoginUrl: buildSteamLoginUrl,
    getRealm: getRealm,
    getCallbackUrl: getCallbackUrl,
    extractSteamIdFromOpenId: extractSteamIdFromOpenId,
    parseSteamReturn: parseSteamReturn,
  };
})(window);
