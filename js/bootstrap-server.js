/**
 * Синхронно подтягивает каталог из GET /api/v1/catalog в localStorage (skinex_catalog_override), если включён server API.
 * Подключайте сразу после server-config.js и до catalog-store.js.
 */
(function (w) {
  if (!w.SKINEX_USE_SERVER_API) return;
  try {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", (w.SKINEX_API_BASE || "") + "/api/v1/catalog", false);
    xhr.withCredentials = true;
    xhr.send(null);
    if (xhr.status === 200 && xhr.responseText) {
      JSON.parse(xhr.responseText);
      w.localStorage.setItem("skinex_catalog_override", xhr.responseText);
    }
  } catch (e) {
    console.warn("[Skinexs] bootstrap-server catalog:", e.message);
  }
})(window);
