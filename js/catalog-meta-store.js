/**
 * Сохранение списков коллекций и категорий сайдбара в localStorage (как каталог у админа).
 */
(function (w) {
  var KEY = "skinex_catalog_sidebar_meta";

  function clone(x) {
    try {
      return JSON.parse(JSON.stringify(x));
    } catch (e) {
      return [];
    }
  }

  function defaults() {
    var c = w.SKINEX_COLLECTIONS_DEFAULT || w.SKINEX_COLLECTIONS || [];
    var k = w.SKINEX_CATEGORIES_DEFAULT || w.SKINEX_CATEGORIES || [];
    return { collections: clone(c), categories: clone(k) };
  }

  function normalizeId(s) {
    var t = String(s || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    return t;
  }

  /** Макс. длина строки картинки (data URL в localStorage). ~400 KB. */
  var MAX_IMAGE_CHARS = 420000;

  function normalizeImage(s) {
    var t = String(s || "").trim();
    if (!t) return "";
    if (t.length > MAX_IMAGE_CHARS) return "";
    if (/^data:image\/(png|jpeg|jpg|gif|webp|avif);base64,/i.test(t)) return t;
    if (/^https:\/\//i.test(t)) return t;
    if (/^http:\/\//i.test(t)) return t;
    return "";
  }

  function normalizeRow(row) {
    if (!row || typeof row !== "object") return null;
    var id = normalizeId(row.id);
    var name = String(row.name || "").trim();
    if (!id || !name) return null;
    var image = normalizeImage(row.image);
    var out = { id: id, name: name };
    if (image) out.image = image;
    return out;
  }

  /** Строка с опциональным parentId (родитель только верхнего уровня). */
  function normalizeRowWithParent(row) {
    var base = normalizeRow(row);
    if (!base) return null;
    var parentId = normalizeId(row.parentId);
    if (!parentId || parentId === base.id || parentId === "all") return base;
    base.parentId = parentId;
    return base;
  }

  function normalizeCategoryList(arr, needAll) {
    if (!Array.isArray(arr)) return null;
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      var n = normalizeRowWithParent(arr[i]);
      if (n) out.push(n);
    }
    if (needAll) {
      var hasAll = out.some(function (x) {
        return x.id === "all";
      });
      if (!hasAll) out.unshift({ id: "all", name: "Все" });
    }
    return out.length ? out : null;
  }

  function normalizeCollectionList(arr, needAll) {
    if (!Array.isArray(arr)) return null;
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      var n = normalizeRowWithParent(arr[i]);
      if (n) out.push(n);
    }
    if (needAll) {
      var hasAll = out.some(function (x) {
        return x.id === "all";
      });
      if (!hasAll) out.unshift({ id: "all", name: "Все" });
    }
    return out.length ? out : null;
  }

  function validateOneLevelParentTree(rows, label) {
    var byId = {};
    for (var i = 0; i < rows.length; i++) {
      if (rows[i] && rows[i].id) byId[rows[i].id] = rows[i];
    }
    for (var j = 0; j < rows.length; j++) {
      var r = rows[j];
      if (!r || !r.parentId) continue;
      var p = byId[r.parentId];
      if (!p)
        throw new Error(label + " «" + r.id + "»: родитель с ID «" + r.parentId + "» не найден.");
      if (p.parentId)
        throw new Error(
          label +
            " «" +
            r.id +
            "»: вложенность только один уровень — у «" +
            r.parentId +
            "» уже указан родитель.",
        );
    }
  }

  function validateCategoryTree(rows) {
    validateOneLevelParentTree(rows, "Категория");
  }

  function validateCollectionTree(rows) {
    validateOneLevelParentTree(rows, "Коллекция");
  }

  function uniqueIds(list) {
    var seen = {};
    for (var i = 0; i < list.length; i++) {
      var id = list[i].id;
      if (seen[id]) return false;
      seen[id] = true;
    }
    return true;
  }

  function applyFromStorage() {
    var raw = localStorage.getItem(KEY);
    if (!raw) return;
    try {
      var parsed = JSON.parse(raw);
      var c = normalizeCollectionList(parsed.collections, true);
      var k = normalizeCategoryList(parsed.categories, true);
      if (c && uniqueIds(c)) {
        try {
          validateCollectionTree(c);
          w.SKINEX_COLLECTIONS = c;
        } catch (e2) {
          /* неверная иерархия коллекций */
        }
      }
      if (k && uniqueIds(k)) {
        try {
          validateCategoryTree(k);
          w.SKINEX_CATEGORIES = k;
        } catch (e2) {
          /* неверная иерархия — не подменяем категории из битого JSON */
        }
      }
    } catch (e) {}
  }

  applyFromStorage();

  /** Повторно прочитать localStorage (например после сохранения в другой вкладке). */
  function reloadFromStorage() {
    var raw = localStorage.getItem(KEY);
    if (!raw) {
      var d = defaults();
      w.SKINEX_COLLECTIONS = d.collections;
      w.SKINEX_CATEGORIES = d.categories;
      return;
    }
    try {
      var parsed = JSON.parse(raw);
      var c = normalizeCollectionList(parsed.collections, true);
      var k = normalizeCategoryList(parsed.categories, true);
      if (c && uniqueIds(c)) {
        try {
          validateCollectionTree(c);
          w.SKINEX_COLLECTIONS = c;
        } catch (e2) {
          /* см. applyFromStorage */
        }
      }
      if (k && uniqueIds(k)) {
        try {
          validateCategoryTree(k);
          w.SKINEX_CATEGORIES = k;
        } catch (e2) {
          /* см. applyFromStorage */
        }
      }
    } catch (e) {}
  }

  w.SkinexCatalogMeta = {
    STORAGE_KEY: KEY,
    reloadFromStorage: reloadFromStorage,
    getCollections: function () {
      return clone(w.SKINEX_COLLECTIONS || []);
    },
    getCategories: function () {
      return clone(w.SKINEX_CATEGORIES || []);
    },
    save: function (data) {
      var c = normalizeCollectionList(data.collections, true);
      var k = normalizeCategoryList(data.categories, true);
      if (!c || !k) throw new Error("Заполните ID и название у каждой строки.");
      if (!uniqueIds(c)) throw new Error("В коллекциях дублируется ID.");
      if (!uniqueIds(k)) throw new Error("В категориях дублируется ID.");
      validateCollectionTree(c);
      validateCategoryTree(k);
      try {
        localStorage.setItem(KEY, JSON.stringify({ collections: c, categories: k }));
      } catch (e) {
        throw new Error(
          "Не хватило места в localStorage (картинки слишком тяжёлые). Уменьшите файлы или используйте ссылки https://",
        );
      }
      w.SKINEX_COLLECTIONS = c;
      w.SKINEX_CATEGORIES = k;
    },
    /** Для фильтра каталога: выбранный id + все прямые подкатегории. null если «все». */
    categoryFilterMatchIds: function (selectedId) {
      if (!selectedId || selectedId === "all") return null;
      var rows = w.SKINEX_CATEGORIES || [];
      var map = {};
      var sid = String(selectedId);
      map[sid] = true;
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        if (r && r.parentId && String(r.parentId) === sid) map[r.id] = true;
      }
      return map;
    },
    /** Для фильтра по коллекции: выбранный id + прямые дочерние коллекции. */
    collectionFilterMatchIds: function (selectedId) {
      if (!selectedId || selectedId === "all") return null;
      var rows = w.SKINEX_COLLECTIONS || [];
      var map = {};
      var sid = String(selectedId);
      map[sid] = true;
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        if (r && r.parentId && String(r.parentId) === sid) map[r.id] = true;
      }
      return map;
    },
    reset: function () {
      localStorage.removeItem(KEY);
      var d = defaults();
      w.SKINEX_COLLECTIONS = d.collections;
      w.SKINEX_CATEGORIES = d.categories;
    },
    getDefaults: function () {
      return defaults();
    },
  };
})(window);
