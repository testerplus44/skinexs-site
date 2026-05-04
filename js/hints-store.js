/**
 * Пункты FAQ на странице «Поддержка» (аккордеон): заголовок + текст.
 * Хранение в localStorage, правка — админка, вкладка «Подсказки».
 */
(function (w) {
  var KEY = "skinex_hints";

  function safeParse(json, fallback) {
    try {
      return JSON.parse(json);
    } catch (e) {
      return fallback;
    }
  }

  function uid() {
    if (w.crypto && typeof w.crypto.randomUUID === "function") return w.crypto.randomUUID();
    return String(Date.now()) + "-" + String(Math.random()).slice(2, 10);
  }

  function normalizeHint(h) {
    if (!h || typeof h !== "object") return null;
    var id = typeof h.id === "string" && h.id.trim() ? h.id.trim() : uid();
    return {
      id: id,
      title: String(h.title || "").trim() || "Вопрос",
      body: String(h.body || "").trim(),
      enabled: h.enabled !== false,
      sort: typeof h.sort === "number" && isFinite(h.sort) ? Math.floor(h.sort) : 0,
    };
  }

  /** Первый запуск: три типовых пункта (как раньше на странице «Как это работает»). */
  function defaultHintsIfFresh() {
    return [
      {
        id: uid(),
        title: "Выбор",
        body:
          "Добавьте сеты в корзину или напишите в поддержку, если нужен кастомный подбор. Цены и наличие уточняются до оплаты.",
        enabled: true,
        sort: 0,
      },
      {
        id: uid(),
        title: "Согласование",
        body:
          "Уточняем наличие, цену и способ оплаты — фиксируем условия в переписке. После согласования можно оформить заказ.",
        enabled: true,
        sort: 1,
      },
      {
        id: uid(),
        title: "Передача",
        body:
          "Steam trade, подарок из магазина Dota 2 или другой оговорённый вариант. Статус сделки виден в личном кабинете.",
        enabled: true,
        sort: 2,
      },
    ];
  }

  function getHints() {
    var raw = localStorage.getItem(KEY);
    if (raw == null || raw === "") {
      var seeded = defaultHintsIfFresh();
      localStorage.setItem(KEY, JSON.stringify(seeded));
      return seeded.map(normalizeHint).filter(Boolean);
    }
    var arr = safeParse(raw, []);
    if (!Array.isArray(arr)) return [];
    return arr.map(normalizeHint).filter(Boolean);
  }

  function saveHints(list) {
    var clean = list.map(normalizeHint).filter(Boolean);
    localStorage.setItem(KEY, JSON.stringify(clean));
    return clean;
  }

  function getPublicHints() {
    return getHints()
      .filter(function (h) {
        return h.enabled;
      })
      .sort(function (a, b) {
        if (a.sort !== b.sort) return a.sort - b.sort;
        return (a.title || "").localeCompare(b.title || "", "ru");
      });
  }

  w.SkinexHintsStore = {
    KEY: KEY,
    getHints: getHints,
    getPublicHints: getPublicHints,
    saveHints: saveHints,
    addHint: function (partial) {
      var list = getHints();
      list.push(normalizeHint(Object.assign({ id: uid() }, partial)));
      return saveHints(list);
    },
    updateHint: function (id, patch) {
      var list = getHints();
      var i = list.findIndex(function (x) {
        return String(x.id) === String(id);
      });
      if (i < 0) return null;
      list[i] = normalizeHint(Object.assign({}, list[i], patch, { id: list[i].id }));
      saveHints(list);
      return list[i];
    },
    removeHint: function (id) {
      saveHints(
        getHints().filter(function (x) {
          return String(x.id) !== String(id);
        })
      );
    },
  };
})(window);
