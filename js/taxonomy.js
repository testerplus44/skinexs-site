/**
 * Справочники «Герой» и «Тип предмета» для админки и фильтров каталога.
 * Хранение: localStorage skinex_taxonomy { heroes: string[], itemTypes: string[] }
 */
(function (w) {
  var KEY = "skinex_taxonomy";

  var DEFAULT_ITEM_TYPES = [
    "Arcana",
    "Immortal",
    "Mythical",
    "Сет",
    "Treasure",
    "Bundle",
    "DOTA Plus",
    "Другое",
  ];

  var DEFAULT_HEROES = [
    "Pudge",
    "Phantom Assassin",
    "Terrorblade",
    "Rubick",
    "Slardar",
    "Invoker",
    "Mirana",
    "Набор сокровищ",
    "The International",
    "TI редкость",
  ];

  function defaultItemTypeFromRarity(rarity) {
    var m = { arcana: "Arcana", immortal: "Immortal", mythical: "Mythical" };
    return m[rarity] || "Mythical";
  }

  function uniqSort(arr) {
    var seen = {};
    var out = [];
    (arr || []).forEach(function (s) {
      var t = String(s == null ? "" : s).trim();
      if (!t || seen[t]) return;
      seen[t] = true;
      out.push(t);
    });
    out.sort(function (a, b) {
      return a.localeCompare(b, "ru");
    });
    return out;
  }

  function readSaved() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return { heroes: [], itemTypes: [] };
      var o = JSON.parse(raw);
      if (!o || typeof o !== "object") return { heroes: [], itemTypes: [] };
      return {
        heroes: Array.isArray(o.heroes) ? o.heroes : [],
        itemTypes: Array.isArray(o.itemTypes) ? o.itemTypes : [],
      };
    } catch (e) {
      return { heroes: [], itemTypes: [] };
    }
  }

  function getTaxonomy() {
    var saved = readSaved();
    var heroes = [].concat(saved.heroes || [], DEFAULT_HEROES);
    var itemTypes = [].concat(saved.itemTypes || [], DEFAULT_ITEM_TYPES);

    if (w.SkinexCatalog) {
      w.SkinexCatalog.getCatalog().forEach(function (it) {
        if (it && it.hero) heroes.push(it.hero);
        if (it) {
          var itt = it.itemType || defaultItemTypeFromRarity(it.rarity);
          if (itt) itemTypes.push(itt);
        }
      });
    }

    return {
      heroes: uniqSort(heroes),
      itemTypes: uniqSort(itemTypes),
    };
  }

  function saveTaxonomy(data) {
    var heroes = uniqSort(data && data.heroes ? data.heroes : []);
    var itemTypes = uniqSort(data && data.itemTypes ? data.itemTypes : []);
    if (!heroes.length) throw new Error("Добавьте хотя бы одного героя в справочник.");
    if (!itemTypes.length) throw new Error("Добавьте хотя бы один тип предмета в справочник.");
    localStorage.setItem(
      KEY,
      JSON.stringify({
        heroes: heroes,
        itemTypes: itemTypes,
      }),
    );
  }

  w.SkinexTaxonomy = {
    STORAGE_KEY: KEY,
    getTaxonomy: getTaxonomy,
    saveTaxonomy: saveTaxonomy,
    defaultItemTypeFromRarity: defaultItemTypeFromRarity,
  };
})(window);
