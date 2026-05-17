/**
 * Каталог: правки админа в localStorage, иначе — данные из data.js (SKINEX_CATALOG).
 */
(function (w) {
  var KEY = "skinex_catalog_override";

  function clone(arr) {
    try {
      return JSON.parse(JSON.stringify(arr || []));
    } catch (e) {
      return [];
    }
  }

  function defaultSource() {
    return w.SKINEX_CATALOG && Array.isArray(w.SKINEX_CATALOG) ? w.SKINEX_CATALOG : [];
  }

  function defaultItemTypeFromRarity(rarity) {
    var m = { arcana: "Arcana", immortal: "Immortal", mythical: "Mythical" };
    return m[rarity] || "Mythical";
  }

  function normalizeRarityKey(r) {
    var s = String(r || "")
      .trim()
      .toLowerCase();
    if (s === "arcana" || s.indexOf("arcana") >= 0) return "arcana";
    if (s === "immortal" || s.indexOf("immortal") >= 0) return "immortal";
    if (s === "mythical" || s.indexOf("mythical") >= 0) return "mythical";
    return s || "mythical";
  }

  function enrichItem(it) {
    if (!it || typeof it !== "object") return it;
    var copy = Object.assign({}, it);
    copy.rarity = normalizeRarityKey(copy.rarity);
    copy.itemType = copy.itemType || defaultItemTypeFromRarity(copy.rarity);
    copy.hero = copy.hero != null ? String(copy.hero) : "";
    copy.collectionId = copy.collectionId != null ? String(copy.collectionId) : "general";
    copy.category = copy.category != null ? String(copy.category) : "tradeable";
    var iconLarge = String(copy.icon_url_large || copy.iconUrlLarge || "").trim();
    var steamHash = String(copy.steam_market_hash_name || copy.steamMarketHashName || "").trim();
    copy.icon_url_large = iconLarge;
    copy.iconUrlLarge = iconLarge;
    copy.steam_market_hash_name = steamHash || copy.name || "";
    copy.steamMarketHashName = copy.steam_market_hash_name;
    /** false — трейдеры не могут выставлять лоты; по умолчанию true */
    copy.traderListingsAllowed = copy.traderListingsAllowed !== false;
    return copy;
  }

  function getCatalog() {
    var raw = localStorage.getItem(KEY);
    var arr;
    if (!raw) arr = clone(defaultSource());
    else {
      try {
        arr = JSON.parse(raw);
        if (!Array.isArray(arr)) arr = clone(defaultSource());
      } catch (e) {
        arr = clone(defaultSource());
      }
    }
    return arr.map(enrichItem);
  }

  function saveCatalog(arr) {
    if (!Array.isArray(arr)) throw new Error("Каталог должен быть массивом.");
    localStorage.setItem(KEY, JSON.stringify(arr));
  }

  function resetCatalog() {
    localStorage.removeItem(KEY);
  }

  w.SkinexCatalog = {
    STORAGE_KEY: KEY,
    getCatalog: getCatalog,
    saveCatalog: saveCatalog,
    resetCatalog: resetCatalog,
  };
})(window);
