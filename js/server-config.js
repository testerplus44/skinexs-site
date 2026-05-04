/**
 * Режим серверного API (SQLite, сессии cookie, /api/v1/*, пополнение через ЮKassa).
 * По умолчанию включён: открывайте сайт через сервер (папка server, npm start).
 * Чтобы работать без Node (чистая статика), задайте в admin-config.js: window.SKINEX_USE_SERVER_API = false;
 */
(function (w) {
  w.SKINEX_API_BASE = w.SKINEX_API_BASE || "";
  if (typeof w.SKINEX_USE_SERVER_API === "undefined") {
    w.SKINEX_USE_SERVER_API = true;
  } else {
    w.SKINEX_USE_SERVER_API = !!w.SKINEX_USE_SERVER_API;
  }
})(window);
